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
    errors,
    Promise: typeof CustomPromise,
    URLParams: URLParams,

    AwayFromKeyboard: AwayFromKeyboard,
    Banphrase: Banphrase,
    Channel: Channel,
    ChatModule: ChatModule,
    Command: Command,
    Config: Config,
    Filter: Filter,
    Got: typeof Got,
    Reminder: Reminder,
    Platform: Platform,
    User: User,

    Cache: InstanceType<typeof CacheSingleton>,
    CooldownManager: InstanceType<typeof CooldownManagerSingleton>,
    LocalRequest: InstanceType<typeof LocalRequestSingleton>,
    Logger: InstanceType<typeof LoggerSingleton>,
    Pastebin: InstanceType<typeof QuerySingleton>,
    Query: InstanceType<typeof QuerySingleton>,
    Sandbox: InstanceType<typeof SandboxSingleton>,
    Utils: InstanceType<typeof UtilsSingleton>,
    VideoLANConnector: InstanceType<typeof VLCSingleton>
};

export declare namespace sb {
    const Cache: InstanceType<typeof CacheSingleton>;
    const CooldownManager: InstanceType<typeof CooldownManagerSingleton>;
    const LocalRequest: InstanceType<typeof LocalRequestSingleton>;
    const Logger: InstanceType<typeof LoggerSingleton>;
    const Pastebin: InstanceType<typeof PastebinSingleton>;
    const Query: InstanceType<typeof QuerySingleton>;
    const Sandbox: InstanceType<typeof SandboxSingleton>;
    const Utils: InstanceType<typeof UtilsSingleton>;
    const VideoLANConnector: InstanceType<typeof VLCSingleton>;

    export {
        CustomDate,
        CustomError,
        errors,
        CustomPromise,
        URLParams,

        AwayFromKeyboard,
        Banphrase,
        Channel,
        ChatModule,
        Command,
        Config,
        Filter,
        Got,
        Reminder,
        Platform,
        User,

        Cache,
        CooldownManager,
        LocalRequest,
        Logger,
        Pastebin,
        Query,
        Sandbox,
        Utils,
        VideoLANConnector
    };
}
