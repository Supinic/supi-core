import {
	collectDefaultMetrics,
	Registry,
	Gauge,
	Counter,
	Histogram,
	MetricConfiguration,
	CounterConfiguration,
	GaugeConfiguration,
	HistogramConfiguration,
	Metric
} from "prom-client";

export {
	type Gauge,
	type Registry,
	type Counter,
	type Histogram,
	type Metric,
	// Cannot use MetricType due to:
	// SyntaxError: Named export 'MetricType' not found. The requested module 'prom-client' is a CommonJS module, which may not support all module.exports as named exports.
	type MetricConfiguration
} from "prom-client";

export type MetricType = "Gauge" | "Counter" | "Histogram";

/**
 * Very simple module wrapper around the Prometheus client metrics
 */
export class Metrics {
	#registry;

	constructor () {
		this.#registry = new Registry();

		collectDefaultMetrics({
			register: this.#registry
		});
	}

	register<T extends string> (type: MetricType, options: MetricConfiguration<T>): Metric<T> {
		const existing = this.get(options.name);
		if (existing) {
			return existing;
		}

		switch (type) {
			case "Counter": return this.registerCounter(options);
			case "Gauge": return this.registerGauge(options);
			case "Histogram": return this.registerHistogram(options);
		}
	}

	registerCounter<T extends string> (options: CounterConfiguration<T>): Counter<T> {
		const counter = new Counter(options);
		this.#registry.registerMetric(counter);

		return counter;
	}

	registerGauge<T extends string> (options: GaugeConfiguration<T>): Gauge<T> {
		const gauge = new Gauge(options);
		this.#registry.registerMetric(gauge);

		return gauge;
	}

	registerHistogram<T extends string> (options: HistogramConfiguration<T>): Histogram<T> {
		const histogram = new Histogram(options);
		this.#registry.registerMetric(histogram);

		return histogram;
	}

	get<T extends string> (name: T): Metric<T> | undefined {
		return this.#registry.getSingleMetric(name);
	}

	get registry () {
		return this.#registry;
	}
}

export default Metrics;
