import type { SupiDate as Date } from "./objects/date.d.ts";
import type { SupiError as Error } from "./objects/error.d.ts";
import type { SupiPromise as Promise } from "./objects/promise.d.ts";

import type { Query } from "./singletons/query/index.d.ts";
import type { Cache } from "./singletons/cache.d.ts";
import type { Metrics } from "./singletons/metrics.d.ts";
import type { Utils } from "./singletons/utils.d.ts";

import type { Config } from "./classes/config.d.ts";
import type { Got } from "./classes/got-proxy.d.ts";

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
