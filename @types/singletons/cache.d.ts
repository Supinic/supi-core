import { Redis, RedisOptions } from "ioredis";
import type { JSONifiable, Port, Stringifiable, URL } from "../globals.d.ts";

declare type Ok = "OK";
export declare type Configuration = Port | URL | RedisOptions;
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
export declare type PrefixOptions = Partial<KeyOptions & SetOptions>;
export declare type KeysPrefixOptions = Partial<KeyOptions> & {
    count?: number;
};

/**
 * Redis caching module with methods to ease up item lookup.
 */
export declare class Cache {
    static resolveKey (value: Key): string;
    static resolvePrefix (mainKey: string, keys: PrefixObject): string;

    #server: Redis;
    #version: Version;
    #configuration: Configuration;

    constructor (configuration: Configuration);

    connect (): Promise<void>;
    disconnect (): void;

    set (data: SetOptions): Promise<Ok | null>; // inferred from Redis["set"] for the non-callback overload
    get (keyIdentifier: Key): Promise<Value>;
    delete (keyIdentifier: Key): Promise<number>; // inferred from Redis["del"] for the non-callback overload;
    setByPrefix (prefix: Prefix, value: Value, options?: PrefixOptions): ReturnType<Cache["set"]>;
    getByPrefix (prefix: Prefix, options?: PrefixOptions): ReturnType<Cache["get"]>;
    getKeysByPrefix (prefix: Prefix, options: KeysPrefixOptions): Promise<string[]>;
    getKeyValuesByPrefix (prefix: Prefix, options: KeysPrefixOptions): Promise<Value[]>;
    destroy (): void;

    get ready (): boolean;
    get server (): Redis;
    get modulePath (): "cache";
    get version (): Version;
}
