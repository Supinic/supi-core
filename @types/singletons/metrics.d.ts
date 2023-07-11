import { SingletonTemplate as Template } from "./template";
import {
	Counter,
	CounterConfiguration,
	Gauge,
	GaugeConfiguration,
	Histogram,
	HistogramConfiguration,
	Metric,
	Registry
} from "prom-client";

export declare class MetricsSingleton implements Template {
	static module: MetricsSingleton;
	static singleton (): MetricsSingleton;

	constructor ();

	registerCounter <T extends string>(options: CounterConfiguration<T>): Counter<T>;
	registerGauge <T extends string>(options: GaugeConfiguration<T>): Gauge<T>;
	registerHistogram <T extends string>(options: HistogramConfiguration<T>): Histogram<T>;

	get <T extends string>(name: T): Metric<T>;
	destroy (): void;

	get registry (): Registry;
	get modulePath (): "metrics";
}