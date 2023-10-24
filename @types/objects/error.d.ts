import type { JSONifiable, SimpleGenericData } from "../globals.d.ts";

/**
 * Custom error object. Receives an arguments object to provide more detailed error context.
 */
export declare class SupiError extends Error {
	readonly #args: SimpleGenericData;
	readonly #timestamp: number;
	readonly #messageDescriptor: PropertyDescriptor;
	readonly name: string;

	constructor (obj?: {
		message: string;
		cause?: string;
		name?: string;
		args?: JSONifiable;
	});

	/**
	 * Returns a full message containing all the "sub-errors" stacks.
	 */
	get message (): string;

	/**
	 * Returns a simplified message, only the current error's message will be considered.
	 */
	get simpleMessage (): string;

	/**
	 * Arguments passed in to the error constructor as { args }
	 */
	get args (): SimpleGenericData;

	/**
	 * Datetime of the error creation as Unix timestamp.
	 */
	get timestamp (): number;

	/**
	 * Datetime of the error creation as a Date object.
	 */
	get date (): Date;

	/**
	 * Provides the interface for "generic API request" errors
	 */
	static get GenericRequest (): GenericRequestError;
}

export declare class GenericRequestError extends SupiError {
	constructor (obj?: {
		message: string;
		statusCode: number | null;
		statusMessage: string | null;
		hostname: string | null;
		args?: JSONifiable;
	});
}
