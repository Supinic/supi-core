import { Message, Stringifiable, URL } from "../globals";
import { CustomDate } from "../objects/date";

import { Url as NativeURLObject } from "url";

import { CheerioAPI } from "cheerio";
import { ParsedResult, ParsingOption } from "chrono-node";
import { Output as RSSOutput } from "rss-parser";
import { Random } from "random-js";
import { parse as DurationParseFunction } from "duration-parser";
// import * as FFProbe from "ffprobe";
import { transliterate as TransliterateFunction } from "transliteration";

declare interface MathProperties {
    [P: string]: keyof Math
}
declare interface RoundOptions extends MathProperties {
    direction: "ceil" | "floor" | "round" | "trunc"
}

declare type WrapStringProperties = {
    keepWhitespace?: boolean;
};
declare type ChronoResult = {
    date: ReturnType<ParsedResult["date"]>;
    component: ParsedResult["start"];
    text: ParsedResult["text"];
};
declare type TextCase = "camel" | "snake" | "kebab" | "text";

declare namespace NSFW {
    type Response = {
        statusCode: number;
        data: {
            id: string | null;
            score: number | null;
            detection: Detection[] | null;
        }
    };
    type Detection = {
        confidence: number; // Range: <0.0, 1.0>
        bounding_box: [number, number, number, number];
        name: "Male Breast - Exposed"
            | "Male Genitalia - Exposed"
            | "Male Genitalia - Covered"
            | "Female Genitalia - Exposed"
            | "Female Genitalia - Covered"
            | "Female Breast - Exposed"
            | "Female Breast - Covered"
            | "Buttocks - Exposed";
    }
}

declare namespace GeoData {
    type Location = {
        lat: number;
        lng: number;
    };
    type Success = {
        success: true;
        placeID: string;
        formatted: string;
        components: {
            country: string;
            level1: string;
            level2: string;
            locality: string;
        };
        location: Location
    };
    type Failure = {
        success: false;
        cause: string;
    };
}

declare type TimeOptions = {
    date?: number | Date | CustomDate;
    coordinates: GeoData.Location;
    key: string;
};
declare type TimeData = {
    statusCode: number;
    body: {
        dstOffset: number;
        rawOffset: number;
        status: string;
        timeZoneId: string;
        timeZoneName: string;
    };
};

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

export declare namespace YT {
    type SearchOptions = {
        single?: boolean;
        maxResults?: number;
    };
    type SingleSearchOptions = SearchOptions & {
        single: true;
    };
    type Video = {
        ID: string;
        title: string;
    };
    type PlaylistOptions = {
        key: string;
        playlistID: string;
        perPage?: number;
        limit?: number;
        limitAction?: "trim" | "error" | "return";
    };
    type PlaylistVideo = Video & {
        channelTitle: string;
        published: CustomDate;
        position: number;
    };
    type PlaylistResult = {
        sucess: boolean;
        result?: PlaylistVideo[];
        reason?: "not-found" | "limit-exceeded";
        amount?: number;
    };
}

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

declare type UploadResult = {
    statusCode: number;
    link: string | null;
};

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
    timeDelta (target: CustomDate | Date | number, skipAffixes?: boolean, respectLeapYears?: boolean, deltaTo?: CustomDate): string;
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
    searchYoutube (query: string, key: string, options: YT.SingleSearchOptions): Promise<YT.Video>;
    searchYoutube (query: string, key: string, options?: YT.SearchOptions): Promise<YT.Video[]>;
    fetchYoutubePlaylist (options: YT.PlaylistOptions): Promise<YT.PlaylistResult>;
    zf (number: number, padding: number): string;
    formatEnglishOrdinal (number: number): string;
    fetchGeoLocationData (key: string, query: string): Promise<GeoData.Success | GeoData.Failure>;
    parseDuration: typeof DurationParseFunction;
    parseVideoDuration (string: string): number | null;
    parseChrono (string: string, referenceDate?: Date, options?: ParsingOption): ChronoResult | null;
    convertCase (text: string, caseFrom: TextCase, caseTo: TextCase): string;
    convertCaseObject <T extends object> (object: T, caseFrom: TextCase, caseTo: TextCase): T;
    isValidInteger (input: number, minLimit?: number): boolean;
    transliterate: typeof TransliterateFunction;
    splitByCondition <T> (array: T[], filter: (item: T, index: number, arr: T[]) => boolean): [T[], T[]];
    parseURL (stringURL: URL): NativeURLObject;
    getPathFromURL (stringURL: URL): string;
    cheerio (html: string): CheerioAPI;
    formatByteSize (number: number, digits: number, type: "iec"): Byte.IEC.Result;
    formatByteSize (number: number, digits?: number, type?: "si"): Byte.SI.Result;
    randomString <T extends string> (length: number, characters: T): T;
    randomString (length: number): string;
    deepFreeze <T extends object> (object: T): DeepFrozen<T>;
    levenshteinDistance (from: string, target: string): number;
    jaroWinklerSimilarity (from: string, target: string): number;
    selectClosestString (from: string, originalTargets: string[], options: CS.ArrayOptions): CS.Descriptor[] | null;
    selectClosestString (from: string, originalTargets: string[], options: CS.DescriptorOptions): CS.Descriptor | null;
    selectClosestString (from: string, originalTargets: string[], options?: CS.Options): string | null;
    groupDigits (number: number, separator?: string): string;
    parseRSS (xml: string): Promise<RSSOutput<void>>;
    getMediaFileData (link: string): Promise<{ duration: number, bitrate: number } | null>;
    formatSI (number: string, unit?: string, places?: number, addSpace?: boolean): string;
    partitionString (message: Message, limit: number, messageCount: number): string[];
    evalDiceRoll (input: string, limit?: number): number | null;
    uploadToImgur (fileData: unknown, link?: string, options?: { type?: string }): Promise<UploadResult>;
    uploadToNuuls (fileData: unknown, fileName?: string): Promise<UploadResult>;
    checkPictureNSFW (link: string): Promise<NSFW.Response>;
    fetchTimeData (data: TimeOptions): Promise<TimeData>;
    /** @deprecated */
    processArtflowData (data: unknown[]): Promise<unknown[]>;
    escapeRegExp (string: string): string;
    parseRegExp (string: string): RegExp | null;
    replaceLinks (string: string, replacement?: string): string;

    destroy (): void;
    get modulePath (): "cache";
}
