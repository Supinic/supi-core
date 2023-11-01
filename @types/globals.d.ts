export declare type Message = string;
export declare type Port = number;
export declare type URL = string;
export declare type Stringifiable = boolean | number | string;
export declare type JSONifiable = null | boolean | number | string | { [P: string]: JSONifiable } | JSONifiable[];
export declare type SimpleGenericData = Record<string, JSONifiable>;
// export declare type Without<T, U> = {
//     [P in Exclude<keyof T, keyof U>]?: never
// };
// export declare type XOR <T, U> = (T | U) extends object
//     ? (Without<T, U> & U) | (Without<U, T> & T)
// //     : T | U;
// export declare type OnlyKeysOfType<T, U> = {
//     [P in keyof T]: T[P] extends U ? P : never
// }[keyof T];
// export declare type TypeExtract<T, U> = {
//     [P in OnlyKeysOfType<T, U>]: U;
// };
