/* global sb */
module.exports = (function () {
	"use strict";

	const CronJob = require("cron").CronJob;

	/**
	 * Represents a function that's executed every some time
	 * @memberof sb
	 * @type Cron
	 */
	return class Cron {
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
		started = false;
		job = null;

		/**
		 * @param {Object} data
		 * @param {number} data.User_Alias
		 * @param {sb.Date} data.Started
		 * @param {string} data.Text
		 * @param {boolean} data.Silent
		 */
		constructor (data) {
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

			if (typeof data.Defer === "string") {
				try {
					data.Defer = JSON.parse(data.Code);
				}
				catch (e) {
					console.warn(`Cron ${data.Name} has invalid defer definition`, e);
					data.Code = null;
				}
			}

			if (data.Defer === null) {
				this.Defer = null;
			}
			else if (data.Defer?.constructor === Object) {
				this.Defer = data.Defer.slice(0, 2);
			}
			else {
				throw new sb.Error({
					message: "If provided, defer must be an object"
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
		}

		/**
		 * Starts the cron job.
		 * @returns {Cron}
		 */
		start () {
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

		/** @override */
		static async initialize () {
			Cron.data = [];

			await Cron.loadData();
			return Cron;
		}

		static async loadData () {
			const types = ["All"];
			if (process.env.PROJECT_TYPE === "bot") {
				types.push("Bot");
			}
			else if (process.env.PROJECT_TYPE === "site") {
				types.push("Website");
			}

			Cron.data = (await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("chat_data", "Cron")
				.where("Type IN %s+", types)
				.where("Active = %b", true)
			)).map(row => new Cron(row).start());
		}

		static async reloadData () {
			if (Cron.data.length > 0) {
				for (const cron of Cron.data) {
					if (cron.started) {
						cron.stop();
					}
				}
			}

			Cron.data = [];

			await Cron.loadData();
		}

		static get (identifier) {
			if (identifier instanceof Cron) {
				return identifier;
			}
			else if (typeof identifier === "string") {
			    return Cron.data.filter(i => i.Name === identifier) ?? null;
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
})();