import {
	Counter,
	CounterConfiguration,
	Gauge,
	GaugeConfiguration,
	Histogram,
	HistogramConfiguration,
	Metric,
	MetricConfiguration,
	MetricType,
	Registry,
	// Summary,
	// SummaryConfiguration
} from "prom-client";

export { Counter, Gauge, Histogram, MetricType, Registry } from "prom-client";

export declare class MetricsSingleton {
	constructor ();

	register <T extends string>(type: MetricType, options: MetricConfiguration<T>): Metric<T>;

	registerCounter <T extends string>(options: CounterConfiguration<T>): Counter<T>;
	registerGauge <T extends string>(options: GaugeConfiguration<T>): Gauge<T>;
	registerHistogram <T extends string>(options: HistogramConfiguration<T>): Histogram<T>;

	get <T extends string>(name: T): Metric<T>;
	destroy (): void;

	get registry (): Registry;
}
