import got, { type Got, type OptionsInit as GotOptions, type RequestPromise, type Response as GotResponse, RequestError } from "got";
export type { Response as GotResponse } from "got";

export type GotRequestOptions = Omit<GotOptions, "url"> & {
	url: string | URL;
};
export type GqlRequestOptions = Omit<GotRequestOptions, "body" | "form" | "json" | "method" | "responseType" | "resolveBodyOnly"> & {
	query: string;
	instance?: string;
	variables?: Record<string, unknown>;
	token?: string;
};

export type GotRegistryInstanceDefinition = {
	name: string;
	parent?: string;
	options: GotOptions | (() => GotOptions);
};

type WrappedGot = (options: GotRequestOptions) => ReturnType<Got>;
type RegisteredGot = {
	raw: Got;
	request: WrappedGot;
};


const wrap = (instance: Got): WrappedGot => ({ url, ...options }) => instance(url, options);

export const isGotRequestError = (input: unknown): input is RequestError => (input instanceof RequestError);

export class GotRegistry {
	private readonly instances = new Map<string, RegisteredGot>();

	get (name: string): WrappedGot {
		const instance = this.instances.get(name);
		if (!instance) {
			throw new Error(`Unknown Got instance "${name}"`);
		}

		return instance.request;
	}

	getRaw (name: string): Got {
		const instance = this.instances.get(name);
		if (!instance) {
			throw new Error(`Unknown Got instance "${name}"`);
		}

		return instance.raw;
	}

	gql (options: GqlRequestOptions): RequestPromise<GotResponse<unknown>> {
		const { url, query, variables, token, headers, instance, ...rest } = options;
		const target = (instance) ? this.getRaw(instance) : got;

		const json = (variables) ? { query, variables } : { query };
		return target(url, {
			...rest,
			method: "POST",
			responseType: "json",
			headers: (token)
				? { ...headers, Authorization: `Bearer ${token}` }
				: headers,
			json
		})
	}

	add (definition: GotRegistryInstanceDefinition): void {
		const options = (typeof definition.options === "function") ? definition.options() : definition.options;
		const parent = (definition.parent) ? this.getRaw(definition.parent) : got;

		const instance = parent.extend(options);
		this.instances.set(definition.name, {
			raw: instance,
			request: wrap(instance)
		});
	}
}
