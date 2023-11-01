import Date from "./objects/date.js";
import Error from "./objects/error.js";
import Promise from "./objects/promise.js";

import Config from "./classes/config.js";
import Got from "./classes/got-proxy.js";

import Query from "./singletons/query/index.js";
import Cache from "./singletons/cache.js";
import Metrics from "./singletons/metrics.js";
import Utils from "./singletons/utils.js";

export {
	Date,
	Error,
	Promise,

	Config,
	Got,

	Query,
	Cache,
	Metrics,
	Utils
};
