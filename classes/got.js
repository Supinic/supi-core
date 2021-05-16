module.exports = (function () {
	const FormData = require("form-data");
	const GotModule = require("got");
	const SymbolName = Symbol("Name");

	class Got extends require("./template.js") {

		static data = [];

		static async loadData () {
			Got.data = [];
			const data = await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("data", "Got_Instance")
				.orderBy("Parent ASC")
			);

			let count = 0;
			while (data.length > 0) {
				const index = count % data.length;
				const row = data[index % data.length];
				if (row.Parent && !Got.data.find(i => i[SymbolName] === row.Parent)) {
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
					const parent = Got.data.find(i => i[SymbolName] === row.Parent);
					instance = parent.extend(options);
				}
				else {
					instance = GotModule.extend(options);
				}

				instance[SymbolName] = row.Name;

				Got.data.push(instance);
				data.splice(index, 1);
				count++;
			}
		}

		static get (identifier) {
			if (identifier instanceof Got) {
				return identifier;
			}
			else if (typeof identifier === "string") {
				return Got.data.find(i => i[SymbolName] === identifier) ?? null;
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

			return GotModule({ ...gqlOptions, ...options });
		}

		static get instances () {
			console.warn("deprecated Got.instances access");

			const path = [];
			const fn = (...args) => {
				const instance = sb.Got.get(path[path.length - 1]);
				if (!instance) {
					throw new sb.Error({
						message: "Got instance does not exist",
						args: { path }
					});
				}

				return instance(...args);
			};

			const accessProxy = new Proxy(fn, {
				get: function (target, property) {
					path.push(property);
					return accessProxy;
				}
			});

			return accessProxy;
		}

		static get specificName () { return "Got"; }

		static get FormData () { return FormData; }
	}

	return new Proxy(Got, {
		apply: function (target, thisArg, args) {
			if (typeof args[0] === "string") {
				const instance = sb.Got.get(args[0]);
				if (instance) {
					return instance(...args.slice(1));
				}
			}

			return GotModule(...args);
		},

		get: function (target, property) {
			return (typeof target[property] !== "undefined")
				? target[property]
				: GotModule[property];
		}
	});
})();