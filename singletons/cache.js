module.exports = (function () {
	"use strict";

	const Redis = require("ioredis");

	const GROUP_DELIMITER = "\b";
	const ITEM_DELIMITER = "\u{E0000}";

	return class Cache extends require("./template.js") {
		/** @type {Redis} */
		#server = null;
		#active = false;

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

			if (data.expiry) {
				if (!sb.Utils.isValidInteger(data.expiry)) {
					throw new sb.Error({
						message: "If provided, data.expiry must be a valid positive integer"
					});
				}

				args.push("PX", data.expiry);
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

		async getKeysByPrefix (prefix, options) {
			const extraKeys = options.keys ?? {};
			for (const [key, value] of Object.entries(extraKeys)) {
				if (value === null || value === undefined) {
					extraKeys[key] = "";
				}
			}

			const prefixKey = Cache.resolvePrefix(prefix, extraKeys);
			const searchKey = prefixKey.split(GROUP_DELIMITER).join("*");

			const scan = await this.#server.scan("0", "MATCH", searchKey, "COUNT", options.count ?? "5000");
			const results = [scan[1]];

			let i = scan[0];
			while (i !== "0") {
				const result = await this.#server.scan(i, "MATCH", searchKey, "COUNT", options.count ?? "5000");

				i = result[0];
				results.push(result[1]);
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

			const rest = keys.map(([key, value]) => `${key}${ITEM_DELIMITER}${value}`).sort();
			return [mainKey, ...rest].join(GROUP_DELIMITER);
		}

		get active () { return this.#active; }

		get server () { return this.#server; }

		get modulePath () { return "cache"; }
	};
})();