const Prometheus = require("prom-client");
const availableMetricTypes = ["Counter", "Gauge", "Histogram", "Summary"];

/**
 * Very simple module wrapper around the Prometheus client metrics
 */
module.exports = class MetricsSingleton {
	#registry;

	constructor () {
		this.#registry = new Prometheus.Registry();

		Prometheus.collectDefaultMetrics({
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

		const metric = new Prometheus[type](options);
		this.#registry.registerMetric(metric);

		return metric;
	}

	registerCounter (options) {
		const counter = new Prometheus.Counter(options);
		this.#registry.registerMetric(counter);

		return counter;
	}

	registerGauge (options) {
		const gauge = new Prometheus.Gauge(options);
		this.#registry.registerMetric(gauge);

		return gauge;
	}

	registerHistogram (options) {
		const histogram = new Prometheus.Histogram(options);
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

	get modulePath () { return "metrics"; }
};
