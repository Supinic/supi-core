import { ClassTemplate } from "./template";
import { Channel, Like as ChannelLike } from "./channel";
import { Like as PlatformLike } from "./platform";
import { User } from "./user";
import { Message, XOR } from "../globals";

declare type ConstructorData = {
	ID?: number
	Name: string;
	Events: string | Array<string>; // JSON-compliant Array<string> or Array<string> directly
	Active?: boolean;
	Code: string; // string that can be eval() and results in a function
};
declare type CreateData = ConstructorData & {
	Global?: boolean;
	Channel: Array<ChannelLike>;
	Platform?: PlatformLike;
};
declare type PlatformOption = {
	platform: PlatformLike | Array<PlatformLike>;
}
declare type ChannelOption = {
	channel: ChannelLike | Array<ChannelLike>;
}
declare type AttachOptions = XOR<PlatformOption, ChannelOption>;
declare type DetachOptions = AttachOptions & {
	remove: boolean;
};

export declare type Argument = object;
export declare type AttachmentReference = {
	channelID: Channel["ID"];
	active: boolean;
	listener: (context: Context, ...args: Array<Argument>) => void;
};
export declare type Context = {
	channel: Channel;
	data: ContextData;
	event: Event;
	message: Message | null;
	specificArguments: Array<Argument>;
	user: User | null;
};
export declare type ContextData = object;
export declare type Descriptor = {
	ID: number;
	Name: string;
	Events: Array<Event>;
	Active: boolean;
	Code: string;
	Args: string | null;
	Channel_ID: Channel["ID"];
	Module_ID: ChatModule["ID"];
};
export declare type Event = "message" | "online" | "offline" | "raid" | "subscription";
export declare type Like = number | string | ChatModule;

export declare class ChatModule extends ClassTemplate {
	static readonly data: Array<ChatModule>;

	static #fetch (specificNames: string | Array<string>): Promise<Array<Descriptor>>;
	static #create (row: CreateData): ChatModule;
	static get (identifier: Like): ChatModule | null;
	static getTargets (options: AttachOptions): Array<Channel>;
	static getChannelModules (channel: ChannelLike): Array<ChatModule>;
	static attachChannelModules (channel: ChannelLike): void;
	static detachChannelModules (channel: ChannelLike, options: DetachOptions): void;
	static reloadChannelModules (channel: ChannelLike): Promise<void>;
	static parseModuleArgs (rawArgs: string): Array<Argument>;
	static destroy (): void;

	readonly ID: number | symbol;
	readonly Name: string;
	readonly Events: Array<Event>;
	readonly Active: boolean;
	readonly Code: (any) => any;
	readonly attachmentReferences: Array<AttachmentReference>;
	readonly data: object;

	constructor (data: ConstructorData);

	attach (options: AttachOptions): void;
	detach (options: DetachOptions): void;
	detachAll (hard?: boolean): void;
	destroy (): void;
}
