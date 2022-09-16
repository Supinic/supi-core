declare type Handler<T> = (
	resolve: (value: T) => void,
	reject: (reason?: any) => void
) => void;

/**
 * Custom Promise wrapper.
 * Allows resolution/rejection from outside the Promise's context.
 */
export declare class CustomPromise<T> extends Promise<T> {
	#resolve;
	#reject;

	constructor (handler: Handler<T>);

	resolve (value: any): CustomPromise<T>;
	reject (value: any): CustomPromise<T>;
}
