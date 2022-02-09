import { ClassTemplate } from "./template";
import { Channel } from "./channel";
import { Command } from "./command";
import { Platform } from "./platform";
import { Row } from "../singletons/query";
import { User } from "./user";

// @todo
type FilterOptions = unknown;
type ConstructorData = any;
type UnpingFilterOptions = FilterOptions & {
	string: string
};

// @todo
export declare type ArgumentsData = object;
export declare type CooldownData = {
	multiplier: number;
	override: number;
};

export declare type Like = number | Filter;
export declare type Response = "None" | "Auto" | "Reason";
export declare type Data = CooldownData | ArgumentsData;
export declare type FlagObject = object;
export declare type Type = "Blacklist" | "Whitelist"
	| "Opt-out" | "Block" | "Unping" | "Unmention" | "Cooldown" | "Flags"
	| "Offline-only" | "Online-only" | "Arguments" | "Reminder-prevention";

type ExecuteResult = {
	success: boolean;
};

export declare class Filter extends ClassTemplate {
	static get (identifier: Like): Filter | null;
	static getLocals (type: Type, options: FilterOptions): Filter[];
	static execute (options: FilterOptions): Promise<ExecuteResult>;
	static create (options: ConstructorData): Promise<Filter>;
	static getMentionStatus (options: FilterOptions): boolean;
	static applyUnping (options: UnpingFilterOptions): string;
	static getCooldownModifiers (options: FilterOptions): Filter | null;
	static getFlags (options: FilterOptions): FlagObject;
	static getReminderPreventions (options: FilterOptions): Filter["User_Alias"][];
	static getReason (options: FilterOptions): string | null;

	private filterData: Data;
	readonly ID: number;
	readonly User_Alias: User["ID"] | null;
	readonly Channel: Channel["ID"] | null;
	readonly Command: Command["Name"] | null;
	readonly Platform: Platform["Name"] | null;
	readonly Invocation: string | null;
	readonly Type: Type;
	readonly Data: Data;
	readonly Response: Response;
	readonly Reason: string | null;
	readonly Blocked_User: User["ID"] | null;
	readonly Active: boolean;
	readonly Issued_By: User["ID"] | null;

	constructor (data: ConstructorData);

	applyData (data: Data): boolean | number;
	createFilterData (data: Data): void;
	toggle (): ReturnType<Row["save"]>;
	setReason (reason: Filter["Reason"]): Promise<void>;

	get priority (): number;
}
