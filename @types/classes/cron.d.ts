import { ClassTemplate } from "./template";
import { User } from "./user";

import { CronJob } from "cron";
import { SimpleGenericData } from "../globals";

declare type Definition = {
	Name: string;
	Expression: CronExpression;
	Defer: Defer | (() => Defer) | string | null;
	Code: (() => void) | string;
};

export declare type CronExpression = string;
export declare type Defer = {
	start?: number;
	end: number;
};
export declare type Like = string | number | symbol | Cron;

/**
 * Represents a function that's executed every some time, based on its cron-expression.
 */
export declare class Cron extends ClassTemplate {
	/**
	 * Reloads a specific list of crons, provided as instances.
	 */
	static reloadSpecific (...list: Cron[]): Promise<boolean>;
	static get (identifier: Like): Cron | null;
	static destroy (): void;

	static importData (definitions: Definition[]): Promise<void>;
	static importSpecific (...definitions: Definition[]): Promise<void>;

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
	job: CronJob | null;

	/**
	 * Represents the cron instance's status - whether started or not.
	 */
	started: boolean;

	get disabled (): boolean;

	constructor (data: Definition);

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
