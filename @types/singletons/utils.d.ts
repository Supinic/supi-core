import type { Message, Stringifiable } from "../globals.d.ts";
import type { SupiDate } from "../objects/date.d.ts";

import { CheerioAPI } from "cheerio";
import { Random } from "random-js";
import { parse as DurationParseFunction } from "duration-parser";

declare interface MathProperties {
    [P: string]: keyof Math
}
declare interface RoundOptions extends MathProperties {
    direction: "ceil" | "floor" | "round" | "trunc"
}

declare type WrapStringProperties = {
    keepWhitespace?: boolean;
};
declare type TextCase = "camel" | "snake" | "kebab" | "text";

declare namespace Byte {
    type UnitType = "iec" | "si";
    namespace SI {
        type Multiplier = "k" | "M" | "G" | "T" | "P" | "E" | "Z" | "Y";
        type Unit = "B" | `${Multiplier}B`;
        type Result = `${number} ${Unit}`;
    }
    namespace IEC {
        type Multiplier = `${Uppercase<SI.Multiplier>}i`;
        type Unit = "B" | `${Multiplier}B`;
        type Result = `${number} ${Unit}`;
    }
}

export declare type DeepFrozen <T> = {
    readonly [P in keyof T]: DeepFrozen<T[P]>;
};

/**
 * CS stands for "Closest String" namespace
 */
export declare namespace CS {
    type Descriptor = {
        string: string;
        original: string;
        index: number;
        score: number;
        includes: boolean;
    }
    interface Options {
        ignoreCase?: boolean;
        fullResult?: boolean | null;
        descriptor?: boolean | null;
    }
    interface ArrayOptions extends Options {
        fullResult: true;
        descriptor: false | null | undefined;
    }
    interface DescriptorOptions extends Options {
        descriptor: true;
        fullResult: false | null | undefined;
    }
}

export declare class Utils {
    static readonly timeUnits: {
        y: { d: 365, h: 8760, m: 525600, s: 31536000, ms: 31536000.0e3 };
        d: { h: 24, m: 1440, s: 86400, ms: 86400.0e3 };
        h: { m: 60, s: 3600, ms: 3600.0e3 };
        m: { s: 60, ms: 60.0e3 };
        s: { ms: 1.0e3 }
    };
    static readonly htmlEntities: {
        nbsp: " ";
        lt: "<";
        gt: ">";
        amp: "&";
        quot: "\"";
        apos: "'";
        cent: "¢";
        pound: "£";
        yen: "¥";
        euro: "€";
        copy: "©";
        reg: "®";
    };

    readonly tag: {
        trim (strings: string[], ...values: Stringifiable[]): string;
        groupDigits (groupDigits: string[], ...values: number[]): string;
    };

    constructor ();

    capitalize (string: string): string;
    timeDelta (target: SupiDate | Date | number, skipAffixes?: boolean, respectLeapYears?: boolean, deltaTo?: SupiDate): string;
    toDictionary (message: Message, orderBy: "asc" | "desc"): Map<string, number>;
    round (number: number, places?: number, options?: RoundOptions): number;
    escapeHTML (string: string): string;
    fixHTML (string: string): string;
    removeHTML (string: string): string;
    wrapString (string: string, length: number, options?: WrapStringProperties): string;
    random (min: number, max: number): ReturnType<Random["integer"]>;
    randArray <T> (arr: T[]): T | undefined;
    shuffleArray <T> (arr: T[]): T[];
    formatTime (seconds: number, videoStyle?: boolean): string;
    argsToFixedURL (array: string[], character?: string): string;
    removeAccents (string: string): string;
    zf (number: number, padding: number): string;
    parseDuration: typeof DurationParseFunction;
    parseVideoDuration (string: string): number | null;
    convertCase (text: string, caseFrom: TextCase, caseTo: TextCase): string;
    convertCaseObject <T extends object> (object: T, caseFrom: TextCase, caseTo: TextCase): T;
    isValidInteger (input: number, minLimit?: number): boolean;
    splitByCondition <T> (array: T[], filter: (item: T, index: number, arr: T[]) => boolean): [T[], T[]];
    cheerio (html: string): CheerioAPI;
    formatByteSize (number: number, digits: number, type: "iec"): Byte.IEC.Result;
    formatByteSize (number: number, digits?: number, type?: "si"): Byte.SI.Result;
    randomString <T extends string> (length: number, characters: T): T;
    randomString (length: number): string;
    deepFreeze <T extends object> (object: T): DeepFrozen<T>;
    jaroWinklerSimilarity (from: string, target: string): number;
    selectClosestString (from: string, originalTargets: string[], options: CS.ArrayOptions): CS.Descriptor[] | null;
    selectClosestString (from: string, originalTargets: string[], options: CS.DescriptorOptions): CS.Descriptor | null;
    selectClosestString (from: string, originalTargets: string[], options?: CS.Options): string | null;
    groupDigits (number: number, separator?: string): string;
    formatSI (number: string, unit?: string, places?: number, addSpace?: boolean): string;
    partitionString (message: Message, limit: number, messageCount: number): string[];
    escapeRegExp (string: string): string;
    parseRegExp (input: string): RegExp | null;
    replaceLinks (string: string, replacement?: string): string;

    destroy (): void;
    get modulePath (): "cache";
}
