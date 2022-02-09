import { ClassTemplate } from "./template";
import { CustomDate as Date } from "../objects/date";
import { User } from "./user";

import { CronJob } from "cron";
import { SimpleGenericData } from "../globals";

declare type ConstructorData = {
	ID?: number;
	Name: string;
	Expression: CronExpression;
	Type: Type,
	Defer: Defer | (() => Defer) | string | null;
	Code: (() => void) | string;
};

export declare type CronExpression = string;
export declare type Defer = {
	start?: number;
	end: number;
};
export declare type Like = string | number | symbol | Cron;
export declare type Status = string;
export declare type Type = "Bot" | "Website" | "All";

export declare class Cron extends ClassTemplate {
	static Job: CronJob;
	static get (identifier: Like): Cron | null;
	static destroy (): void;
	static get types (): Type[];

	readonly ID: number | symbol;
	readonly Name: User["ID"];
	readonly Expression: Date;
	readonly Defer: Defer;
	readonly Code: () => void;
	readonly data: SimpleGenericData;
	readonly #disabled: boolean;
	job: unknown | null;

	get disabled (): boolean;

	constructor (data: ConstructorData);

	start (): Cron;
	stop (): Cron;
	destroy (): void;
}
