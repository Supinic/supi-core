/* global sb */
module.exports = (function () {
	"use strict";

	const defaultTimeout = 10000;
	const Workerpool = require("workerpool");
	const Template = require("../template.js");

	return class MathWorker extends Template {
		static singleton () {
			if (!MathWorker.module) {
				MathWorker.module = new MathWorker(sb.Config.get("MATH_TIMEOUT"));
			}
			return MathWorker.module;
		}

		constructor (timeout) {
			super();
			this.pool = Workerpool.pool(__dirname + "/worker.js");
			this.timeout = timeout || defaultTimeout;
		}

		evaluate (expression) {
			return new Promise((resolve, reject) => {
				this.pool.exec("math", [expression])
					.timeout(this.timeout)
					.then(result => resolve(result))
					.catch(err => reject(err))
					.then(() => this.pool.terminate());
			});
		}

		get modulePath () { return "math-worker"; }

		destroy () {
			this.pool = null;
		}
	};
})();