import got, { type Got, type Response as GotResponse, type Options as GotOptions, HTTPError, TimeoutError, RequestError } from "got";

import SupiError from "../objects/error.js";
import type { JSONifiable } from "../singletons/query/index.js";
import type { GotStream } from "got";

export type { Response as GotResponse } from "got";

const nameSymbol: unique symbol = Symbol.for("name");

export const isGotRequestError = (input: unknown): input is RequestError => (input instanceof RequestError);

// Replace out all occurrences of the "up one level" string - "../"
// Also if they are followed with another one, like so: "../.."
// Same thing applies for "%2E" - the escaped version of "."; and for backslash used instead of forward slash.
const sanitize = (string: string) => string
	.replaceAll(/\.\.[/\\]?/g, "")
	.replaceAll(/%2E%2E[/\\]?/g, "");

type ExtendedGotInstance = Got & {
	[nameSymbol]: string;
};

type Options = GotOptions & {
	url: string;
};
type GotInstanceFunctionDefinition = {
	name: string;
	optionsType: "function";
	options: () => Partial<Options>;
	parent: string | null;
	description: string;
};
type GotInstanceObjectDefinition = {
	name: string;
	optionsType: "object";
	options: Partial<Options>;
	parent: string | null;
	description: string;
};
export type GotInstanceDefinition = GotInstanceFunctionDefinition | GotInstanceObjectDefinition;

