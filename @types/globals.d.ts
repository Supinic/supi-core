export declare type Message = string;
export declare type Emote = {
    code: string;
    type: string; // @todo finish emote types (bttv, ...)
    // @todo finish other properties
};
export declare interface GenericFlagsObject {
    [key: string]: boolean
}
export declare type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never
};
export declare type XOR <T, U> = (T | U) extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : T | U;
