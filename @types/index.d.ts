// objects
import { CustomDate as Date } from "./objects/date";
import { CustomError as Error, errors } from "./objects/error";
import { CustomPromise as Promise } from "./objects/promise";
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
import { CacheSingleton as Cache } from "./singletons/cache";
import { CooldownManagerSingleton as CooldownManager } from "./singletons/cooldown-manager";
import { LocalRequestSingleton as LocalRequest } from "./singletons/local-request";
import { LoggerSingleton as Logger } from "./singletons/logger";
import { PastebinSingleton as Pastebin } from "./singletons/pastebin";
import { QuerySingleton as Query } from "./singletons/query";
import { SandboxSingleton as Sandbox } from "./singletons/sandbox";
import { UtilsSingleton as Utils } from "./singletons/utils";
import { VLCSingleton as VideoLanConnector } from "./singletons/vlc-connector";

export declare namespace sb {
    export {
        Date,
        Error,
        errors,
        Promise,
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
        VideoLanConnector
    };
}
