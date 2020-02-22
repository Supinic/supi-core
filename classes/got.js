module.exports = (function () {
	const Got = require("got");

	Got.initialize = async function () {
		Got.instances = {};
		await Got.loadData();
		return Got;
	};

	Got.loadData = async function () {
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

			const instance = Got.extend(options);
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
	};

	Got.reloadData = async function () {
		Got.instances = {};
		await Got.loadData();
	};

	return Got;
})();