const Prometheus = require("prom-client");

/**
 * Very simple module wrapper around the Prometheus client metrics
 */
module.exports = class MetricsSingleton extends require("./template.js") {
	#registry;

	static singleton () {
		if (!MetricsSingleton.module) {
			MetricsSingleton.module = new MetricsSingleton();
		}

		return MetricsSingleton.module;
	}

	constructor () {
		super();

		this.#registry = new Prometheus.Registry();

		Prometheus.collectDefaultMetrics({
			register: this.#registry
		});
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
