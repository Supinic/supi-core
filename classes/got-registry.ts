import got, { type Got, type OptionsInit as GotOptions, type RequestPromise, type Response, RequestError } from "got";
import type { JSONifiable } from "../singletons/query/index.js";

export type GotResponse<T = unknown> = Response<T>;
export type GotRequestOptions = Omit<GotOptions, "url" | "resolveBodyOnly"> & {
	url: string | URL;
	resolveBodyOnly?: false; // prohibit returning body only
};
export type GqlRequestOptions = Omit<GotRequestOptions, "body" | "form" | "json" | "method" | "responseType" | "resolveBodyOnly"> & {
	query: string;
	instance?: string;
	variables?: Record<string, JSONifiable>;
	token?: string;
};

type GotRegistryOptions = Omit<GotOptions, "url" | "resolveBodyOnly"> & {
	resolveBodyOnly?: false; // prohibit returning body only
};
export type GotRegistryInstanceDefinition = {
	name: string;
	parent: string | null;
	options: GotRegistryOptions | (() => GotRegistryOptions);
};

type TextGotRequestOptions = Omit<GotRequestOptions, "responseType"> & { responseType: "text"; };
type WrappedGot = {
	(options: TextGotRequestOptions): RequestPromise<GotResponse<string>>;
	<T = unknown>(options: GotRequestOptions): RequestPromise<GotResponse<T>>;
};
type RegisteredGot = { raw: Got; request: WrappedGot; };

const wrap = (instance: Got): WrappedGot => ({ url, ...options }: GotRequestOptions) => instance(url, options);
export const isGotRequestError = (input: unknown): input is RequestError => (input instanceof RequestError);

export class GotRegistry {
	private readonly instances = new Map<string, RegisteredGot>();

	public add (definition: GotRegistryInstanceDefinition): void {
		if (definition.name.length === 0) {
			throw new Error("Definition name string must not be empty");
		}

		if (this.instances.has(definition.name)) {
			throw new Error(`Got instance ${definition.name} already exists`);
		}

		const options = (typeof definition.options === "function") ? definition.options() : definition.options;
		const parent = (definition.parent !== null) ? this.getRaw(definition.parent) : got;
		const instance = parent.extend(options);

		this.instances.set(definition.name, {
			raw: instance,
			request: wrap(instance)
		});
	}

	public import (definitions: readonly GotRegistryInstanceDefinition[]): void {
		const definitionsByName = new Map<string, GotRegistryInstanceDefinition>();
		for (const definition of definitions) {
			const { name } = definition;
			if (definitionsByName.has(name) || this.instances.has(name)) {
				throw new Error(`Got instance "${name}" already exists`);
			}

			definitionsByName.set(name, definition);
		}

		for (const { name, parent } of definitions) {
			if (name.length === 0) {
				throw new Error(`Got registry instance name cannot be empty`);
			}
			if (parent !== null && !definitionsByName.has(parent) && !this.instances.has(parent)) {
				throw new Error(`Got registry instance "${name}" references unknown parent "${parent}"`);
			}
		}

		const available = new Set(this.instances.keys());
		const pending = new Set(definitionsByName.keys());
		const ordered: GotRegistryInstanceDefinition[] = [];

		while (pending.size > 0) {
			let resolved = 0;
			for (const name of pending) {
				const definition = definitionsByName.get(name);
				if (!definition) {
					throw new Error(`Assert error: Already added definition "${name}" not found`);
				}

				if (definition.parent === null || available.has(definition.parent)) {
					ordered.push(definition);
					available.add(name);
					pending.delete(name);
					resolved++;
				}
			}

			if (resolved === 0) {
				throw new Error(`Cannot resolve Got registry instance dependencies: ${[...pending].join(", ")}`);
			}
		}

		for (const definition of ordered) {
			this.add(definition);
		}
	}

	public get (name: string): WrappedGot {
		if (name.length === 0) {
			throw new Error("Passed string must not be empty");
		}

		const instance = this.instances.get(name);
		if (!instance) {
			throw new Error(`Unknown Got instance "${name}"`);
		}

		return instance.request;
	}

	public getRaw (name: string): Got {
		if (name.length === 0) {
			throw new Error("Passed string must not be empty");
		}

		const instance = this.instances.get(name);
		if (!instance) {
			throw new Error(`Unknown Got instance "${name}"`);
		}

		return instance.raw;
	}

	public gql (options: GqlRequestOptions): RequestPromise<GotResponse> {
		const { url, query, variables, token, headers, instance, ...rest } = options;
		const target = (instance) ? this.getRaw(instance) : got;

		return target(url, {
			...rest,
			method: "POST",
			responseType: "json",
			resolveBodyOnly: false,
			headers: (token)
				? { ...headers, authorization: `Bearer ${token}` }
				: headers,
			json: (variables)
				? { query, variables }
				: { query }
		});
	}

	public static fromDefinitions (definitions: readonly GotRegistryInstanceDefinition[]): GotRegistry {
		const instance = new GotRegistry();
		instance.import(definitions);
		return instance;
	}
}
