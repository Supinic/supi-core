import { Emote, JSONifiable, Message } from "../globals";
import { ClassTemplate } from "./template";
import { Channel, MessageAwaiter } from "./channel";
import { User } from "./user";

// @todo
type Controller = any;
type Client = any;
type ConstructorOptions = any;
type UserMessageOptions = unknown;
type LoggingOptions = unknown;
type PrepareMessageOptions = unknown;

declare type UserMessageAwaiterMap = Map<User, MessageAwaiter["Resolution"]>;

export declare type Like = number | string | Platform;
export declare type AvailableEmoteOptions = {
	returnEmoteObject?: boolean;
	filter?: typeof Array.prototype.filter; // @todo: specify filter to Emote somehow?
};

export declare class Platform extends ClassTemplate {
	static assignControllers (controllers: Record<string, Controller>): void;
	static get (identifier: Like, host?: string): Platform | null;

	private readonly controller: Controller;
	private readonly userMessagePromises: Map<Channel, UserMessageAwaiterMap>;
	readonly ID: number;
	readonly Name: string;
	readonly Host: string | null;
	readonly Message_Limit: number;
	readonly Self_Name: string | null;
	readonly Self_ID: string | null;
	readonly Mirror_Identifier: string | null;
	readonly Logging: LoggingOptions;
	readonly Defaults: Record<string, JSONifiable>;
	readonly Data: Partial<Platform["Defaults"]>;

	constructor (data: ConstructorOptions);

	isUserChannelOwner (channelData: Channel, userData: User): Promise<boolean | null>;
	send (message: string, channel: string): Promise<void>;
	pm (message: string, user: string, channelData?: Channel): Promise<void>;
	waitForUserMessage (channelData: Channel, userData: User, options: UserMessageOptions): Promise<MessageAwaiter["Resolution"]>;
	fetchChannelUserList (channelData: Channel): Promise<string[]>;
	fetchGlobalEmotes (): Promise<Emote[]>;
	invalidateGlobalEmotesCache (): Promise<void>;
	fetchChannelEmotes (channelData: Channel): Promise<Emote[]>;
	getBestAvailableEmote (channelData: Channel, emotes: string[], fallbackEmote: string, options: AvailableEmoteOptions): Promise<string | Emote>;
	prepareMessage (message: Message, channel: string, options: PrepareMessageOptions): Promise<string>;
	getFullName (separator: string): string;
	getCacheKey (): string;

	get capital (): string;
	get privateMessageLoggingTableName (): string;
	get client (): Client;
}
