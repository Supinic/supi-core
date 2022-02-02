import { Message } from "../globals";
import { ClassTemplate } from "./template";
import { Channel } from "./channel";
import { Platform } from "./platform";

// @todo
type ConstructorData = object;

export declare type DowntimeBehaviour = "Ignore" | "Notify" | "Nothing" | "Refuse" | "Whisper";
export declare type APIType = "Pajbot";
export declare type Type = "API response" | "Custom response" | "Denial" | "Inactive" | "Replacement";
export declare type Like = number | Banphrase;
export declare type Result = {
    string: Message | null;
    passed: boolean;
};

declare const apiDataSymbol: unique symbol;
declare const apiResultSymbol: unique symbol;
declare const inactiveSymbol: unique symbol;

declare type ExternalOptions = {
  fullResponse?: boolean;
};
declare type PajbotBanphraseAPIResponse = {
    banned: boolean;
    input_message: string;
    banphrase_data: {
        id: number;
        name: string;
        length: number;
        phrase: string;
        operator: string;
        permanent: boolean;
        sub_immunity: boolean;
        case_sensitive: boolean;
        remove_accents: boolean;
    };
    [apiDataSymbol]: PajbotBanphraseAPIResponse["banphrase_data"];
    [apiResultSymbol]: boolean;
}
declare type ExternalAPIResponse = PajbotBanphraseAPIResponse;

declare class ExternalBanphraseAPI {
    static pajbot (message: Message, URL: string): Promise<PajbotBanphraseAPIResponse>;
}

export declare class Banphrase extends ClassTemplate {
    static get (identifier: Like): Banphrase | null;
    static execute (message: Message, channelData: Channel, options: unknown): Promise<Result>;
    static executeExternalAPI (
        message: Message,
        type: "pajbot", // @todo somehow turn ExternalBanphraseAPI static methods to a union here
        URL: string,
        options: ExternalOptions
    ): Promise<ExternalAPIResponse | string | boolean>;

    readonly ID: number;
    readonly Type: Type;
    readonly Platform: Platform | null;
    readonly Channel: Channel | null;
    readonly Active: boolean;
    readonly Code: (message: Message) => string | undefined | Promise<string | undefined>; // @todo check if this is correct for actual types
    readonly data: object;

    constructor (data: ConstructorData);

    // cannot directly assign `inactiveSymbol` here
    // https://github.com/microsoft/TypeScript/issues/37469
    execute (message: Message): ReturnType<Banphrase["Code"]> | symbol;
}