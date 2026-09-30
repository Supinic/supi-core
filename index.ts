export { SupiError, SupiError as Error, GenericRequestError, isGenericRequestError, isSupiError } from "./objects/error.ts";
export { default as Date, default as SupiDate } from "./objects/date.ts";

export {
	GotRegistry,
	isGotRequestError,
	type GotRegistryInstanceDefinition,
	type GotRequestOptions,
	type GqlRequestOptions,
	type GotResponse
} from "./classes/got-registry.ts";

export { default as Utils } from "./singletons/utils.ts";

export {
	Cache,
	isFunctionKeyObject,
	type CacheValue,
	type FunctionKeyObject,
	type KeyLike,
	type KeyObject
} from "./singletons/cache.ts";

export {
	Metrics,
	type Gauge,
	type Registry,
	type Counter,
	type Histogram,
	type Metric,
	type MetricType,
	type MetricConfiguration
} from "./singletons/metrics.ts";

export {
	Query,
	type Recordset,
	type Row,
	type Batch,
	type RecordDeleter,
	type RecordUpdater,
	type SqlValue,
	type JavascriptValue
} from "./singletons/query/index.ts";
