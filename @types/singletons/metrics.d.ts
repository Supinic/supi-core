import { SingletonTemplate as Template } from "./template";
import {CounterConfiguration, Metric, Registry} from "prom-client";

export declare class MetricsSingleton implements Template {
	static module: MetricsSingleton;
	static singleton (): MetricsSingleton;

	constructor ();

	registerCounter <T extends string>(options: CounterConfiguration<T>): void;
	get <T extends string>(name: T): Metric<T>;
	destroy ();

	get registry (): Registry;
	get modulePath (): "metrics";
}
