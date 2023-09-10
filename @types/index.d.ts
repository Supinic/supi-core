// objects
import { CustomDate } from "./objects/date";
import { CustomError } from "./objects/error";
import { CustomPromise } from "./objects/promise";

// classes
import { Config } from "./classes/config";
import { GotProxy as Got } from "./classes/got";

// singletons
import { CacheSingleton } from "./singletons/cache";
import { MetricsSingleton } from "./singletons/metrics";
import { QuerySingleton } from "./singletons/query";
import { UtilsSingleton } from "./singletons/utils";

export declare type GlobalSbObject = {
    Date: typeof CustomDate,
    Error: typeof CustomError,
    Promise: typeof CustomPromise,

    Config: typeof Config,
    Got: typeof Got,

    Cache: InstanceType<typeof CacheSingleton>,
    Metrics: InstanceType<typeof MetricsSingleton>,
    Query: InstanceType<typeof QuerySingleton>,
    Utils: InstanceType<typeof UtilsSingleton>,
};

// declare type ModuleName = keyof GlobalSbObject;
declare type ModuleFilePath = "classes/afk"
    | "classes/config"
    | "classes/got"
    | "objects/date"
    | "objects/error"
    | "objects/errors"
    | "objects/promise"
    | "singletons/cache"
    | "singletons/metrics"
    | "singletons/query"
    | "singletons/twitter"
    | "singletons/utils"

declare type OptionsObject = {
    blacklist?: ModuleFilePath[];
    whitelist?: ModuleFilePath[];
    skipData?: ModuleFilePath[];
};

export default function initialize (options?: OptionsObject): Promise<GlobalSbObject>;
