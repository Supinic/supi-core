const { CronJob } = require("cron");

/**
 * Represents a function that's executed every some time
 */
module.exports = class Cron extends require("./template.js") {
	// <editor-fold defaultstate="collapsed" desc="=== INSTANCE PROPERTIES ===">

	/**
	 * Unique cron name
	 * @type {string}
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
	data;

	/**
	 * Represents the cron's current status.
	 * @type {boolean}
	 */
	started = false;

	/**
	 * The cron job from module "cron" itself.
	 * @type {CronJob}
	 */
	job;

	/**
	 * If disabled, the cron is paused in its current state and cannot be started.
	 * @type {boolean}
	 */
	#disabled;

	// </editor-fold>

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

		// For "foreign" contexts, make sure to disable the Cron, so it is unavailable.
		this.#disabled = Boolean(data.Type && !Cron.types.includes(data.Type));

		this.job = null;
		this.data = {};
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
			this.job = new CronJob(this.Expression, () => {
				const timeout = sb.Utils.random(
					this.Defer.start ?? 0,
					this.Defer.end
				);

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

	get disabled () { return this.#disabled; }

	static async loadData () {
		Cron.data = [];
		const { definitions } = await require("supibot-package-manager/crons");

		for (const definition of definitions) {
			Cron.#create(definition);
		}
	}

	static async reloadData () {
		for (const cron of Cron.data) {
			cron.destroy();
		}

		await super.reloadData();
	}

	static async reloadSpecific (...list) {
		if (list.length === 0) {
			return false;
		}

		const failed = [];
		const existingCrons = list.map(i => Cron.get(i)).filter(Boolean);

		const cronModulePath = require.resolve("supibot-package-manager/crons");
		delete require.cache[cronModulePath];

		for (const originalCron of existingCrons) {
			const index = Cron.data.indexOf(originalCron);
			const identifier = originalCron.Name;

			originalCron.destroy();

			if (index !== -1) {
				Cron.data.splice(index, 1);
			}

			let path;
			try {
				path = require.resolve(`supibot-package-manager/crons/${identifier}`);
				delete require.cache[path];
			}
			catch {
				failed.push({
					identifier,
					reason: "no-path"
				});
			}
		}

		for (const name of list) {
			let definition;
			try {
				definition = require(`supibot-package-manager/crons/${name}`);
			}
			catch {
				failed.push({
					name,
					reason: "no-new-path"
				});
			}

			if (definition) {
				Cron.#create(definition);
			}
		}

		return {
			success: true,
			failed
		};
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

	static #create (definition) {
		const cron = new Cron(definition);
		if (!cron.disabled) {
			cron.start();
		}

		Cron.data.push(cron);

		return cron;
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
