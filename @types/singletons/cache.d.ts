import { SingletonTemplate as Template } from "./template";
import { Redis } from "ioredis";

declare type Stringifiable = boolean | number | string;
declare type JSONifiable = null | boolean | number | string | { [P: string]: JSONifiable } | Array<JSONifiable>;
declare type Port = number;
declare type URL = string;
declare type Ok = "OK";

// export declare type Redis = unknown; // @todo From ioredis
export declare type ConfigurationObject = unknown; // @todo from ioredis
export declare type Configuration = Port | URL | ConfigurationObject;
export declare type Value = JSONifiable;
export declare type Version = [number, number, number];

export declare type Key = Stringifiable | {
    getCacheKey?: (any) => string;
};
export declare type SetOptions = {
    specificKey?: string;
    keepTTL?: boolean;
    expiry?: number;
    expiresAt?: Date | number;
};
export declare type PrefixObject = {
    [P: string]: Stringifiable;
};
export declare type Prefix = Key | PrefixObject;

export declare type KeyOptions = {
    keys: PrefixObject
};
export declare type PrefixOptions = KeyOptions & SetOptions;
export declare type KeysPrefixOptions = KeyOptions & {
    count?: number;
};

export declare class CacheSingleton implements Template {
    static module: CacheSingleton;
    static singleton (): CacheSingleton;
    static resolveKey (value: Key): string;
    static resolvePrefix (mainKey: string, keys: PrefixObject): string;

    #active: boolean;
    #server: Redis;
    #version: Version;

    constructor ();

    connect (configuration: Configuration): void;
    disconnect (): void;
    set (data: SetOptions): Promise<Ok | null>; // inferred from Redis["set"] for the non-callback overload
    get (keyIdentifier: Key): Promise<Value>;
    delete (keyIdentifier: Key): Promise<number>; // inferred from Redis["del"] for the non-callback overload;
    setByPrefix (prefix: Prefix, value: Value, options: PrefixOptions): ReturnType<CacheSingleton["set"]>;
    getByPrefix (prefix: Prefix, options: PrefixOptions): ReturnType<CacheSingleton["get"]>;
    getKeysByPrefix (prefix: Prefix, options: KeysPrefixOptions): Promise<Array<string>>;
    getKeyValuesByPrefix (prefix: Prefix, options: KeysPrefixOptions): Promise<Array<Value>>;
    destroy (): void;

    get active (): boolean;
    get server (): Redis;
    get modulePath (): "cache";
    get version (): Version;
}
