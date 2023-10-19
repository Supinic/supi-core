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
		"singletons/cache",
		"classes/got"
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
			const Component = require(`./${file}`);
			const name = Component.name.replace(/Singleton$/, "");

			sb[name] = new Component();
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
