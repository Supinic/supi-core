import { collectDefaultMetrics, Registry, Gauge, Counter, Histogram } from "prom-client";
const availableMetricTypes = ["Counter", "Gauge", "Histogram", "Summary"];

/**
 * Very simple module wrapper around the Prometheus client metrics
 */
module.exports = class MetricsSingleton {
	#registry;

	constructor () {
		this.#registry = new Registry();

		collectDefaultMetrics({
			register: this.#registry
		});
	}

	register (type, options) {
		if (!availableMetricTypes.includes(type)) {
			throw new sb.Error({
				message: "Unsupported metric type provided",
				args: { type, options }
			});
		}

		const existing = this.get(options.name);
		if (existing) {
			return existing;
		}

		if (type === "Counter") {
			return this.registerCounter(options);
		}
		else if (type === "Gauge") {
			return this.registerGauge(options);
		}
		else if (type === "Histogram") {
			return this.registerHistogram(options);
		}
	}

	registerCounter (options) {
		const counter = new Counter(options);
		this.#registry.registerMetric(counter);

		return counter;
	}

	registerGauge (options) {
		const gauge = new Gauge(options);
		this.#registry.registerMetric(gauge);

		return gauge;
	}

	registerHistogram (options) {
		const histogram = new Histogram(options);
		this.#registry.registerMetric(histogram);

		return histogram;
	}

	get (name) {
		return this.#registry.getSingleMetric(name);
	}

	get registry () {
		return this.#registry;
	}

	destroy () {
		this.#registry = null;
	}
};
