import { Emote, Message } from "../globals";
import { ClassTemplate } from "./template";
import { APIType as BanphraseAPIType, DowntimeBehaviour as BanphraseDowntimeBehaviour } from "./banphrase";
import { Platform, Like as PlatformLike, AvailableEmoteOptions, PrepareMessageOptions } from "./platform";
import { User } from "./user";
import * as EventEmitter from "events";

// @todo
type ConstructorData = object;
type StreamData = unknown;
type Controller = any;

export declare interface MessageAwaiter {
    Wrapper: {
        timeout: number,
        promise: MessageAwaiter["Resolution"]
    };
    Resolution: {
        message: Message;
    };
    Options: object; // @todo
}
export declare type Mode = "Inactive" | "Last seen" | "Read" | "Write" | "VIP" | "Moderator";
export declare type Like = string | number | Channel;

declare type MirrorOptions = {
    commandUsed: boolean;
};

export declare class Channel extends ClassTemplate {
    static readonly redisPrefix: string;
    static get (identifier: Like, platform?: PlatformLike): Channel;
    static getJoinableForPlatform (platform: PlatformLike): Channel[];
    static add (name: string, platformData: Platform, mode: Mode, specificID: string): Promise<Channel>;
    static normalizeName (username: string): string;

    readonly ID: number;
    readonly Name: string;
    readonly Platform: Platform;
    readonly Specific_ID: string | null;
    readonly Mode: Mode;
    readonly Mention: boolean;
    readonly Links_Allowed: boolean;
    readonly Banphrase_API_Type: BanphraseAPIType | null;
    readonly Banphrase_API_Downtime: BanphraseDowntimeBehaviour | null;
    readonly Message_Limit: number | null;
    readonly NSFW: boolean;
    readonly Mirror: Channel["ID"] | null;
    readonly Description: string | null;
    readonly Data: object;
    readonly sessionData: object;
    readonly events: EventEmitter;

    constructor (data: ConstructorData);

    setup (): Promise<boolean>;
    waitForUserMessage (userID: number, options: MessageAwaiter["Options"]): MessageAwaiter["Resolution"];
    getDatabaseName (): string;
    getFullName (): string;
    isUserChannelOwner (userData: User): Promise<boolean | null>;
    isUserAmbassador (userData: User): Promise<boolean | null>;
    send (message: Message): Promise<unknown>; // @todo
    getStreamData (): Promise<StreamData | {}>;
    setStreamData (data: any): ReturnType<ClassTemplate["setCacheData"]>;
    saveProperty (property: string, value: any): ReturnType<ClassTemplate["saveRowProperty"]>;
    toggleAmbassador (userData: User): ReturnType<Channel["saveProperty"]>;
    mirror (message: Message, userData: User, options?: MirrorOptions): ReturnType<Controller["mirror"]>;
    fetchUserList (): ReturnType<Platform["fetchChannelUserList"]>;
    fetchEmotes (): Promise<Emote[]>;
    invalidateEmotesCache (): ReturnType<ClassTemplate["setCacheData"]>;
    getBestAvailableEmote (emotes: string[], fallbackEmote: string, options: AvailableEmoteOptions): Promise<string|Emote>;
    prepareMessage (message: Message, options: PrepareMessageOptions): ReturnType<Platform["prepareMessage"]>;
    getCacheKey (): string;

    serialize (): Promise<never>;
}
