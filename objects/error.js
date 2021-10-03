/**
 * Custom error object. Receives an arguments object to provide more detailed error context.
 * @memberof sb
 */
module.exports = class Error extends globalThis.Error {
	#args;
	#timestamp;
	#messageDescriptor;

	constructor (obj = {}) {
		if (obj.constructor !== Object) {
			throw new globalThis.Error("sb.Error must receive an object as params");
		}
		if (typeof obj.message !== "string") {
			throw new globalThis.Error("sb.Error must receive a string message");
		}

		const { cause, message } = obj;
		super(message, { cause });

		if (obj.args) {
			this.#args = Object.freeze(obj.args);
		}

		this.name = obj.name ?? "sb.Error";
		this.#timestamp = Date.now();
		this.#messageDescriptor = Object.getOwnPropertyDescriptor(this, "message");

		Object.defineProperty(this, "message", {
			get: () => {
				const superMessage = (this.#messageDescriptor.get === "function")
					? this.#messageDescriptor.get()
					: this.#messageDescriptor.value;

				const parts = [superMessage];
				if (this.#args) {
					parts.push(`- arguments: ${JSON.stringify(this.#args)}`);
				}
				if (this.cause) {
					const causeMessage = `cause: ${this.cause.message ?? "(empty message)"}`;
					const tabbedMessage = causeMessage.trim().split("\n").map(i => `\t${i}`).join("\n");

					parts.push(tabbedMessage);
				}

				return parts.join("\n") + "\n";
			}
		});
	}

	get simpleMessage () {
		return (this.#messageDescriptor.get === "function")
			? this.#messageDescriptor.get()
			: this.#messageDescriptor.value;
	}

	get args () { return this.#args; }
	get timestamp () { return this.#timestamp; }
	get date () { return new Date(this.#timestamp); }
};
