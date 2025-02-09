import type SupiDate from "./date.js";

type SimpleArgument = null | undefined | bigint | SupiDate | boolean | number | string | { [P: string]: SimpleArgument } | SimpleArgument[];
type ErrorOptions = {
	message: string;
	name?: string;
	cause?: Error | SupiError;
	args?: Record<string, SimpleArgument>;
};
type RequestErrorOptions = ErrorOptions & {
	statusCode?: number;
	statusMessage?: string;
	hostname?: string;
};

export class SupiError extends globalThis.Error {
	readonly #args: Record<string, SimpleArgument>;
	readonly #timestamp: number;
	readonly #messageDescriptor: PropertyDescriptor;
	readonly #cause: SupiError | Error | null;

	constructor (obj: ErrorOptions) {
		const { args, cause, message, name } = obj;

		super(message, { cause });

		this.#args = args ?? {};
		this.#cause = cause ?? null;
		this.name = name ?? "sb.Error";
		this.#timestamp = Date.now();

		const messageDescriptor = Object.getOwnPropertyDescriptor(this, "message");
		if (!messageDescriptor) {
			throw new globalThis.Error("Message descriptor must be defined");
		}

		this.#messageDescriptor = messageDescriptor;

		Object.defineProperty(this, "message", {
			get: () => {
				const superMessage = (typeof this.#messageDescriptor.get === "function")
					? this.#messageDescriptor.get() as string
					: this.#messageDescriptor.value as string;

				const parts = [superMessage];
				if (this.#args) {
					parts.push(`- arguments: ${JSON.stringify(this.#args)}`);
				}

				if (this.#cause) {
					const causeMessage = `cause: ${this.#cause.message ?? "(empty message)"} ${this.#cause.stack ?? "(no stack)"}`;
					const tabbedMessage = causeMessage
						.trim()
						.split("\n")
						.map(i => `\t${i}`)
						.join("\n");

					parts.push(tabbedMessage);
				}

				return `${parts.join("\n")}\n`;
			}
		});
	}

	get simpleMessage () {
		return (typeof this.#messageDescriptor.get === "function")
			? this.#messageDescriptor.get() as string
			: this.#messageDescriptor.value as string;
	}

	get args () { return this.#args; }
	get timestamp () { return this.#timestamp; }
	get date () { return new Date(this.#timestamp); }
}

export class GenericRequestError extends SupiError {
	constructor (object: RequestErrorOptions) {
		super({
			message: object.message,
			name: "GenericRequestError",
			args: {
				...(object.args ?? {}),
				statusCode: object.statusCode ?? null,
				statusMessage: object.statusMessage ?? null,
				hostname: object.hostname ?? null
			}
		});
	}

	static get name () {
		return "GenericRequestError" as const;
	}
}

export const isSupiError = (input: unknown): input is SupiError => (input instanceof SupiError);
export const isGenericRequestError = (input: unknown): input is GenericRequestError => (input instanceof GenericRequestError);

export default SupiError;
