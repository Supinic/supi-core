import { ClassTemplate } from "./template";
import { CustomDate as Date } from "../objects/date";
import { SimpleGenericData } from "../globals";

export declare type ConstructorData = {
    Name: string;
    Type: Type;
    Unit: Unit | null;
    Secret: boolean;
    Editable: boolean;
    Value: string | Value;
};
export declare type Name = string;
export declare type Type = "number" | "string" | "array" | "object" | "date" | "regex" | "boolean" | "function";
export declare type Value = boolean | number | string | any[] | SimpleGenericData | Date | RegExp | ((...args: any[]) => any);
export declare type Unit = "s" | "ms";
export declare type Representation = {
    name: Name;
    type: Type;
    value: Value;
};

/**
 * Represents configuration variables saved in the database.
 */
export declare class Config extends ClassTemplate {
    static data: Map<string, Config>;
    static nonStrictNotifications: Map<string, true>;

    /**
     * Creates a Config instance based on provided representation.
     */
    static from (data: Representation): Config;

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
     * @throws {sb.Error} If variable does not exist and `strict` is true
     */
    static get (variable: string, strict?: boolean): Value;

    /**
     * Sets the configuration variable
     * @param variable Variable name
     * @param value New variable value
     * @throws {sb.Error} If variable does not exist
     * @throws {sb.Error} If variable is not editable
     * @throws {sb.Error} If provided value type is incompatible with the variable type
     */
    static set (variable: string, value: Value): Promise<void>;

    #Name: string;
    #Value: Value;
    #Type: Type;
    #Unit: Unit | null;
    #Secret: boolean;
    #Editable: boolean;
    #initialized: boolean;

    constructor (data: ConstructorData);

    get name (): string;
    get editable (): boolean;
    get value (): Value;
    get stringValue (): string;

    set value (value: string | Value);
}