type GqlRequestOptions = {
	url: string,
	query?: string;
	token?: string;
	throwHttpErrors?: boolean;
	variables?: Record<string, JSONifiable>;
	headers?: Record<string, string>;
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class StaticGot {
	static data: ExtendedGotInstance[];

	static get (identifier: string): ExtendedGotInstance;
	static get (identifier: string, nullOnNone: true): ExtendedGotInstance | null;
	static get (identifier: string, nullOnNone?: boolean) {
		const instance = StaticGot.data.find(i => i[nameSymbol] === identifier) ?? null;
		if (!instance && !nullOnNone) {
			throw new SupiError({
				message: "No proper instance name provided",
				args: { identifier }
			});
		}

		return instance;
	}

	static importData (definitions: GotInstanceDefinition[]): void {
		if (!Array.isArray(definitions)) {
			throw new SupiError({
				message: "Definitions must be provided as an array"
			});
		}

		const instanceParents = new Set(definitions.map(i => i.parent));
		const availableParents = new Set([null, ...definitions.map(i => i.name)]);
		for (const instanceParent of instanceParents) {
			if (!availableParents.has(instanceParent)) {
				throw new SupiError({
					message: "Instance parent is not defined",
					args: {
						requested: instanceParent,
						availableParents: [...availableParents]
					}
				});
			}
		}

		let count = 0;
		const result = [];
		const loadedParents = new Set();
		const loadedDefinitions = new Set();

		while (result.length < definitions.length) {
			const index = count % definitions.length;
			const definition = definitions[index % definitions.length];
			if (!loadedDefinitions.has(definition) && (definition.parent === null || loadedParents.has(definition.parent))) {
				const instance = StaticGot.#add(definition, result);
				result.push(instance);
				loadedParents.add(instance[nameSymbol]);
				loadedDefinitions.add(definition);
			}

			count++;
		}

		StaticGot.data = result;
	}

	static importSpecific (...definitions: GotInstanceDefinition[]): void {
		for (const definition of definitions) {
			const oldInstanceIndex = StaticGot.data.findIndex(i => i[nameSymbol] === definition.name);
			if (oldInstanceIndex !== -1) {
				StaticGot.data.splice(oldInstanceIndex, 1);
			}

			try {
				const newInstance = StaticGot.#add(definition, StaticGot.data);
				StaticGot.data.push(newInstance);
			}
			catch (e) {
				console.warn(`Could not initialize Got instance, skipping: ${definition.name}`, e);
			}
		}
	}

	static #add (definition: GotInstanceDefinition, parentDefinitions: ExtendedGotInstance[]) {
		const options = (definition.optionsType === "function")
			? definition.options()
			: definition.options;

		let gotInstance;
		if (definition.parent) {
			const parent = parentDefinitions.find(i => i[nameSymbol] === definition.parent);
			if (!parent) {
				throw new SupiError({
					message: "Requested parent instance does not exist",
					args: {
						requested: definition.parent,
						existing: parentDefinitions.map(i => i[nameSymbol])
					}
				});
			}

			gotInstance = parent.extend(options);
		}
		else {
			gotInstance = got.extend(options);
		}

		const extendedInstance: ExtendedGotInstance = Object.assign(gotInstance, {
			[nameSymbol]: definition.name
		});

		return extendedInstance;
	}

	static gql (gqlOptions: GqlRequestOptions) {
		if (!gqlOptions.query) {
			throw new SupiError({
				message: "Missing parameter query for GQL request",
				args: { gqlOptions }
			});
		}

		const options: Partial<Options> = {
			method: "POST",
			responseType: "json",
			throwHttpErrors: gqlOptions.throwHttpErrors ?? true,
			json: {
				query: gqlOptions.query
			}
		};

		delete gqlOptions.query;

		if (gqlOptions.token) {
			options.headers = (gqlOptions.headers) ? { ...gqlOptions.headers } : {};
			options.headers.Authorization = `Bearer ${gqlOptions.token}`;

			delete gqlOptions.headers;
			delete gqlOptions.token;
		}

		if (gqlOptions.variables) {
			// @ts-expect-error `options.json` is defined and not `unknown` here
			options.json.variables = gqlOptions.variables;

			delete gqlOptions.variables;
		}

		return got({ ...gqlOptions, ...options }) as Promise<GotResponse>;
	}

	static sanitize (strings: string[], ...values: string[]): string {
		const result = [];
		for (let i = 0; i < strings.length; i++) {
			result.push(strings[i]);

			if (typeof values[i] === "string") {
				result.push(sanitize(values[i]));
			}
		}

		return result.join("").trim();
	}

	static isRequestError (error: unknown): boolean {
		const gotRequestErrors = [HTTPError, RequestError, TimeoutError];
		return gotRequestErrors.some(GotError => error instanceof GotError);
	}

	static get stream (): GotStream { return got.stream; }
	static get RequestError (): typeof RequestError { return RequestError; }
	static get TimeoutError (): typeof TimeoutError { return TimeoutError; }
}

type ProxyApplyArgument = [string] | [string, string] | [string, Partial<Options>];

type CallableGot = typeof StaticGot & {
	<T = string>(urlOrInstanceName: string, options: Partial<Options>): GotResponse<T>;
};

export const GotProxy = new Proxy(StaticGot, {
	apply: function (target, thisArg, args: ProxyApplyArgument) {
		let url: string | null = null;
		const instance = StaticGot.get(args[0], true);
		if (!instance) {
			url = args[0];
		}

		let options: Partial<Options> | null = null;
		if (typeof args[1] === "string") {
			if (url) {
				throw new SupiError({
					message: "Invalid definition - potential duplicate URL argument used",
					args: { url, options }
				});
			}

			url = args[1];
		}
		else if (typeof args[1] === "object") {
			options = args[1];
		}

		if (options && options.url && !url) {
			url = options.url;
			delete options.url;
		}
		if (url) {
			url = sanitize(url);
		}

		if (!url) {
			throw new SupiError({
				message: "No URL provided"
			});
		}

		if (options) {
			return (instance) ? instance(url, options) : got(url, options);
		}
		else {
			return (instance) ? instance(url) : got(url);
		}
	}
}) as unknown as CallableGot;
// Using `unknown` first because of Proxy not being sufficiently typed - we know the `apply` trap allows
// calling the result as a function, but the Proxy constructor cannot infer that.
