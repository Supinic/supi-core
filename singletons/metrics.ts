import {
	collectDefaultMetrics,
	Registry,
	Gauge,
	Counter,
	Histogram,
	// MetricType,
	MetricConfiguration,
	CounterConfiguration,
	GaugeConfiguration,
	HistogramConfiguration,
	Metric
} from "prom-client";

import SupiError from "../objects/error.js";

// equivalent of MetricType from `prom-client`, but couldn't be re-imported due to a problematic library export
declare const enum MetricType {
	Counter,
	Gauge,
	Histogram,
	// Summary
}

declare const enum StringMetricType {
	Counter = "Counter",
	Gauge = "Gauge",
	Histogram = "Histogram"
}

/**
 * Very simple module wrapper around the Prometheus client metrics
 */
export default class Metrics {
	#registry;

	constructor () {
		this.#registry = new Registry();

		collectDefaultMetrics({
			register: this.#registry
		});
	}

	register<T extends string> (type: MetricType | StringMetricType, options: MetricConfiguration<T>): Metric<T> {
		const existing = this.get(options.name);
		if (existing) {
			return existing;
		}

		switch (type) {
			case MetricType.Counter:
			case StringMetricType.Counter:
				return this.registerCounter(options);
			case MetricType.Gauge:
			case StringMetricType.Gauge:
				return this.registerGauge(options);
			case MetricType.Histogram:
			case StringMetricType.Histogram:
				return this.registerHistogram(options);
			default:
				throw new SupiError({
					message: "Unsupported metric type provided",
					args: {
						type,
						options: {
							name: options.name,
							help: options.help
						}
					}
				});
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
