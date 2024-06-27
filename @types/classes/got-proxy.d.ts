import { ExtendOptions, Got, InternalsType, GotReturn } from "got";
import { URL } from "node:url";

export { Got } from "got";

export declare type Like = string | StaticGot;

declare const nameSymbol: unique symbol;

declare type URLOrOptions = Partial<InternalsType> | URL | string;
declare type Extension = (urlOrOptions: URLOrOptions, restOptions: InternalsType) => GotReturn;
declare type GQLOptions = {
	query: string;
	token?: string;
	variables?: Record<string, string[]>;
};
declare type URLOrGotProxyOptions = URLOrOptions & {
	skipURLSanitization?: boolean;
};
declare type GotInstance = Got & {
	[nameSymbol]: string;
};

declare type BaseDefinition = {
	name: string;
	parent: BaseDefinition["name"] | null;
	description: string;
};
declare type FunctionDefinition = BaseDefinition & {
	optionsType: "function";
	options: (() => Partial<InternalsType>);
};
declare type ObjectDefinition = BaseDefinition & {
	optionsType: "object";
	options: Partial<InternalsType>;
};
export declare type Definition = FunctionDefinition | ObjectDefinition;

declare class StaticGot {
	static readonly data: StaticGot[];

	static #add (definition: Definition, parentDefinitions: GotInstance[]): GotInstance;

	static importData (definitions: Definition[]): Promise<void>;
	static importSpecific (...definitions: Definition[]): Promise<void>;

	static get (identifier: Like): GotInstance | null;
	static gql (gqlOptions: GQLOptions): unknown;
	static sanitize (strings: string[], ...values: string[]): string;
	static extend (extendOptions: ExtendOptions): Extension;
	static isRequestError (error: Error): boolean;

	static get FormData (): FormData;
}

export const GotProxy: {
	(input: URLOrGotProxyOptions): GotReturn;
	(name: string, input: URLOrGotProxyOptions): GotReturn;
} & {
	[P in keyof typeof StaticGot]: typeof StaticGot[P]
} & {
	[P in keyof Got]: Got[P]
}
