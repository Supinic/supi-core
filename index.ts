export { SupiError, GenericRequestError } from "./objects/error.js";

import Date from "./objects/date.js";
import Promise from "./objects/promise.js";
import Got from "./classes/got-proxy.js";
import Query from "./singletons/query/index.js";
import Cache from "./singletons/cache.js";
import Metrics from "./singletons/metrics.js";
import Utils from "./singletons/utils.js";

export {
	Date,
	Promise,
	Got,
	Query,
	Cache,
	Metrics,
	Utils
};
