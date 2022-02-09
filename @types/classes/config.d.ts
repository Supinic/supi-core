import { ClassTemplate } from "./template";
import { CustomDate as Date } from "../objects/date";

export declare type ConstructorData = {
    Name: string;
    Type: Type;
    Unit: Unit | null;
    Secret: boolean;
    Editable: boolean;
    Value: string | Value;
};
export declare type Type = "number" | "string" | "array" | "object" | "date" | "regex" | "boolean" | "function";
export declare type Value = boolean | number | string | any[] | object | Date | RegExp | ((...args: any[]) => any);
export declare type Unit = "s" | "ms";
export declare type Representation = {
    name: string;
    type: Type;
    value: Value;
};

export declare class Config extends ClassTemplate {
    static data: Map<string, Config>;
    static nonStrictNotifications: Map<string, true>;

    static from (data: Representation): Config;
    static has (variable: string, strict?: boolean): boolean;
    static get (variable: string, strict?: boolean): Config;
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
