// objects
import { CustomDate } from "./objects/date";
import { CustomError } from "./objects/error";
import { CustomPromise } from "./objects/promise";

// classes
import { Config } from "./classes/config";
import { GotProxy as Got } from "./classes/got";

// singletons
import { CacheSingleton } from "./singletons/cache";
import { CooldownManagerSingleton } from "./singletons/cooldown-manager";
import { LoggerSingleton } from "./singletons/logger";
import { MetricsSingleton } from "./singletons/metrics";
import { PastebinSingleton } from "./singletons/pastebin";
import { QuerySingleton } from "./singletons/query";
import { SandboxSingleton } from "./singletons/sandbox";
import { UtilsSingleton } from "./singletons/utils";
import { VLCSingleton } from "./singletons/vlc-connector";

export declare type GlobalSbObject = {
    Date: typeof CustomDate,
    Error: typeof CustomError,
    Promise: typeof CustomPromise,

    Config: typeof Config,
    Got: typeof Got,

    Cache: InstanceType<typeof CacheSingleton>,
    CooldownManager: InstanceType<typeof CooldownManagerSingleton>,
    Logger: InstanceType<typeof LoggerSingleton>,
    Metrics: InstanceType<typeof MetricsSingleton>,
    Pastebin: InstanceType<typeof PastebinSingleton>,
    Query: InstanceType<typeof QuerySingleton>,
    Sandbox: InstanceType<typeof SandboxSingleton>,
    Utils: InstanceType<typeof UtilsSingleton>,
    VideoLANConnector: InstanceType<typeof VLCSingleton>
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
    | "singletons/cooldown-manager"
    | "singletons/logger"
    | "singletons/metrics"
    | "singletons/pastebin"
    | "singletons/query"
    | "singletons/sandbox"
    | "singletons/system-log"
    | "singletons/twitter"
    | "singletons/utils"
    | "singletons/vlc-connector";

declare type OptionsObject = {
    blacklist?: ModuleFilePath[];
    whitelist?: ModuleFilePath[];
    skipData?: ModuleFilePath[];
};

export default function initialize (options?: OptionsObject): Promise<GlobalSbObject>;
