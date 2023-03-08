const { CronJob } = require("cron");
const random = (min = 0, max = 0) => Math.floor((Math.random() * (max + 1 - min)) + min);

module.exports = class Cron extends require("./template.js") {
	Name;
	Expression;
	Defer;
	Code;
	data;

	job;
	#disabled;

	static importable = true;
	static uniqueIdentifier = "Name";

	constructor (data) {
		super();

		if (Cron.data.some(i => i.Name === data.name)) {
			throw new sb.Error({
				message: "Conflicting Cron name",
				args: {
					name: data.Name
				}
			});
		}

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
		else if (typeof data.Defer === "object") {
			this.Defer = data.Defer;
		}
		else if (typeof data.Defer === "function") {
			this.Defer = data.Defer();

			if (this.Defer !== null && typeof this.Defer !== "object") {
				throw new sb.Error({
					message: "Cron Defer function results in invalid type",
					args: {
						cron: data.Name,
						defer: data.Defer.toString(),
						result: typeof this.Defer
					}
				});
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

		this.job = null;
		this.data = {};
	}

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
			this.job = new CronJob(this.Expression, () => {
				const timeout = random(this.Defer.start ?? 0, this.Defer.end);
				setTimeout(() => this.Code(), timeout);
			});
		}
		else {
			this.job = new CronJob(this.Expression, () => this.Code());
		}

		this.job.start();
		this.started = true;

		return this;
	}

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

	get disabled () { return this.#disabled; }

	static async initialize () {
		// Override default behaviour of automatically loading module's data on initialization
		this.data = [];
		return this;
	}

	static async importData (definitions) {
		super.importData(definitions);

		for (const cron of Cron.data) {
			if (!cron.disabled) {
				cron.start();
			}
		}
	}

	static async importSpecific (...definitions) {
		super.genericImportSpecific(...definitions);
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
