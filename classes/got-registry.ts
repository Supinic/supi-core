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
	parent?: string;
	options: GotRegistryOptions | (() => GotRegistryOptions);
};

type WrappedGot = (options: GotRequestOptions) => RequestPromise<GotResponse>;
type RegisteredGot = {
	raw: Got;
	request: WrappedGot;
};

const wrap = (instance: Got): WrappedGot => ({ url, ...options }) => instance(url, options);

export const isGotRequestError = (input: unknown): input is RequestError => (input instanceof RequestError);

export class GotRegistry {
	private readonly instances = new Map<string, RegisteredGot>();

	public get (name: string): WrappedGot {
		const instance = this.instances.get(name);
		if (!instance) {
			throw new Error(`Unknown Got instance "${name}"`);
		}

		return instance.request;
	}

	private getRaw (name: string): Got {
		const instance = this.instances.get(name);
		if (!instance) {
			throw new Error(`Unknown Got instance "${name}"`);
		}

		return instance.raw;
	}

	public gql (options: GqlRequestOptions): RequestPromise<GotResponse<unknown>> {
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
		})
	}

	public add (definition: GotRegistryInstanceDefinition): void {
		if (this.instances.has(definition.name)) {
			throw new Error(`Got instance ${definition.name} already exists`);
		}

		const options = (typeof definition.options === "function") ? definition.options() : definition.options;
		const parent = (definition.parent) ? this.getRaw(definition.parent) : got;
		const instance = parent.extend(options);

		this.instances.set(definition.name, {
			raw: instance,
			request: wrap(instance)
		});
	}
}
