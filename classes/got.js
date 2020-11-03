module.exports = (function () {
	const FormData = require("form-data");
	const GotModule = require("got");

	class Got extends require("./template.js") {
		static async initialize () {
			Got.instances = {};
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

				const instance = GotModule.extend(options);
				instance.ID = row.ID;
				instance.Parent = null;

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

					let parent = Got.instances;
					for (const hop of path.reverse()) {
						parent = Object.values(parent).find(i => i?.ID === hop);
					}

					parent[row.Name] = instance;
					instance.Parent = parent;
				}
				else {
					Got.instances[row.Name] = instance;
				}
			}
		}

		static async reloadData () {
			Got.instances = {};
			await Got.loadData();
		}

		static get (identifier) {
			throw new sb.Error({
				message: "Not yet implemented"
			});
		}

		static get specificName () { return "Got"; }

		static get FormData () { return FormData; }
	}

	return new Proxy(Got, {
		apply: function (target, thisArg, args) {
			return GotModule(...args);
		},

		get: function (target, property) {
			return (typeof target[property] !== "undefined")
				? target[property]
				: GotModule[property];
		}
	});
})();