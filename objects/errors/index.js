module.exports = (function () {
	const result = Object.create(null);
	result.name = "errors";

	const subtypes = [
		"api.js",
		"generic-request",
		"not-implemented"
	];

	for (const file of subtypes) {
		try {
			const mod = require("./" + file);
			result[mod.name] = mod;
			console.log("Error module " + file + " imported", result);
		}
		catch (e) {
			console.log("Import of error module " + file + " failed", e.message);
		}
	}

	return result;
})();