export declare type Handler<T> = (
	resolve: (value: T) => void,
	reject: (reason?: any) => void
) => void;

export default class SupiPromise<T> extends global.Promise<T> {
	#resolve: any;
	#reject: any;

	constructor (handler: Handler<T>) {
		let instanceResolve = null;
		let instanceReject = null;

		super((resolve, reject) => {
			if (handler) {
				handler(resolve, reject);
			}

			instanceResolve = resolve;
			instanceReject = reject;
		});

		this.#resolve = instanceResolve;
		this.#reject = instanceReject;
	}

	resolve (value: any): SupiPromise<T> {
		this.#resolve(value);
		return this;
	}

	reject (value: any): SupiPromise<T> {
		this.#reject(value);
		return this;
	}
}
