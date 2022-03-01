import { JSONifiable, SimpleGenericData } from "../globals";

export namespace errors {
	class GenericRequestError extends CustomError {
		constructor (obj?: {
			message: string;
			statusCode: number | null;
			statusMessage: string | null;
			hostname: string | null;
			args?: JSONifiable;
		});
	}
	class NotImplementedError extends CustomError {
		constructor (obj?: {
			args?: JSONifiable;
		});

		get message (): "Not implemented";
	}
}

export declare class CustomError extends Error {
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

	get message (): string;
	get simpleMessage (): string;
	get args (): SimpleGenericData;
	get timestamp (): number;
	get date (): Date;
}
