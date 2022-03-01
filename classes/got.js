/**
 * Represents a single `Got` instance with its own default options
 */
module.exports = (function () {
	const FormData = require("form-data");
	const gotModule = require("got");
	const SymbolName = Symbol("Name");

	const sanitize = (string) => string.replaceAll("../", "");

	class StaticGot extends require("./template.js") {
		static async loadData () {
			StaticGot.data = [];

			let count = 0;
			const { definitions: data } = await import("supibot-package-manager/got/index.mjs");

			while (data.length > 0) {
				const index = count % data.length;
				const item = data[index % data.length].default;

				if (item.parent && !StaticGot.data.some(i => i[SymbolName] === item.parent)) {
					count++;
					continue;
				}

				let options = {};
				if (item.optionsType === "object") {
					options = item.options;
				}
				else if (item.optionsType === "function") {
					options = item.options();
				}

				let instance;
				if (item.parent) {
					const parent = StaticGot.data.find(i => i[SymbolName] === item.parent);
					instance = parent.extend(options);
				}
				else {
					instance = gotModule.extend(options);
				}

				instance[SymbolName] = item.name;

				StaticGot.data.push(instance);
				data.splice(index, 1);
				count++;
			}
		}

		static async _loadData () {
			StaticGot.data = [];
			const data = await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("data", "Got_Instance")
				.orderBy("Parent ASC")
			);

			let count = 0;
			while (data.length > 0) {
				const index = count % data.length;
				const row = data[index % data.length];
				if (row.Parent && !StaticGot.data.some(i => i[SymbolName] === row.Parent)) {
					count++;
					continue;
				}

				let options = {};
				if (row.Options_Type === "JSON") {
					options = JSON.parse(row.Options);
				}
				else if (row.Options_Type === "function") {
					options = eval(row.Options)();
				}

				let instance;
				if (row.Parent) {
					const parent = StaticGot.data.find(i => i[SymbolName] === row.Parent);
					instance = parent.extend(options);
				}
				else {
					instance = gotModule.extend(options);
				}

				instance[SymbolName] = row.Name;

				StaticGot.data.push(instance);
				data.splice(index, 1);
				count++;
			}
		}

		static get (identifier) {
			if (identifier instanceof StaticGot) {
				return identifier;
			}
			else if (typeof identifier === "string") {
				return StaticGot.data.find(i => i[SymbolName] === identifier) ?? null;
			}
			else {
				throw new sb.Error({
					message: "Invalid user identifier type",
					args: { id: identifier, type: typeof identifier }
				});
			}
		}

		static gql (gqlOptions = {}) {
			if (!gqlOptions.query) {
				throw new sb.Error({
					message: "Missing parameter query for GQL request",
					args: { gqlOptions }
				});
			}

			const options = {
				method: "POST",
				responseType: "json",
				json: {
					query: gqlOptions.query
				}
			};

			delete gqlOptions.query;

			if (gqlOptions.token) {
				options.headers = (gqlOptions.headers) ? { ...gqlOptions.headers } : {};
				options.headers.Authorization = `Bearer ${gqlOptions.token}`;

				delete gqlOptions.headers;
				delete gqlOptions.token;
			}

			if (gqlOptions.variables) {
				options.json.variables = gqlOptions.variables;

				delete gqlOptions.variables;
			}

			return gotModule({ ...gqlOptions, ...options });
		}

		static sanitize (strings, ...values) {
			const result = [];
			for (let i = 0; i < strings.length; i++) {
				result.push(strings[i]);

				if (typeof values[i] === "string") {
					result.push(sanitize(values[i]));
				}
			}

			return result.join("").trim();
		}

		static extend (extendOptions) {
			const extension = gotModule.extend(extendOptions);
			return (urlOrOptions, restOptions) => {
				if (typeof restOptions?.url === "string") {
					restOptions.url = sanitize(restOptions.url);
				}
				else if (typeof urlOrOptions?.url === "string") {
					urlOrOptions.url = sanitize(urlOrOptions.url);
				}
				else if (typeof urlOrOptions === "string") {
					urlOrOptions = sanitize(urlOrOptions);
				}

				return extension(urlOrOptions, restOptions);
			};
		}

		static get specificName () { return "Got"; }

		static get FormData () { return FormData; }
	}

	return new Proxy(StaticGot, {
		apply: function (target, thisArg, args) {
			const options = args.find(i => typeof i === "object" && i?.constructor?.name === "Object");
			if (options && typeof options.url === "string" && !options.skipURLSanitization) {
				options.url = sanitize(options.url);
			}

			if (typeof args[0] === "string") {
				const instance = sb.Got.get(args[0]);
				if (instance) {
					return instance(...args.slice(1));
				}
			}

			return gotModule(...args);
		},

		get: function (target, property) {
			return (typeof target[property] !== "undefined")
				? target[property]
				: gotModule[property];
		}
	});
})();
