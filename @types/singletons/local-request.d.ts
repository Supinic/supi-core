import { SingletonTemplate as Template } from "./template";
import { URL } from "../globals";

export declare type PlaysoundName = string;
export declare type AudioOptions = {
    url: URL;
    volume?: number;
    limit?: number;
};

export declare class LocalRequestSingleton implements Template {
    static module: LocalRequestSingleton;
    static singleton (): LocalRequestSingleton;

    constructor ();

    playAudio (name: PlaysoundName): Promise<boolean>;
    playSpecialAudio (options: AudioOptions): Promise<boolean>;
    checkTextToSpeech (): Promise<boolean>;
    playTextToSpeech (options: AudioOptions): Promise<boolean>;

    destroy (): void;

    get modulePath (): "local-request";
}
