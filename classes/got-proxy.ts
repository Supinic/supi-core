import * as gotModule from "got";
import SupiError from "../objects/error.js";

export { Response as GotResponse } from "got";

const nameSymbol: unique symbol = Symbol.for("name");
const gotRequestErrors = [
	gotModule.CancelError,
	gotModule.HTTPError,
	gotModule.RequestError,
	gotModule.TimeoutError
];

export const isGotRequestError = (input: unknown): input is gotModule.RequestError => (input instanceof gotModule.RequestError);

// Replace out all occurrences of the "up one level" string - "../"
// Also if they are followed with another one, like so: "../.."
// Same thing applies for "%2E" - the escaped version of "."; and for backslash used instead of forward slash.
const sanitize = (string: string) => string
	.replaceAll(/\.\.[/\\]?/g, "")
	.replaceAll(/%2E%2E[/\\]?/g, "");

type ExtendedGotInstance = gotModule.Got & {
	[nameSymbol]: string;
};

type GotInstanceFunctionDefinition = {
	name: string;
	optionsType: "function";
	options: () => Partial<gotModule.Options>;
	parent: string | null;
	description: string;
}
type GotInstanceObjectDefinition = {
	name: string;
	optionsType: "object";
	options: Partial<gotModule.Options>;
	parent: string | null;
	description: string;
}
export type GotInstanceDefinition = GotInstanceFunctionDefinition | GotInstanceObjectDefinition;

type GqlRequestOptions = {
	url: string,
	query?: string;
	token?: string;
	variables?: string;
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

	static importData (definitions: GotInstanceDefinition[]) {
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

	static importSpecific (...definitions: GotInstanceDefinition[]) {
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
			gotInstance = gotModule.got.extend(options);
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

		const options: Partial<gotModule.Options> = {
			method: "POST",
			responseType: "json",
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

		return gotModule.got({ ...gqlOptions, ...options }) as Promise<gotModule.Response>;
	}

	static sanitize (strings: string[], ...values: string[]) {
		const result = [];
		for (let i = 0; i < strings.length; i++) {
			result.push(strings[i]);

			if (typeof values[i] === "string") {
				result.push(sanitize(values[i]));
			}
		}

		return result.join("").trim();
	}

	static isRequestError (error: unknown) {
		return gotRequestErrors.some(GotError => error instanceof GotError);
	}

	static get stream () { return gotModule.got.stream; }
	static get RequestError () { return gotModule.RequestError; }
	static get TimeoutError () { return gotModule.TimeoutError; }
}

type ProxyApplyArgument = [string] | [string, string] | [string, Partial<gotModule.Options>];

type CallableGot = typeof StaticGot & {
	<T = string>(urlOrInstanceName: string, options: Partial<gotModule.Options>): gotModule.Response<T>;
};

export const GotProxy = new Proxy(StaticGot, {
	apply: function (target, thisArg, args: ProxyApplyArgument) {
		let url: string | null = null;
		const instance = StaticGot.get(args[0], true);
		if (!instance) {
			url = args[0];
		}

		let options: Partial<gotModule.Options> | null = null;
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

		if (url) {
			url = sanitize(url);
		}
		if (options && url) {
			options.url = url;
		}

		if (options) {
			return (instance)
				? instance(options)
				: gotModule.got(options);
		}
		else if (url) {
			return (instance)
				? instance(url)
				: gotModule.got(url);
		}
		else {
			throw new SupiError({
				message: "Invalid combination of arguments",
				args: { url, options }
			});
		}
	}
}) as unknown as CallableGot;
// Using `unknown` first because of Proxy not being sufficiently typed - we know the `apply` trap allows
// calling the result as a function, but the Proxy constructor cannot infer that.
