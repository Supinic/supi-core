import { ClassTemplate } from "./template";
import { User } from "./user";

import { CronJob } from "cron";
import { SimpleGenericData } from "../globals";

declare type ConstructorData = {
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

/**
 * Represents a function that's executed every some time, based on its cron-expression.
 */
export declare class Cron extends ClassTemplate {
	static get (identifier: Like): Cron | null;
	static destroy (): void;
	static get types (): Type[];

	/**
	 * Unique cron name
	 */
	readonly Name: User["ID"];

	/**
	 * Cron expression that specifies when a job is being executed
	 */
	readonly Expression: CronExpression;

	/**
	 * Determines whether or not, and by how much a cron job should be randomly postponed by.
	 */
	readonly Defer: Defer;

	/**
	 * Execution function of the cron job
	 */
	readonly Code: () => void;

	/**
	 * Wrapper for any sort of custom data usable by the cron instance.
	 */
	readonly data: SimpleGenericData;

	/**
	 * If disabled, the cron is paused in its current state and cannot be started.
	 */
	readonly #disabled: boolean;

	/**
	 * The cron job from the module "cron" itself.
	 */
	job: unknown | null;

	/**
	 * Represents the cron instance's status - whether started or not.
	 */
	started: boolean;

	get disabled (): boolean;

	constructor (data: ConstructorData);

	/**
	 * Starts the cron job.
	 */
	start (): Cron;

	/**
	 * Stops the cron job.
	 */
	stop (): Cron;

	/**
	 * Cleans up, stopping and destroying the cron job.
	 */
	destroy (): void;
}
