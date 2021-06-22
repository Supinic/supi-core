/**
 * Module for logging various events to database.
 * @deprecated
 */
module.exports = class SystemLoggerSingleton extends require("./template.js") {
	/**
	 * @inheritDoc
	 * @returns {SystemLoggerSingleton}
	 */
	static singleton () {
		if (!SystemLoggerSingleton.module) {
			SystemLoggerSingleton.module = new SystemLoggerSingleton();
		}

		return SystemLoggerSingleton.module;
	}

	/** @deprecated */
	async send (tag, description = null, channel = null, user = null) {
		console.warn("Deprecated sb.SystemLogger.send call")
		return await sb.Logger.log(tag, description, channel, user);
	}

	/** @deprecated */
	async sendError (tag, error, ...args) {
		console.warn("Deprecated sb.SystemLogger.sendError call")
		return await sb.Logger.logError(tag, error, ...args);
	}

	get modulePath () { return "system-log"; }

	destroy () {}
};

/**
 * @typedef {string} CompoundSystemLogTag
 * @value {'Command','Message','Twitch','Discord','Cytube','Module','System'} Tag
 * @value {'Request','Fail','Load','Warning','Success','Ban','Shadowban','Clearchat','Sub','Giftsub','Host','Error','Timeout','Other','Restart'} Subtag
 */
