module.exports = class MarkovChain extends require("./template.js") {
	#Markov = null;
	#CustomMarkov = null;
	#model = null;
	#prepared = false;

	/** @override */
	static async initialize () {
		try {
			MarkovChain.#Markov = require("markov-json").default;
		}
		catch {
			console.debug("MarkovChain could not be initialized - missing module markov-json");
		}

		MarkovChain.data = [];
		return MarkovChain;
	}

	/**
	 * Class containing markov chain data and simple ways to retrieve text out of them.
	 * @name sb.MarkovChain
	 * @type MarkovChain()
	 */
	constructor (data) {
		super();

		this.ID = data.ID;

		this.Name = data.Name;

		if (data.Definition) {
			try {
				this.Definition = JSON.parse(data.Definition);
			}
			catch (e) {
				console.error("Markov chain model ID " + this.ID + " has invalid definition", e);
				this.Definition = null;
			}
		}
		else {
			this.#model = new Markov();
			this.#prepared = true;
		}
	}

	sentences (amount = 1) {
		if (!this.#prepared) {
			this.load();
		}

		return this.#model.sentence(amount);
	}

	words (amount = 1) {
		if (!this.#prepared) {
			this.load();
		}

		return this.#model.words(amount);
	}

	train (data) {
		if (!this.#prepared) {
			this.load();
		}

		return this.#model.train(data);
	}

	load () {
		if (this.Definition === null) {
			throw new sb.Error({
				message: "Markov chain model ID " + this.ID + " has invalid definition. Cannot proceed"
			});
		}

		this.#model = new MarkovChain.#Markov(this.Definition);
		this.#prepared = true;
	}

	async save () {
		const row = await sb.Query.getRow("data", "Markov_Chain");
		if (this.ID) {
			await row.load(this.ID);
			row.values.Definition = JSON.stringify(this.#model.state);
		}
		else if (this.#prepared && Object.keys(this.#model.state).length > 9) {
			row.setValues({
				Name: this.Name,
				Definition: JSON.stringify(this.#model.state)
			})
		}
		else {
			throw new sb.Error({
				message: "Markov chain model is not loaded or active!"
			})
		}

		const { insertId } = await row.save();
		if (!this.ID) {
			this.ID = insertId;
		}
	}

	destroy () {
		for (const key of Object.keys(this.#model)) {
			this.#model[key] = null;
		}

		this.#model = null;
		this.#prepared = null;
	}

	get prepared () { return this.#prepared; }

	get model () { return this.#model; }

	static async get (identifier) {
		if (identifier instanceof MarkovChain) {
			return identifier;
		}
		else if (typeof identifier === "string") {
			let result = MarkovChain.data.find(i => i.Name === identifier);
			if (!result) {
				const data = await sb.Query.getRecordset(rs => rs
					.select("ID", "Name", "Definition")
					.from("data", "Markov_Chain")
					.where("Name = %s", identifier)
					.single()
				);

				if (data) {
					result = new MarkovChain(data);
					MarkovChain.data.push(result);
				}
			}

			return result;
		}
		else if (typeof identifier === "number") {
			let result = MarkovChain.data.find(i => i.ID === identifier);
			if (!result) {
				const data = await sb.Query.getRecordset(rs => rs
					.select("ID", "Name", "Definition")
					.from("data", "Markov_Chain")
					.where("ID = %n", identifier)
					.single()
				);

				if (data) {
					result = new MarkovChain(data);
					MarkovChain.data.push(result);
				}
			}

			return result;
		}
		else {
			throw new sb.Error({
				message: "Unrecognized identifier type",
				args: typeof identifier
			});
		}
	}

	static get AsyncMarkov () {
		if (MarkovChain.#CustomMarkov === null) {
			try {
				MarkovChain.#CustomMarkov = require("async-markov");
			}
			catch {
				console.debug("async-markov module could not be loaded");
				MarkovChain.#CustomMarkov = {};
			}
		}

		return MarkovChain.#CustomMarkov;
	};
};