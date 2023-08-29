module.exports = (async function (options = {}) {
	/**
	 * Global namespace wrapper.
	 * @namespace
	 * @type {GlobalSbObject}
	 */
	globalThis.sb = {};

	const files = [
		"objects/date",
		"objects/error",
		"objects/promise",

		"singletons/metrics",
		"singletons/query",
		"classes/config",
		"singletons/utils",
		"classes/cron",
		"singletons/cache",
		"singletons/cooldown-manager",
		"singletons/logger",
		"singletons/system-log",
		"singletons/vlc-connector",
		"singletons/twitter",
		"singletons/local-request",
		"singletons/sandbox",

		"classes/got",
		"singletons/pastebin",

		"classes/platform",
		"classes/filter",
		"classes/command",
		"classes/channel",
		"classes/chat-module",
		"classes/user",
		"classes/afk",
		"classes/banphrase",
		"classes/reminder"
	];

	const {
		blacklist,
		whitelist,
		skipData = []
	} = options;

	console.groupCollapsed("module load performance");

	for (const file of files) {
		if (blacklist && blacklist.includes(file)) {
			continue;
		}
		else if (whitelist && !whitelist.includes(file)) {
			continue;
		}

		const start = process.hrtime.bigint();
		const [type, moduleName] = file.split("/");

		if (type === "objects") {
			const component = require(`./${file}`);
			const name = component.name.replace(/^Custom/, "");

			sb[name] = component;
		}
		else if (type === "singletons") {
			// This switch structure is created solely to make JSDoc for singletons work in the global `sb` scope
			switch (moduleName) {
				case "cache": {
					const Component = require("./singletons/cache.js");
					sb.Cache = Component.singleton();
					break;
				}

				case "cooldown-manager": {
					const Component = require("./singletons/cooldown-manager.js");
					sb.CooldownManager = Component.singleton();
					break;
				}

				case "local-request": {
					const Component = require("./singletons/local-request.js");
					sb.LocalRequest = Component.singleton();
					break;
				}

				case "logger": {
					const Component = require("./singletons/logger.js");
					sb.Logger = Component.singleton();
					break;
				}

				case "metrics": {
					const Component = require("./singletons/metrics.js");
					sb.Metrics = Component.singleton();
					break;
				}

				case "pastebin": {
					const Component = require("./singletons/pastebin.js");
					sb.Pastebin = Component.singleton();
					break;
				}

				case "query": {
					const Component = require("./singletons/query");
					sb.Query = Component.singleton();
					break;
				}

				case "sandbox": {
					const Component = require("./singletons/sandbox.js");
					sb.Sandbox = Component.singleton();
					break;
				}

				case "utils": {
					const Component = require("./singletons/utils.js");
					sb.Utils = Component.singleton();
					break;
				}

				case "vlc-connector": {
					const Component = require("./singletons/vlc-connector.js");
					sb.VideoLANConnector = Component.singleton();
					break;
				}
			}
		}
		else if (type === "classes") {
			const component = require(`./${file}`);
			if (skipData.includes(file)) {
				sb[component.specificName ?? component.name] = component;
			}
			else {
				sb[component.specificName ?? component.name] = await component.initialize();
			}
		}

		const end = process.hrtime.bigint();
		console.log(`${moduleName} loaded in ${Number(end - start) / 1e6} ms`);
	}

	console.groupEnd();

	return globalThis.sb;
});
