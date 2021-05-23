/**
 * Wrapper for all sorts of runtime statistics of a process.
 * @deprecated Pending removal - should be replaced with `sb.Cache` calls instead.
 */
module.exports = class RuntimeSingleton extends require("./template.js") {
	#cachePrefix = "runtime";
	#resetPending = {
		commands: true,
		rejectedCommands: true,
		banphraseTimeouts: true
	};

	#started = new sb.Date();

	/**
	 * @inheritDoc
	 * @returns {RuntimeSingleton}
	 */
	static singleton () {
		if (!RuntimeSingleton.module) {
			RuntimeSingleton.module = new RuntimeSingleton();
		}
		return RuntimeSingleton.module;
	}

	/**
	 * Increments the used command counter by 1.
	 * @deprecated Pending removal - the entire module should be replaced with `sb.Cache` calls instead.
	 */
	async incrementCommandsCounter () {
		if (!sb.Cache || !sb.Cache.active) {
			return;
		}

		if (this.#resetPending.commands) {
			this.#resetPending.commands = false;

			await sb.Cache.setByPrefix(this.#cachePrefix, 1, {
				keys: { type: "commands" }
			});
		}
		else {
			const currentValue = await this.commands;
			await sb.Cache.setByPrefix(this.#cachePrefix, currentValue + 1, {
				keys: { type: "commands" }
			});
		}
	}

	/**
	 * Increments the rejected command counter by 1.
	 * @deprecated Pending removal - the entire module should be replaced with `sb.Cache` calls instead.
	 */
	async incrementRejectedCommands () {
		if (!sb.Cache || !sb.Cache.active) {
			return;
		}

		if (this.#resetPending.rejectedCommands) {
			this.#resetPending.rejectedCommands = false;

			await sb.Cache.setByPrefix(this.#cachePrefix, 1, {
				keys: { type: "rejected-commands" }
			});
		}
		else {
			const currentValue = await this.rejectedCommands;
			await sb.Cache.setByPrefix(this.#cachePrefix, currentValue + 1, {
				keys: { type: "rejected-commands" }
			});
		}
	}

	/**
	 * Increments the banphrase timeout counter by 1.
	 * @deprecated Pending removal - the entire module should be replaced with `sb.Cache` calls instead.
	 * @param {string|number} channel
	 */
	async incrementBanphraseTimeouts (channel) {
		if (!sb.Cache || !sb.Cache.active) {
			return;
		}

		let currentValue;
		if (this.#resetPending.banphraseTimeouts) {
			this.#resetPending.banphraseTimeouts = false;

			await sb.Cache.setByPrefix(this.#cachePrefix, {}, {
				keys: { type: "banphrase-timeouts" }
			});

			currentValue = {};
		}

		if (!currentValue) {
			currentValue = await this.banphraseTimeouts;
		}

		if (!currentValue[channel]) {
			currentValue[channel] = 1;
		}
		else {
			currentValue[channel]++;
		}

		await sb.Cache.setByPrefix(this.#cachePrefix, currentValue, {
			keys: { type: "banphrase-timeouts" }
		});
	}

	destroy () {}

	get started () { return this.#started; }

	/**
	 * @deprecated Pending removal - the entire module should be replaced with `sb.Cache` calls instead.
	 * @returns {Promise<number>}
	 */
	get commands () {
		if (!sb.Cache || !sb.Cache.active) {
			return 0;
		}

		return sb.Cache.getByPrefix(this.#cachePrefix, {
			keys: { type: "commands" }
		});
	}

	/**
	 * @deprecated Pending removal - the entire module should be replaced with `sb.Cache` calls instead.
	 * @returns {Promise<number>}
	 */
	get rejectedCommands () {
		if (!sb.Cache || !sb.Cache.active) {
			return 0;
		}

		return sb.Cache.getByPrefix(this.#cachePrefix, {
			keys: { type: "rejected-commands" }
		});
	}

	/**
	 * @deprecated Pending removal - the entire module should be replaced with `sb.Cache` calls instead.
	 * @returns {Promise<number>}
	 */
	get banphraseTimeouts () {
		if (!sb.Cache || !sb.Cache.active) {
			return 0;
		}

		return sb.Cache.getByPrefix(this.#cachePrefix, {
			keys: { type: "banphrase-timeouts" }
		});
	}

	get modulePath () { return "runtime"; }
};
