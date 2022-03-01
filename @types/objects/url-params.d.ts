import { Stringifiable } from "../globals";

export declare class URLParams {
	readonly #char: string;
	#values: [string, Stringifiable][];

	constructor (joinCharacter?: string);

	set (key: string, value: Stringifiable): URLParams;
	unset (keyToUnset: string): URLParams;
	clear (): URLParams;
	has (keyToCheck: string): boolean;
	toString (): string;
	clone (): URLParams;
	[Symbol.toPrimitive] (hint: string): string;
	valueOf (): string;
	toJSON (): string;
}
