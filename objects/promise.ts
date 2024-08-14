export declare type Handler<T> = (
	resolve: (value: T) => void,
	reject: (reason?: Error) => void
) => void;

export default class SupiPromise<T> extends global.Promise<T> {
	#resolve: (value: T) => void;
	#reject: (reason?: Error) => void;

	constructor (handler: Handler<T>) {
		let instanceResolve;
		let instanceReject;

		super((resolve, reject) => {
			if (handler) {
				handler(resolve, reject);
			}

			instanceResolve = resolve;
			instanceReject = reject;
		});

		// @ts-expect-error Instance resolve function is always defined.
		this.#resolve = instanceResolve;
		// @ts-expect-error Instance reject function is always defined.
		this.#reject = instanceReject;
	}

	resolve (value: T): SupiPromise<T> {
		this.#resolve(value);
		return this;
	}

	reject (value: Error): SupiPromise<T> {
		this.#reject(value);
		return this;
	}
}