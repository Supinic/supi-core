import { ClassTemplate } from "./template";
import { ExtendOptions, Got, GotOptions, GotReturn, URLOrOptions } from "got";
import FormData = require("form-data");

export { Got } from "got";

export declare type Like = string | StaticGot;

declare const SymbolName: unique symbol;
declare const sanitize: (string: string) => string;

declare type Extension = (urlOrOptions: URLOrOptions, restOptions: GotOptions) => GotReturn;
declare type GQLOptions = {
	query: string;
	token?: string;
	variables?: Record<string, string[]>;
};
declare type URLOrGotProxyOptions = URLOrOptions & {
	skipURLSanitization?: boolean;
};
declare type GotInstance = Got & {
	[SymbolName]: string;
};

declare class StaticGot extends ClassTemplate {
	static readonly data: StaticGot[];
	static get (identifier: Like): GotInstance | null;
	static gql (gqlOptions: GQLOptions): unknown;
	static sanitize (strings: string[], ...values: string[]): string;
	static extend (extendOptions: ExtendOptions): Extension;

	static get specificName (): "Got";
	static get FormData (): FormData;
}

export const GotProxy: {
	(input: URLOrGotProxyOptions): GotReturn;
	(name: string, input: URLOrGotProxyOptions): GotReturn;

	[P: string]: StaticGot[keyof StaticGot] | Got[keyof Got];
}
