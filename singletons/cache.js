module.exports = (function () {
	"use strict";

	const Redis = require("ioredis");

	const GROUP_DELIMITER = String.fromCharCode(7);
	const ITEM_DELIMITER =  String.fromCharCode(8);

	return class Cache extends require("./template.js") {
		/** @type {Redis} */
		#server = null;
		#active = false;
		#version = null;

		static singleton () {
			if (!Cache.module) {
				Cache.module = new Cache();
			}
			return Cache.module;
		}

		constructor () {
			super();

			if (sb.Config.has("REDIS_CONFIGURATION", false)) {
				this.connect(sb.Config.get("REDIS_CONFIGURATION"));
			}
			else {
				console.warn("No Redis configuration detected - skipped sb.Cache initialization");
			}
		}

		connect (configuration) {
			if (this.#active) {
				throw new sb.Error({
					message: "Redis is already connected"
				});
			}
			else if (this.#server) {
				this.#server.connect();
				this.#active = true;
			}
			else if (!configuration) {
				throw new sb.Error({
					message: "Connection configuration not provided"
				});
			}
			else if (typeof configuration !== "object" && typeof configuration !== "string") {
				throw new sb.Error({
					message: "When provided, Redis connection configuration must be an object or string"
				});
			}

			this.#server = new Redis(configuration);
			this.#active = true;

			this.#server.info().then(data => {
				const versionData = data.split("\n").find(i => i.startsWith("redis_version"));
				if (versionData) {
					this.#version = versionData.split(":")[1].split(".").map(Number);
				}
				else {
					console.warn("Could not find Redis version!", { info: data });
				}
			});
		}

		disconnect () {
			if (!this.#active) {
				throw new sb.Error({
					message: "Redis is already disconnected"
				});
			}
			else if (!this.#server) {
				throw new sb.Error({
					message: "Redis instance has not been created yet"
				});
			}

			this.#server.disconnect();
			this.#active = false
		}

		async set (data = {}) {
			if (!this.#active) {
				throw new sb.Error({
					message: "Redis server is not connected"
				});
			}
			else if (typeof data.value === "undefined") {
				throw new sb.Error({
					message: "Provided value must not be undefined"
				});
			}

			const args = [
				Cache.resolveKey(data.key),
				JSON.stringify(data.value)
			];

			if (typeof data.specificKey === "string") {
				args[0] += "-" + data.specificKey;
			}

			if (data.expiry && data.expiresAt) {
				throw new sb.Error({
					message: "Cannot combine expiry and expireAt parameters"
				});
			}
			else if ((data.expiry || data.expiresAt) && data.keepTTL) {
				throw new sb.Error({
					message: "Cannot combine expiry/expiresAt params with keepTTL"
				});
			}

			if (data.expiry) {
				if (!sb.Utils.isValidInteger(data.expiry)) {
					throw new sb.Error({
						message: "If provided, expiry must be a valid positive integer",
						args: { data }
					});
				}

				args.push("PX", data.expiry);
			}

			if (data.expiresAt) {
				data.expiresAt = data.expiresAt.valueOf();

				if (!sb.Utils.isValidInteger(data.expiresAt)) {
					throw new sb.Error({
						message: "If provided, expiresAt must be a valid positive integer",
						args: { data }
					});
				}

				const now = sb.Date.now();
				if (now > data.expiresAt) {
					throw new sb.Error({
						message: "expiresAt must not be in the past",
						args: { now, data }
					});
				}

				args.push("PX", (data.expiresAt - now));
			}
			
			if (data.keepTTL) {
				if (!this.#version || this.#version[0] < 6) {
					const existingTTL = await this.#server.pttl(data[0]);
					if (existingTTL >= 0) {
						args.push("PX", existingTTL);
					}
				}
				else {
					args.push("KEEPTTL");
				}
			}

			// Possible extension for NX/XX can go here

			return await this.#server.set(...args);
		}

		async get (keyIdentifier) {
			if (!this.#active) {
				throw new sb.Error({
					message: "Redis server is not connected"
				});
			}

			const key = Cache.resolveKey(keyIdentifier);
			return JSON.parse(await this.#server.get(key));
		}

		async delete (keyIdentifier) {
			if (!this.#active) {
				throw new sb.Error({
					message: "Redis server is not connected"
				});
			}

			const key = Cache.resolveKey(keyIdentifier);

			return await this.#server.del(key);
		}

		async setByPrefix (prefix, value, options = {}) {
			if (typeof prefix === "undefined") {
				throw new sb.Error({
					message: "No key providded"
				});
			}
			else if (typeof prefix?.getCacheKey === "function") {
				return await this.set({
					key: prefix.getCacheKey(), // prefix is the object with cache-key method
					value,
					...options
				});
			}

			if (typeof value === "undefined") {
				throw new sb.Error({
					message: "No value providded"
				});
			}

			const optionsMap = new Map(Object.entries(options));
			const keys = optionsMap.get("keys") ?? {};
			optionsMap.delete("keys");

			const rest = Object.fromEntries(optionsMap);
			return await this.set({
				key: Cache.resolvePrefix(prefix, keys),
				value,
				...rest
			});
		}

		async getByPrefix (prefix, options = {}) {
			const extraKeys = options.keys ?? {};
			const key = Cache.resolvePrefix(prefix, extraKeys);

			return await this.get(key);
		}

		async getKeysByPrefix (prefix, options = {}) {
			const prefixKey = [prefix];
			const extraKeys = options.keys ?? {};

			for (const [key, value] of Object.entries(extraKeys)) {
				if (value === null || value === undefined) {
					prefixKey.push(key, ITEM_DELIMITER, "*");
				}
				else {
					prefixKey.push(key, ITEM_DELIMITER, String(value));
				}
			}

			const searchKey = prefixKey.join(GROUP_DELIMITER);
			const scan = await this.#server.scan("0", "MATCH", searchKey, "COUNT", options.count ?? "5000");
			const results = [...scan[1]];

			let i = scan[0];
			while (i !== "0") {
				const result = await this.#server.scan(i, "MATCH", searchKey, "COUNT", options.count ?? "5000");

				i = result[0];
				results.push(...result[1]);
			}

			return results;
		}

		async getKeyValuesByPrefix (prefix, options) {
			const keys = await this.getKeysByPrefix(prefix, options);
			const promises = keys.map(async i => await this.get(i));

			return await Promise.all(promises);
		}

		/**
		 * Cleans up and destroys the singleton caching instance
		 */
		destroy () {
			if (this.#server) {
				if (this.#active) {
					this.#server.disconnect();
					this.#active = false;
				}

				this.#server.end();
			}

			this.#server = null;
		}

		/**
		 * @param {*} value
		 * @returns {string|*}
		 */
		static resolveKey (value) {
			if (value === null || typeof value === "undefined") {
				throw new sb.Error({
					message: "Cannot use null or undefined as key"
				});
			}

			if (typeof value?.getCacheKey === "function") {
				return value.getCacheKey();
			}
			else if (typeof value !== "object") {
				return String(value);
			}
			else {
				throw new sb.Error({
					message: "Cannot stringify a non-primitive value",
					args: {
						value
					}
				});
			}
		}

		static resolvePrefix (mainKey, keys) {
			keys = Object.entries(keys);
			if (keys.length === 0) {
				return mainKey;
			}

			const rest = [];
			for (const [key, value] of keys) {
				if (key.includes(GROUP_DELIMITER) || key.includes(ITEM_DELIMITER)) {
					throw new sb.Error({
						message: "Cache prefix keys cannot contain reserved characters",
						args: { key, value }
					});
				}
				else if (value.includes(GROUP_DELIMITER) || value.includes(ITEM_DELIMITER)) {
					throw new sb.Error({
						message: "Cache prefix vaolues cannot contain reserved characters",
						args: { key, value }
					});
				}

				rest.push(`${key}${ITEM_DELIMITER}${value}`);
			}

			return [mainKey, ...rest.sort()].join(GROUP_DELIMITER);
		}

		get active () { return this.#active; }

		get server () { return this.#server; }

		get modulePath () { return "cache"; }
	};
})();