declare type Handler<T> = (
	resolve: (value: T) => void,
	reject: (reason?: any) => void
) => void;

/**
 * Custom Promise wrapper.
 * Allows resolution/rejection from outside the Promise's context.
 */
export declare class SupiPromise<T> extends Promise<T> {
	#resolve;
	#reject;

	constructor (handler: Handler<T>);

	resolve (value: any): SupiPromise<T>;
	reject (value: any): SupiPromise<T>;
}
