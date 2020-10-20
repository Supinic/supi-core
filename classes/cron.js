/**
 * Represents a function that's executed every some time
 * @memberof sb
 * @type Cron
 */
module.exports = class Cron extends require("./template.js") {
	//<editor-fold defaultstate="collapsed" desc="=== INSTANCE PROPERTIES ===">

	/**
	 * Unique numeric cron identifier
	 * @type {number|Symbol}
	 */
	ID;

	/**
	 * Unique cron name
	 * @type {sb.Date}
	 */
	Name;

	/**
	 * Cron expression that specifies when a job is being executed
	 * @type {string}
	 */
	Expression;

	/**
	 * Array of two numbers, specifying whether and by how much a cron job should be randomly postponed by.
	 * @type {Object|null}
	 */
	Defer;

	/**
	 * Execution function of the cron job
	 * @type {Function}
	 */
	Code;

	/**
	 * Any sort of custom data usable by the cron.
	 * @type {Object}
	 */
	data = {};

	/**
	 * Represents the cron's current status.
	 * @type {boolean}
	 */
	started = false;

	/**
	 * The cron job from module "cron" itself.
	 * @type {CronJob}
	 */
	job = null;

	/**
	 * If disabled, the cron is paused in its current state and cannot be started.
	 * @type {boolean}
	 */
	#disabled = false;

	// </editor-fold>

	static Job = require("cron").CronJob;
	static #serializableProperties = {
		Name: { type: "string" },
		Expression: { type: "string" },
		Defer: { type: "json" },
		Type: { type: "string" },
		Code: { type: "descriptor" }
	};

	constructor (data) {
		super();

		this.ID = data.ID ?? Symbol();

		this.Name = data.Name;
		if (typeof this.Name !== "string") {
			throw new sb.Error({
				message: "Cron name must be provided and be a string",
				args: data
			});
		}

		this.Expression = data.Expression;
		if (typeof this.Expression !== "string") {
			throw new sb.Error({
				message: "Cron time expression must be provided and be a string",
				args: data
			});
		}

		if (!data.Defer) {
			this.Defer = null;
		}
		else if (typeof data.Defer === "string") {
			try {
				this.Defer = eval(data.Defer)();
			}
			catch (e) {
				console.warn(`Cron ${data.Name} has invalid string-function defer definition`, e);
				this.Defer = null;
			}
		}
		else if (typeof data.Defer === "function") {
			try {
				this.Defer = data.Defer();
			}
			catch (e) {
				console.warn(`Cron ${data.Name} has invalid function defer definition`, e);
				this.Defer = null;
			}
		}

		if (this.Defer !== null && this.Defer?.constructor !== Object) {
			throw new sb.Error({
				message: "If provided, the Defer definition must result in an object",
				args: {
					ID: this.ID,
					type: typeof this.Defer
				}
			});
		}

		if (typeof data.Code === "string") {
			try {
				data.Code = eval(data.Code);
			}
			catch (e) {
				console.warn(`Cron ${data.Name} has invalid definition`, e);
				data.Code = () => {};
			}
		}

		if (typeof data.Code === "function") {
			this.Code = data.Code.bind(this);
		}
		else {
			throw new sb.Error({
				message: "Cron code must be a function",
				args: data
			});
		}

		// For "foreign" contexts, make sure to disabled the Cron so it is unavailable.
		if (data.Type && !Cron.types.includes(data.Type)) {
			this.#disabled = true;
		}
	}

	/**
	 * Starts the cron job.
	 * @returns {Cron}
	 */
	start () {
		if (this.#disabled) {
			throw new sb.Error({
				message: "Cannot start a disabled cron",
				args: { ID: this.ID }
			});
		}

		if (this.started) {
			return this;
		}

		if (!this.Expression) {
			console.error(`Cron ${this.Name} has no cron expression!`);
			return this;
		}

		if (this.Defer) {
			this.job = new Cron.Job(this.Expression, () => {
				const timeout = sb.Utils.random(
					this.Defer.start ?? 0,
					this.Defer.end
				);

				setTimeout(() => this.Code(), timeout);
			});
		}
		else {
			this.job = new Cron.Job(this.Expression, () => this.Code());
		}

		this.job.start();
		this.started = true;

		return this;
	}

	/**
	 * Stops the cron job.
	 * @returns {Cron}
	 */
	stop () {
		if (!this.started) {
			return this;
		}

		if (!this.job) {
			throw new sb.Error({
				message: `Job ${this.Name} has not been started yet!`
			});
		}

		this.job.stop();
		this.started = false;
		return this;
	}

	destroy () {
		if (this.job && this.started) {
			this.stop();
		}

		this.job = null;
	}

	async serialize (options = {}) {
		if (typeof this.ID !== "number") {
			throw new sb.Error({
				message: "Cannot serialize an anonymous Cron",
				args: {
					ID: this.ID,
					Name: this.Name
				}
			});
		}

		const row = await sb.Query.getRow("chat_data", "Cron");
		await row.load(this.ID);

		return await super.serialize(row, Cron.#serializableProperties, options);
	}

	get disabled () { return this.#disabled; }

	static async loadData () {
		const data = await sb.Query.getRecordset(rs => rs
			.select("*")
			.from("chat_data", "Cron")
			.where("Active = %b", true)
		);

		Cron.data = [];
		for (const row of data) {
			const cron = new Cron(row);
			if (!cron.disabled) {
				cron.start();
			}

			Cron.data.push(cron);
		}
	}

	static async reloadData () {
		for (const cron of Cron.data) {
			cron.destroy();
		}

		super.reloadData();
	}

	static async reloadSpecific (...list) {
		const reloadingCrons = list.map(i => Cron.get(i)).filter(Boolean);
		if (reloadingCrons.length === 0) {
			throw new sb.Error({
				message: "No valid crons provided"
			});
		}

		const data = await sb.Query.getRecordset(rs => rs
			.select("*")
			.from("chat_data", "Cron")
			.where("ID IN %n+", reloadingCrons.map(i => i.ID))
			.where("Type IN %s+", Cron.types)
			.where("Active = %b", true)
		);

		for (const record of data) {
			const existingIndex = Cron.data.findIndex(i => i.ID === record.ID);
			Cron.data[existingIndex].destroy();
			Cron.data[existingIndex] = null;

			const newCron = new Cron(record);
			Cron.data[existingIndex] = newCron;
			newCron.start();
		}
	}

	static get (identifier) {
		if (identifier instanceof Cron) {
			return identifier;
		}
		else if (typeof identifier === "string") {
		    return Cron.data.find(i => i.Name === identifier) ?? null;
		}
		else if (typeof identifier === "number" || typeof identifier === "symbol") {
			return Cron.data.find(i => i.ID === identifier) ?? null;
		}
		else {
			throw new sb.Error({
				message: "Invalid cron identifier type",
				args: {
					identifier,
					type: typeof identifier
				}
			});
		}
	}

	static get types () {
		const types = ["All"];
		if (process.env.PROJECT_TYPE === "bot") {
			types.push("Bot");
		}
		else if (process.env.PROJECT_TYPE === "site") {
			types.push("Website");
		}

		return types;
	}

	/**
	 * Cleans up.
	 */
	static destroy () {
		if (Cron.data && Cron.data.length > 0) {
			for (const cron of Cron.data) {
				if (cron.started) {
					cron.stop();
				}
			}
		}

		Cron.data = null;
	}
};