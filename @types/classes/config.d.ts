import type { SupiDate } from "../objects/date.d.ts";
import type { SimpleGenericData } from "../globals.d.ts";
import { Query } from "../singletons/query/index.js";

export declare type Name = string;

// @todo get rid of the function type and value
export declare type Type = "number" | "string" | "array" | "object" | "date" | "regex" | "boolean" | "function";
export declare type Value = boolean | number | string | any[] | SimpleGenericData | SupiDate | RegExp | ((...args: any[]) => any);
export declare type Representation = {
	name: Name;
	type: Type;
	value: Value;
};
export declare type ConstructorData = {
	Name: Name;
	Type: Type;
	Editable: boolean;
	Value: string | Value;
};

/**
 * Represents configuration variables saved in the database.
 */
export declare class Config {
	static data: Map<Name, Config>;

	/**
	 * Creates a Config instance based on provided representation.
	 */
	static from (data: Representation): Config;

	/**
	 * Loads and fills the Config variables based on provided data.
	 * If `options.keepNotLoaded` is `true`, config variables that have not been loaded in this call will be kept.
	 * Otherwise, they will be cleared as in a full reload.
	 */
	static load (data: ConstructorData[], options?: { keepNotLoaded: boolean }): void;

	/**
	 * Checks if given configuration variable exists.
	 * @param variable Variable name
	 * @param strict If true, the config variable must also not be null in addition to existing
	 */
	static has (variable: string, strict?: boolean): boolean;

	/**
	 * Fetches the given configuration variable
	 * @param variable Variable name
	 * @param strict If true, the config variable must exist, otherwise an error is thrown. If false,
	 * then undefined is return - should the variable not exist.
	 * @throws {SupiError} If variable does not exist and `strict` is true
	 */
	static get (variable: string, strict?: boolean): Value;

	/**
	 * Sets the configuration variable
	 * @param variable Variable name
	 * @param value New variable value
	 * @param Query A "live" instance of Query
	 * @throws {SupiError} If variable does not exist
	 * @throws {SupiError} If variable is not editable
	 * @throws {SupiError} If provided value type is incompatible with the variable type
	 */
	static set (variable: string, value: Value, Query: Query): Promise<void>;

	#Name: Name;
	#Value: Value;
	#Type: Type;
	#Editable: boolean;
	#initialized: boolean;

	constructor (data: ConstructorData);

	get name (): Name;
	get editable (): boolean;
	get value (): Value;
	get stringValue (): string;

	set value (value: string | Value);
}
