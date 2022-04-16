// objects
import { CustomDate } from "./objects/date";
import { CustomError, errors } from "./objects/error";
import { CustomPromise } from "./objects/promise";
import { URLParams } from "./objects/url-params";

// classes
import { AwayFromKeyboard } from "./classes/afk";
import { Banphrase } from "./classes/banphrase";
import { Channel } from "./classes/channel";
import { ChatModule } from "./classes/chat-module";
import { Command } from "./classes/command";
import { Config } from "./classes/config";
import { Filter } from "./classes/filter";
import { GotProxy as Got } from "./classes/got";
import { Platform } from "./classes/platform";
import { Reminder } from "./classes/reminder";
import { User } from "./classes/user";

// singletons
import { CacheSingleton } from "./singletons/cache";
import { CooldownManagerSingleton } from "./singletons/cooldown-manager";
import { LocalRequestSingleton } from "./singletons/local-request";
import { LoggerSingleton } from "./singletons/logger";
import { PastebinSingleton } from "./singletons/pastebin";
import { QuerySingleton } from "./singletons/query";
import { SandboxSingleton } from "./singletons/sandbox";
import { UtilsSingleton } from "./singletons/utils";
import { VLCSingleton } from "./singletons/vlc-connector";

export declare type GlobalSbObject = {
    Date: typeof CustomDate,
    Error: typeof CustomError,
    errors: typeof errors,
    Promise: typeof CustomPromise,
    URLParams: URLParams,

    AwayFromKeyboard: typeof AwayFromKeyboard,
    Banphrase: typeof Banphrase,
    Channel: typeof Channel,
    ChatModule: typeof ChatModule,
    Command: typeof Command,
    Config: typeof Config,
    Filter: typeof Filter,
    Got: typeof Got,
    Reminder: typeof Reminder,
    Platform: typeof Platform,
    User: typeof User,

    Cache: InstanceType<typeof CacheSingleton>,
    CooldownManager: InstanceType<typeof CooldownManagerSingleton>,
    LocalRequest: InstanceType<typeof LocalRequestSingleton>,
    Logger: InstanceType<typeof LoggerSingleton>,
    Pastebin: InstanceType<typeof PastebinSingleton>,
    Query: InstanceType<typeof QuerySingleton>,
    Sandbox: InstanceType<typeof SandboxSingleton>,
    Utils: InstanceType<typeof UtilsSingleton>,
    VideoLANConnector: InstanceType<typeof VLCSingleton>
};

// declare type ModuleName = keyof GlobalSbObject;
declare type ModuleFilePath = "classes/afk"
    | "classes/banphrase"
    | "classes/channel"
    | "classes/chat-module"
    | "classes/command"
    | "classes/config"
    | "classes/cron"
    | "classes/filter"
    | "classes/got"
    | "classes/platform"
    | "classes/reminder"
    | "classes/user"
    | "objects/date"
    | "objects/error"
    | "objects/errors"
    | "objects/promise"
    | "objects/url-params"
    | "singletons/cache"
    | "singletons/cooldown-manager"
    | "singletons/local-request"
    | "singletons/logger"
    | "singletons/pastebin"
    | "singletons/query"
    | "singletons/runtime"
    | "singletons/sandbox"
    | "singletons/system-log"
    | "singletons/twitter"
    | "singletons/utils"
    | "singletons/vlc-connector";

declare type OptionsObject = {
    blacklist: ModuleFilePath[];
    whitelist: ModuleFilePath[];
    skipData: ModuleFilePath[];
};

export function initialize (options: OptionsObject): Promise<GlobalSbObject>;
