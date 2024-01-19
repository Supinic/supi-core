import type * as SupiDate from "./objects/date.d.ts";
import type * as SupiError from "./objects/error.d.ts";
import type * as SupiPromise from "./objects/promise.d.ts";

import type * as Query from "./singletons/query/index.d.ts";
import type * as Cache from "./singletons/cache.d.ts";
import type * as Metrics from "./singletons/metrics.d.ts";
import type * as Utils from "./singletons/utils.d.ts";

import type * as Config from "./classes/config.d.ts";
import type * as Got from "./classes/got-proxy.d.ts";

export {
    SupiDate,
    SupiError,
    SupiPromise,

    Config,
    Got,

    Query,
    Cache,
    Metrics,
    Utils
};
