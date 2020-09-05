module.exports = (function (Module) {
	"use strict";

	const Redis = require("ioredis");

	return class Cache extends Module {
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
			else if (!configuration || typeof configuration !== "object") {
				throw new sb.Error({
					message: "Connection configuration not provided"
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

			if (typeof value?.toRedis === "function") {
				return value.toRedis();
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

		get modulePath () { return "cache"; }
	};
});