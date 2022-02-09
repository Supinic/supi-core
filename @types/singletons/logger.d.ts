import { SingletonTemplate as Template } from "./template";
import { CustomDate as Date } from "../objects/date";
import { Message, JSONifiable } from "../globals";
import { Channel } from "../classes/channel";
import { Command } from "../classes/command";
import { Platform } from "../classes/platform";
import { User, Like as UserLike } from "../classes/user";

// @todo
declare type CustomError = unknown;

declare type HasID = { ID: number };
declare type Tag = string; // @todo
declare type Type = string; // @todo
declare type VideoType = string;
declare type LastSeenOptions = {
    channelData: Channel,
    message: Message,
    userData: User
};
declare type CommandExecutionOptions = {
    Executed: Date;
    User_Alias: User["ID"];
    Command: Command["Name"];
    Platform: Platform["ID"];
    Channel: Channel["ID"];
    Success: boolean;
    Invocation: string;
    Arguments: string[] | null;
    Result: string | null;
    Execution_Time: number;
};
declare type ErrorLogData = {
    origin?: string;
    message?: string;
    stack?: string;
    context?: JSONifiable;
    arguments?: string[] | null;
};

export declare class LoggerSingleton implements Template {
    static module: LoggerSingleton;
    static singleton (): LoggerSingleton;

    constructor ();

    log (tag: Tag, description?: string | null, channel?: HasID | null, user?: HasID | null ): Promise<void>;
    logError (type: Type, error: Error | CustomError, data: ErrorLogData): Promise<number>;
    push (message: Message, userData: User, channelData: Channel, platformData?: Platform): Promise<void>;
    logVideoRequest (link: string, typeIdentifier: VideoType, length: number, userData: User, channelData: Channel): Promise<void>;
    logBan (identifier: UserLike, channelData: Channel, length: number, date: Date, notes?: string | null): void;
    logCommandExecution (options: CommandExecutionOptions): void;
    updateLastSeen (options: LastSeenOptions): Promise<void>;
    destroy (): void;

    get modulePath (): "logger";
}
