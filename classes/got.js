module.exports = (function () {
	const FormData = require("form-data");
	const GotModule = require("got");

	class Got extends require("./template.js") {
		static #instances = {};
		
		static async initialize () {
			Got.data = [];
			Got.#instances = {};
			return super.initialize();
		}

		static async loadData () {
			const data = await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("data", "Got_Instance")
				.orderBy("Parent ASC")
			);

			for (const row of data) {
				let options = {};
				if (row.Options_Type === "JSON") {
					options = JSON.parse(row.Options);
				}
				else if (row.Options_Type === "function") {
					options = eval(row.Options)();
				}

				// Sets up theoretically infinite parent levels
				if (row.Parent) {
					const path = [];
					let currentID = row.Parent;
					while (currentID) {
						const current = data.find(i => i.ID === currentID);
						if (current) {
							path.push(current.ID);
						}

						currentID = current?.Parent ?? null;
					}

					let parent = Got.#instances;
					for (const hop of path.reverse()) {
						parent = Object.values(parent).find(i => i?.ID === hop);
					}

					const instance = parent.extend(options);
					instance.ID = row.ID;
					instance.Parent = parent;

					parent[row.Name] = instance;
					Got.data.push(instance);
				}
				else {
					const instance = GotModule.extend(options);
					Got.#instances[row.Name] = instance;
					Got.data.push(instance);
				}
			}
		}

		static async reloadData () {
			Got.data = [];
			Got.#instances = {};
			await Got.loadData();
		}

		static get (identifier) {
			if (identifier instanceof Got) {
				return identifier;
			}
			else if (typeof identifier === "number") {
				return Got.data.find(i => i.ID === identifier) ?? null;
			}
			else if (typeof identifier === "string") {
				return Got.data.find(i => i.Name === identifier) ?? null;
			}
			else {
				throw new sb.Error({
					message: "Invalid user identifier type",
					args: { id: identifier, type: typeof identifier }
				});
			}
		}

		static get instances () {
			console.warn("got.instances - deprecated access");
			return Got.#instances;
		}

		static get specificName () { return "Got"; }

		static get FormData () { return FormData; }
	}

	return new Proxy(Got, {
		apply: function (target, thisArg, args) {
			if (args.length === 1 && typeof args[0] === "string") {
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