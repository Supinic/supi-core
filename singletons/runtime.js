module.exports = class Runtime extends require("./template.js") {
	#cachePrefix = "runtime";
	#resetPending = {
		commands: true,
		rejectedCommands: true,
		banphraseTimeouts: true
	};

	static singleton () {
		if (!Runtime.module) {
			Runtime.module = new Runtime();
		}
		return Runtime.module;
	}

	/**
	 * Increments the used command counter by 1.
	 */
	async incrementCommandsCounter () {
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

	/*
	 * Increments the rejected command counter by 1.
	 */
	async incrementRejectedCommands () {
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
	 * @param {string|number} channel
	 */
	async incrementBanphraseTimeouts (channel) {
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

	get commands () {
		return sb.Cache.getByPrefix(this.#cachePrefix, {
			keys: { type: "commands" }
		});
	}

	get rejectedCommands () {
		return sb.Cache.getByPrefix(this.#cachePrefix, {
			keys: { type: "rejected-commands" }
		});
	}

	get banphraseTimeouts () {
		return sb.Cache.getByPrefix(this.#cachePrefix, {
			keys: { type: "banphrase-timeouts" }
		});
	}

	get modulePath () { return "runtime"; }
};