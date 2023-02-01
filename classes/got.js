/**
 * Represents a single `Got` instance with its own default options
 */
module.exports = (function () {
	const FormData = require("form-data");
	const nameSymbol = Symbol.for("name");

	let gotModule;
	let gotRequestErrors;

	// Replace out all occurrences of the "up one level" string - "../"
	// Also if they are followed with another one, like so: "../.."
	const sanitize = (string) => string.replaceAll(/\.\.\/?/g, "");

	class StaticGot extends require("./template.js") {
		static importable = true;
		static uniqueIdentifier = nameSymbol;

		static async initialize () {
			gotModule ??= await import("got");
			gotRequestErrors ??= [
				gotModule.CancelError,
				gotModule.HTTPError,
				gotModule.RequestError,
				gotModule.TimeoutError
			];

			return this;
		}

		static get (identifier) {
			if (identifier instanceof StaticGot) {
				return identifier;
			}
			else if (typeof identifier === "string") {
				return StaticGot.data.find(i => i[nameSymbol] === identifier) ?? null;
			}
			else {
				throw new sb.Error({
					message: "Invalid user identifier type",
					args: { id: identifier, type: typeof identifier }
				});
			}
		}

		static async importData (definitions) {
			if (!Array.isArray(definitions)) {
				throw new sb.Error({
					message: "Definitions must be provided as an array"
				});
			}

			const instanceParents = new Set(definitions.map(i => i.parent));
			const availableParents = new Set([null, ...definitions.map(i => i.name)]);
			for (const instanceParent of instanceParents) {
				if (!availableParents.has(instanceParent)) {
					throw new sb.Error({
						message: "Instance parent is not defined",
						args: {
							requested: instanceParent,
							availableParents: [...availableParents]
						}
					});
				}
			}

			let count = 0;
			const result = [];
			const loadedParents = new Set();
			const loadedDefinitions = new Set();

			while (result.length < definitions.length) {
				const index = count % definitions.length;
				const definition = definitions[index % definitions.length];
				if (!loadedDefinitions.has(definition) && (definition.parent === null || loadedParents.has(definition.parent))) {
					const instance = StaticGot.#add(definition, result);
					result.push(instance);
					loadedParents.add(instance[nameSymbol]);
					loadedDefinitions.add(definition);
				}

				count++;
			}

			StaticGot.data = result;
		}

		static async importSpecific (...definitions) {
			for (const definition of definitions) {
				const oldInstanceIndex = StaticGot.data.findIndex(i => i[nameSymbol] === definition.name);
				if (oldInstanceIndex !== -1) {
					StaticGot.data.splice(oldInstanceIndex, 1);
				}

				const newInstance = StaticGot.#add(definition, StaticGot.data);
				StaticGot.data.push(newInstance);
			}
		}

		static #add (definition, parentDefinitions) {
			let initError;
			let options = {};
			if (definition.optionsType === "object") {
				options = definition.options;
			}
			else if (definition.optionsType === "function") {
				try {
					options = definition.options();
				}
				catch (e) {
					console.warn(`Got instance ${definition.name} init error - skipped`, e);
					initError = e;
				}
			}

			let instance;
			if (initError) {
				instance = () => {
					throw new sb.Error({
						message: "Instance is not available due to initialization error",
						args: { definition },
						cause: initError
					});
				};
			}
			else if (definition.parent) {
				const parent = parentDefinitions.find(i => i[nameSymbol] === definition.parent);
				if (!parent) {
					throw new sb.Error({
						message: "Requested parent instance does not exist",
						args: {
							requested: definition.parent,
							existing: parentDefinitions.map(i => i[nameSymbol])
						}
					});
				}

				instance = parent.extend(options);
			}
			else {
				instance = gotModule.got.extend(options);
			}

			instance[nameSymbol] = definition.name;

			return instance;
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

			return gotModule.got({ ...gqlOptions, ...options });
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
			const extension = gotModule.got.extend(extendOptions);
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

		static isRequestError (error) {
			return gotRequestErrors.some(GotError => error instanceof GotError);
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

			if (typeof args[1] === "string") {
				args[1] = sanitize(args[1]);
			}

			if (typeof args[0] === "string") {
				const instance = StaticGot.get(args[0]);
				if (instance) {
					return instance(...args.slice(1));
				}
			}

			return gotModule.got(...args);
		},

		get: function (target, property) {
			return target[property] ?? gotModule[property] ?? gotModule.got[property];
		}
	});
})();
