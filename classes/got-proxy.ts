import * as gotModule from "got";
import SupiError from "../objects/error.js";

const nameSymbol: unique symbol = Symbol.for("name");
const gotRequestErrors = [
	gotModule.CancelError,
	gotModule.HTTPError,
	gotModule.RequestError,
	gotModule.TimeoutError
];

// Replace out all occurrences of the "up one level" string - "../"
// Also if they are followed with another one, like so: "../.."
// Same thing applies for "%2E" - the escaped version of "."; and for backslash used instead of forward slash.
const sanitize = (string: string) => string
	.replaceAll(/\.\.[/\\]?/g, "")
	.replaceAll(/%2E%2E[/\\]?/g, "");

type ExtendedGotInstance = gotModule.Got & {
	[nameSymbol]: string;
}

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
type GotInstanceDefinition = GotInstanceFunctionDefinition | GotInstanceObjectDefinition;

type GqlRequestOptions = {
	query?: string;
	token?: string;
	variables?: string;
	headers?: Record<string, string>;
};

class StaticGot {
	static data: ExtendedGotInstance[];

	static get (identifier: string) {
		return StaticGot.data.find(i => i[nameSymbol] === identifier) ?? null;
	}

	static async importData (definitions: GotInstanceDefinition[]) {
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

	static async importSpecific (...definitions: GotInstanceDefinition[]) {
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

		return gotModule.got({ ...gqlOptions, ...options });
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
}

type ProxyApplyArgument = [string] | [string, string] | [string, Partial<gotModule.Options>];

interface CallableGot extends StaticGot {
	(url: string): ReturnType<gotModule.Got>;
	(instance: string): ReturnType<gotModule.Got>;
	(instance: string, options: Partial<gotModule.Options>): ReturnType<gotModule.Got>;

	get: typeof StaticGot.get;
	gql: typeof StaticGot.gql;
	importData: typeof StaticGot.importData;
	importSpecific: typeof StaticGot.importSpecific;
	isRequestError: typeof StaticGot.isRequestError;

	stream: typeof gotModule.got.stream;
	RequestError: typeof gotModule.RequestError;
	TimeoutError: typeof gotModule.TimeoutError;
}

const GotProxy: CallableGot = new Proxy<CallableGot>(<unknown>StaticGot as CallableGot, {
	apply: function (target, thisArg, args: ProxyApplyArgument) {
		let url: string | null = null;
		const instance: ExtendedGotInstance | null = StaticGot.get(args[0]);
		if (!instance) {
			url = args[0];
		}

		let options: Partial<gotModule.Options> | null = null;
		if (typeof args[1] === "string") {
			if (url) {
				throw new SupiError({
					message: "Invalid definition - potential duplicate URL argument used",
					args: { args }
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
				args: { args }
			});
		}
	},
	get: function (target, property: string) {
		switch (property) {
			case "get": return StaticGot.get;
			case "gql": return StaticGot.gql;
			case "importData": return StaticGot.importData;
			case "importSpecific": return StaticGot.importSpecific;
			case "isRequestError": return StaticGot.isRequestError;
			case "stream": return gotModule.got.stream;
			case "RequestError": return gotModule.RequestError;
			case "TimeoutError": return gotModule.TimeoutError;
		}
	}
});

export default GotProxy;
