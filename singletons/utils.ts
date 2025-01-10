import SupiDate from "../objects/date.js";
import SupiError from "../objects/error.js";

import { MersenneTwister19937, Random } from "random-js";
import { load as loadCheerio, CheerioAPI } from "cheerio";
import parseDuration from "duration-parser";

const randomizer = new Random(MersenneTwister19937.autoSeed());

const byteUnits = {
	si: {
		multiplier: 1000,
		units: ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
	},
	iec: {
		multiplier: 1024,
		units: ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
	}
};

const linkRegex = /(((http|https):\/\/)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*))/gi;

type TextCase = "snake" | "camel" | "kebab" | "text";
type SimpleValue = string | number | boolean | bigint | null | undefined | SimpleValue[] | { [P: string]: SimpleValue };

type GenericClosestStringOptions = {
	ignoreCase?: boolean;
	fullResult?: boolean;
	descriptor?: boolean;
};
type BaseClosestStringOptions = {
	ignoreCase?: boolean;
};
type DescriptorClosestStringOptions = BaseClosestStringOptions & {
	fullResult: never;
	descriptor: true;
};
type FullResultClosestStringOptions = BaseClosestStringOptions & {
	fullResult: true;
	descriptor: never;
};
type ClosestStringDescriptor = {
	string: string;
	original: string;
	index: number;
	score: number;
	includes: boolean;
};

const isObject = (input: unknown): input is { [P: string]: SimpleValue } => (Boolean(input) && typeof input === "object");

const isSomeObjectArray = (input: unknown): input is Record<string, unknown>[] => (
	Array.isArray(input)
	&& (input as unknown[]).every(i => i && typeof i === "object" && i.constructor === Object)
);

// noinspection JSUnusedGlobalSymbols Don't check for unused methods - this is a module class
export default class Utils {
	/** Numeric constants to convert between any two time units. */
	static timeUnits = {
		y: { d: 365, h: 8760, m: 525600, s: 31536000, ms: 31536000.0e3 },
		d: { h: 24, m: 1440, s: 86400, ms: 86400.0e3 },
		h: { m: 60, s: 3600, ms: 3600.0e3 },
		m: { s: 60, ms: 60.0e3 },
		s: { ms: 1.0e3 }
	} as const;

	/** List of named HTML entities and their identifiers */
	static htmlEntities: Record<string, string> = {
		nbsp: " ",
		lt: "<",
		gt: ">",
		amp: "&",
		quot: "\"",
		apos: "'",
		cent: "¢",
		pound: "£",
		yen: "¥",
		euro: "€",
		copy: "©",
		reg: "®"
	} as const;

	/** Collection of string template "tag" functions */
	tag = {
		trim: (strings: string[], ...values: Array<string|number>) => {
			const result = [];
			for (let i = 0; i < strings.length; i++) {
				result.push(strings[i].replace(/\s+/g, " "), values[i]);
			}

			return result.join("").trim();
		},
		groupDigits: (strings: string[], ...values: Array<string|number>) => {
			const result = [];
			for (let i = 0; i < strings.length; i++) {
				result.push(strings[i]);

				const value = values[i];
				if (typeof value === "number") {
					result.push(this.groupDigits(value));
				}
				else {
					result.push(value);
				}
			}

			return result.join("");
		}
	} as const;

	/**
	 * Capitalizes the string's first letter.
	 */
	capitalize (string: string) {
		return string[0].toUpperCase() + string.substring(1).toLowerCase();
	}

	/**
	 * Returns a formatted string, specifying an amount of time delta from current date to provided date.
	 * @param input
	 * @param [skipAffixes] if true, the affixes "in X hours" or "X hours ago" will be omitted
	 * @param [respectLeapYears] If true, shows a time difference spanning a whole year as `1y` regardless
	 * of the actual length of the year. If disabled, a year is always counted to be 365 * 24 hours. Defaults to false
	 * @param [deltaTo] If set, calculate time delta between target and deltaTo. If undefined, calculate
	 * delta between target and the current time.
	 */
	timeDelta (input: SupiDate | Date | number, skipAffixes = false, respectLeapYears = false, deltaTo?: SupiDate): string {
		if (deltaTo === undefined) {
			deltaTo = new SupiDate();
		}

		const target = new SupiDate(input.valueOf());
		if (SupiDate.equals(deltaTo, target)) {
			return "right now!";
		}

		let string;
		const delta = Math.abs(deltaTo.valueOf() - target.valueOf());
		const [prefix, suffix] = (target > deltaTo) ? ["in ", ""] : ["", " ago"];

		if (delta < Utils.timeUnits.s.ms) {
			string = `${delta}ms`;
		}
		else if (delta < Utils.timeUnits.m.ms) {
			string = `${this.round(delta / Utils.timeUnits.s.ms, 2)}s`;
		}
		else if (delta < Utils.timeUnits.h.ms) {
			// Discards the data carried in the last 3 digits, aka milliseconds.
			// E.g. 119999ms should be parsed as "2min, 0sec"; not "1min, 59sec" because of a single millisecond.
			// Rounding to -3 turns 119999 to 120000, which makes the rounding work properly.
			const trimmed = this.round(delta, -3);

			const minutes = Math.trunc(trimmed / Utils.timeUnits.m.ms);
			const seconds = Math.trunc((trimmed / Utils.timeUnits.s.ms) % Utils.timeUnits.m.s);
			string = `${minutes}m, ${seconds}s`;
		}
		else if (delta < Utils.timeUnits.d.ms) {
			// Removing one millisecond from a time delta in (hours, minutes) should not affect the result.
			const trimmed = this.round(delta, -3);

			const hours = Math.trunc(trimmed / Utils.timeUnits.h.ms);
			const minutes = Math.trunc(trimmed / Utils.timeUnits.m.ms) % Utils.timeUnits.h.m;
			string = `${hours}h, ${minutes}m`;
		}
		else if (delta < Utils.timeUnits.y.ms) {
			// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
			const trimmed = this.round(delta, -3);

			const days = Math.trunc(trimmed / Utils.timeUnits.d.ms);
			const hours = Math.trunc(trimmed / Utils.timeUnits.h.ms) % Utils.timeUnits.d.h;
			string = `${days}d, ${hours}h`;
		}
		else if (respectLeapYears) {
			// 365 days or more, while respecting leap years
			const [earlier, later] = (deltaTo < target) ? [deltaTo, target] : [target, deltaTo];

			// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
			const trimmed = this.round(delta, -3);

			const laterRounded = new SupiDate(earlier.valueOf() + trimmed);

			// how many whole years lie between the dates?
			let years = laterRounded.getUTCFullYear() - earlier.getUTCFullYear();

			// now only a difference of <1 year remains.
			// Then calculate the remaining time range -> The remaining time delta is then represented by
			// `earlierPlusYears` and `laterRounded`
			const earlierPlusYears = earlier.clone() as SupiDate; // @todo remove after SupiDate is in Typescript
			earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() + years);

			// this is in case `earlier` lies later "in the year" then `later`.
			// E.g. earlier=December 1st 2019, later=January 1st 2021 calculates
			// a year difference of `2`, but the number we want (whole years) is 1.
			// I suppose a `if` would work too, but I'm too afraid I would be missing edge cases by doing that.
			// Most of the time the while loop will run 0 or 1 times
			while (earlierPlusYears.valueOf() > later.valueOf()) {
				earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() - 1);
				years--;
			}

			// Calculate number of remaining days
			const remainingDelta = this.round(laterRounded.valueOf() - earlierPlusYears.valueOf(), -4);
			const days = Math.trunc(remainingDelta / Utils.timeUnits.d.ms);

			string = `${years}y, ${days}d`;
		}
		else {
			// 365 days or more, while *not* respecting leap years
			// Removing any amount of seconds from a time delta in (years, days) should not affect the result.
			const trimmed = this.round(delta, -4);

			const years = Math.trunc(trimmed / Utils.timeUnits.y.ms);
			const days = Math.trunc(trimmed / Utils.timeUnits.d.ms) % Utils.timeUnits.y.d;
			string = `${years}y, ${days}d`;
		}

		return (skipAffixes)
			? string
			: (prefix + string + suffix);
	}

	/**
	 * Transforms a string into a dictionary-like Map to count how many times a word has been used in the message
	 * @param message
	 * @param [orderBy] Direction to order the result Map by
	 * @returns The amount of times a word has been used in the message
	 */
	toDictionary (message: string, orderBy: "asc" | "desc" = "asc"): Map<string, number> {
		const arr = message.replace(/\s+/g, " ").trim().split(" ");
		let dictionary = new Map(arr.map(i => [i, 0]));
		for (const i of arr) {
			const value = dictionary.get(i) as number; // Value is always a number, declared above [i, 0]
			dictionary.set(i, value + 1);
		}

		if (orderBy.toLowerCase() === "desc") {
			dictionary = new Map([...dictionary.entries()].sort((a, b) => b[1] - a[1]));
		}
		else if (orderBy.toLowerCase() === "asc") {
			dictionary = new Map([...dictionary.entries()].sort((a, b) => a[1] - b[1]));
		}

		return dictionary;
	}

	/**
	 * Rounds a number to given amount of decimal places.
	 */
	round (number: number, places = 0, options: { direction?: "ceil" | "floor" | "round" | "trunc" } = {}) {
		const direction = options.direction ?? "round";
		if (!["ceil", "floor", "round", "trunc"].includes(direction)) {
			throw new SupiError({
				message: "Invalid round direction provided",
				args: { number, places, options }
			});
		}

		return (Math[direction](number * (10 ** places))) / (10 ** places);
	}

	/**
	 * Escapes the most common problematic characters as HTML entity sequences
	 */
	escapeHTML (string: string): string {
		return string
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	/**
	 * Fixes an HTML string by replacing all escape sequences with their character representations
	 */
	fixHTML (string: string): string {
		return string.replace(/&#?(?<identifier>[a-z0-9]+);/g, (...params) => {
			const { identifier } = params.at(-1) as { identifier: string };
			return Utils.htmlEntities[identifier] ?? String.fromCharCode(Number(identifier));
		});
	}

	/**
	 * Removes all HTML-like tags from input string.
	 */
	removeHTML (string: string): string {
		return string.replace(/<\s*br.*?>/g, "\n").replace(/<(.*?)>/g, "");
	}

	/**
	 * Wraps the input string into the given amount of characters, discarding the rest.
	 * @param [options.keepWhitespace] If true, newlines will and whitespace will be preserved. Default - they are converted to a single space
	 */
	wrapString (string: string, length: number, options: { keepWhitespace?: boolean } = {}) {
		if (!options.keepWhitespace) {
			string = string.replace(/\r?\n/g, " ").replace(/\s+/g, " ");
		}

		return (string.length >= length)
			? `${string.slice(0, length - 1)}…`
			: string;
	}

	/**
	 * Returns a random integer between min and max, inclusively.
	 */
	random (min: number, max: number) {
		return randomizer.integer(min, max);
	}

	/**
	 * Returns a random array element.
	 * Returns `undefined` if the array is empty.
	 */
	randArray (arr: []): undefined;
	randArray<T> (arr: T[]): T;
	randArray<T> (arr: T[]): T | undefined {
		return (arr.length === 0)
			? undefined
			: arr[this.random(0, arr.length - 1)];
	}

	/**
	 * Creates a shuffled shallow copy of the provided array.
	 */
	shuffleArray<T> (arr: T[]): T[] {
		const copy = [...arr];
		const shuffledArray = [];

		while (copy.length > 0) {
			const index = this.random(0, copy.length - 1);
			const value = copy[index];

			shuffledArray.push(value);
			copy.splice(index, 1);
		}

		return shuffledArray;
	}

	/**
	 * Formats a number specifying the amount of seconds to a string.
	 * @param seconds
	 * @param [videoStyle] If false, format will be HH:MM:SS - if true, format will be HH hr, MM min, SS sec
	 */
	formatTime (seconds = 0, videoStyle = false): string {
		const stuff = [];
		if (videoStyle) {
			seconds = Math.trunc(seconds);

			if (seconds >= Utils.timeUnits.h.s) {
				const hr = Math.floor(seconds / Utils.timeUnits.h.s);
				stuff.push(hr);
				seconds -= (hr * Utils.timeUnits.h.s);
			}
			const min = Math.floor(seconds / Utils.timeUnits.m.s);
			stuff.push((stuff.length) ? this.zf(min, 2) : min);
			seconds -= (min * Utils.timeUnits.m.s);
			stuff.push(this.zf(seconds, 2));

			return stuff.join(":");
		}
		else {
			if (seconds >= Utils.timeUnits.d.s) {
				const days = Math.floor(seconds / Utils.timeUnits.d.s);
				stuff.push(`${days} days`);
				seconds -= (days * Utils.timeUnits.d.s);
			}
			if (seconds >= Utils.timeUnits.h.s) {
				const hr = Math.floor(seconds / Utils.timeUnits.h.s);
				stuff.push(`${hr} hr`);
				seconds -= (hr * Utils.timeUnits.h.s);
			}
			if (seconds >= Utils.timeUnits.m.s) {
				const min = Math.floor(seconds / Utils.timeUnits.m.s);
				stuff.push(`${min} min`);
				seconds -= (min * Utils.timeUnits.m.s);
			}
			if (seconds >= 0 || stuff.length === 0) {
				stuff.push(`${this.round(seconds, 3)} sec`);
			}
			return stuff.join(", ");
		}
	}

	/**
	 * Turns an array of string arguments to a character-separated string.
	 * Usually used for URL requests.
	 */
	argsToFixedURL (array: string[], character = "+"): string {
		return array.map(i => encodeURIComponent(i)).join(character);
	}

	/**
	 * Removes all (central European?) accents from a string.
	 */
	removeAccents (string: string): string {
		return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}

	/**
	 * Pads a number with specified number of zeroes.
	 */
	zf (number: number, padding: number): string {
		return ("0".repeat(padding) + number).slice(-padding);
	}

	/**
	 * Parses strings containing time units into a time number.
	 */
	parseDuration = parseDuration;

	/**
	 * Parses a simple video duration in the format HH:MM:SS.vvv to seconds.
	 * Each part is voluntary, [HH:][MM:]SS[.vvv]
	 * Returns `null` if some of the part is not numeric
	 */
	parseVideoDuration (string: string): number | null {
		const parts = string.split(":");
		if (parts.length === 0) {
			const value = Number(string);
			return Number.isFinite(value) ? value : null;
		}

		parts.splice(3);

		let mult = 1;
		let number = 0;
		for (let i = parts.length - 1; i >= 0; i--) {
			number += Number(parts[i]) * mult;
			mult *= 60;
		}

		return Number.isFinite(number) ? number : null;
	}

	convertCase (text: string, caseFrom: TextCase, caseTo: TextCase) {
		if (typeof text !== "string") {
			throw new SupiError({
				message: "Text must be typeof string",
				args: { text, caseFrom, caseTo }
			});
		}

		let words: string[] = [];
		if (caseFrom === "camel" && caseTo === "snake") {
			words = text.split(/(?=[A-Z])/);
		}
		else if (caseFrom === "snake" && caseTo === "camel") {
			words = text.split("_");
		}
		else if (caseFrom === "kebab" && caseTo === "camel") {
			words = text.split("-");
		}
		else if (caseFrom === "text" && caseTo === "camel") {
			words = text.split(" ");
		}

		words = words.filter(Boolean);

		let result = "";
		if (caseTo === "snake") {
			result = words.map(i => this.capitalize(i)).join("_");
		}
		else if (caseTo === "kebab") {
			result = words.join("-");
		}
		else if (caseTo === "camel") {
			result = words.map((i, ind) => (ind === 0) ? i.toLowerCase() : this.capitalize(i)).join("");
		}

		return result.replace(/id$/i, "ID");
	}

	convertCaseObject<T extends Record<string, unknown>> (object: T, caseFrom: TextCase, caseTo: TextCase): T;
	convertCaseObject<T extends unknown[]> (object: T, caseFrom: TextCase, caseTo: TextCase): T;
	convertCaseObject (object: Record<string, unknown> | unknown[], caseFrom: TextCase, caseTo: TextCase): Record<string, unknown> | unknown[] {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(object)) {
			const newKey = this.convertCase(key, caseFrom, caseTo);
			if (isObject(value)) {
				result[newKey] = this.convertCaseObject(value, caseFrom, caseTo);
			}
			else if (isSomeObjectArray(value)) {
				result[this.convertCase(key, caseFrom, caseTo)] = value.map(i => this.convertCaseObject(i, caseFrom, caseTo));
			}
			else {
				result[this.convertCase(key, caseFrom, caseTo)] = value;
			}
		}

		return (Array.isArray(object))
			? Object.values(result)
			: result;
	}

	isValidInteger (input: unknown, minLimit = 0): boolean {
		if (typeof input !== "number") {
			return false;
		}

		return Boolean(Number.isFinite(input) && Math.trunc(input) === input && input >= minLimit);
	}

	/**
	 * Splits an array into two, based on the condition function.
	 * @returns Two arrays: First one with condition === `true`, second one with `false`.
	 */
	splitByCondition<T> (array: T[], filter: (item: T, index: number, array: T[]) => boolean): [T[], T[]] {
		if (!Array.isArray(array)) {
			throw new SupiError({
				message: "array must be an Array"
			});
		}

		const yes = [];
		const no = [];
		for (let i = 0; i < array.length; i++) {
			if (filter(array[i], i, array)) {
				yes.push(array[i]);
			}
			else {
				no.push(array[i]);
			}
		}

		return [yes, no];
	}

	/**
	 * Wrapper for the cheerio module.
	 */
	cheerio (html: string): CheerioAPI {
		return loadCheerio(html);
	}

	/**
	 * Formats a number representing byte count into the closest matching SI/IEM prefix.
	 */
	formatByteSize (number: number, digits = 3, type: "si" | "iec" = "si") {
		const { multiplier, units } = byteUnits[type];

		number = Math.abs(Math.trunc(Number(number)));

		if (number < multiplier) {
			return `${number} B`;
		}

		let index = 0;
		while (number >= multiplier && index < units.length) {
			number /= multiplier;
			index++;
		}

		return `${number.toFixed(digits)} ${units[index - 1]}`;
	}

	/**
	 * Creates a random string using the characters provided, or the base ASCII alphabet.
	 */
	randomString (length: number, characters?: string | string[]): string {
		if (!characters) {
			characters = "abcdefghiklmnopqrstuvwxyzABCDEFGHIKLMNOPQRSTUVWXYZ".split("");
		}
		else if (typeof characters === "string") {
			characters = characters.split("");
		}
		else if (!Array.isArray(characters) || characters.some(i => typeof i !== "string")) {
			throw new SupiError({
				message: "Invalid input format",
				args: { characters, length }
			});
		}

		const result = [];
		for (let i = 0; i < length; i++) {
			result.push(this.randArray(characters));
		}

		return result.join("");
	}

	/**
	 * Recursively deep-freezes an object.
	 */
	deepFreeze<T extends object> (object: T): Readonly<T> {
		for (const value of Object.values(object)) {
			if (isObject(value)) {
				this.deepFreeze(value);
			}
		}

		return Object.freeze(object);
	}

	/**
	 * Jaro-Winkler similarity of two strings.
	 */
	jaroWinklerSimilarity (from: string, target: string): number {
		// Exit early if either are empty.
		if (from.length === 0 || target.length === 0) {
			return 0;
		}
		else if (from === target) {
			return 1;
		}

		let matches = 0;
		const range = (Math.floor(Math.max(from.length, target.length) / 2)) - 1;
		const fromMatches = new Array(from.length);
		const targetMatches = new Array(target.length);

		for (let i = 0; i < from.length; i++) {
			const low = (i >= range) ? i - range : 0;
			const high = (i + range <= (target.length - 1))
				? (i + range)
				: (target.length - 1);

			for (let j = low; j <= high; j++) {
				if (fromMatches[i] !== true && targetMatches[j] !== true && from[i] === target[j]) {
					matches++;
					fromMatches[i] = true;
					targetMatches[j] = true;
					break;
				}
			}
		}

		// Exit early if no matches were found.
		if (matches === 0) {
			return 0;
		}

		// Count the transpositions.
		let start = 0;
		let transpositions = 0;
		for (let i = 0; i < from.length; i++) {
			if (fromMatches[i] === true) {
				let j;
				for (j = start; j < target.length; j++) {
					if (targetMatches[j] === true) {
						start = j + 1;
						break;
					}
				}

				if (from[i] !== target[j]) {
					++transpositions;
				}
			}
		}

		let l = 0;
		let weight = (matches / from.length + matches / target.length + (matches - (transpositions / 2)) / matches) / 3;
		const p = 0.1;

		if (weight > 0.7) {
			while (from[l] === target[l] && l < 4) {
				++l;
			}

			weight = weight + l * p * (1 - weight);
		}

		return weight;
	}

	/**
	 * Returns the best fit for given string, based on Levenshtein distance.
	 * @param [options.ignoreCase] if true, all cases will be ignored
	 * @param [options.fullResult] if true, a full array of ClosestStringDescriptor-s will be returned. Mutually exclusive with descriptor
	 * @param [options.descriptor] if true, a ClosestStringDescriptor will be returned. Mutually exclusive with fullResult
	 */
	selectClosestString (from: string, originalTargets: string[], options: BaseClosestStringOptions): string | null;
	selectClosestString (from: string, originalTargets: string[], options: DescriptorClosestStringOptions): ClosestStringDescriptor | null;
	selectClosestString (from: string, originalTargets: string[], options: FullResultClosestStringOptions): ClosestStringDescriptor[] | null;
	selectClosestString (from: string, originalTargets: string[], options: GenericClosestStringOptions = {}) {
		const targets = originalTargets.slice(0);
		if (options.ignoreCase) {
			from = from.toLowerCase();
			for (let i = 0; i < targets.length; i++) {
				targets[i] = targets[i].toLowerCase();
			}
		}

		const scoreArray = targets.map((_i, ind) => this.jaroWinklerSimilarity(from, targets[ind]));
		if (options.fullResult) {
			const result = scoreArray.map((i, ind) => ({
				string: targets[ind],
				original: originalTargets[ind],
				score: i,
				index: ind,
				includes: Boolean(targets[ind].includes(from))
			}));

			return result.sort((a, b) => b.score - a.score);
		}
		else {
			let champion = null;
			let score = -Infinity;
			let index = -1;

			for (let i = 0; i < scoreArray.length; i++) {
				if (targets[i].includes(from) && score < scoreArray[i]) {
					champion = originalTargets[i];
					score = scoreArray[i];
					index = i;
				}
			}

			if (!champion) {
				return null;
			}

			if (options.descriptor) {
				return {
					string: targets[index],
					original: originalTargets[index],
					score,
					includes: Boolean(targets[index].includes(from)),
					index
				};
			}
			else {
				return champion;
			}
		}
	}

	/**
	 * Returns a string that represents the input number with digits grouped together
	 */
	groupDigits (number: number, separator = " "): string {
		const local = new Intl.NumberFormat().format(number);
		return local.replace(/,/g, separator);
	}

	/**
	 * Formats a number to return a simplified string with the best matching SI prefix.
	 */
	formatSI (number: number, unit = "", places = 0, addSpace = false): string {
		const space = (addSpace) ? " " : "";
		const prefixes = ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];
		const digits = Math.ceil(Math.log10(number + 1));
		const multiplier = Math.trunc((digits - 1) / 3);
		const rounded = this.round(number / (10 ** (multiplier * 3)), places);

		return `${rounded}${space}${prefixes[multiplier]}${unit}`;
	}

	/**
	 * Splits a given string into a given amount of "messages", where each contains up to `limit` characters.
	 * Only splits on entire words.
	 */
	partitionString (message: string, limit: number, messageCount: number): string[] {
		if (!this.isValidInteger(limit)) {
			throw new SupiError({
				message: "Limit must be a positive integer"
			});
		}

		const words: string[] = [];
		const regex = new RegExp(`.{1,${limit}}`, "g");
		for (const rawWord of message.split(" ")) {
			if (rawWord.length > limit) {
				const match = rawWord.match(regex);
				if (match) {
					words.push(...match);
				}
			}
			else {
				words.push(rawWord);
			}
		}

		const result: string[] = [];
		let buffer: string[] = [];
		let counter = 0;
		let messages = 1;
		let loopBroken = false;

		for (const word of words) {
			buffer.push(word);
			counter += word.length + 1;

			if (counter >= limit) {
				counter = 0;

				buffer.pop();
				result.push(buffer.join(" "));
				buffer = [word];
				messages++;
			}

			if (messages > messageCount) {
				loopBroken = true;
				break;
			}
		}

		if (!loopBroken) {
			result.push(buffer.join(" "));
		}

		return result;
	}

	/**
	 * Prepares a regex string by escaping all special regex characters.
	 * @param {string} string
	 * @returns {string}
	 */
	escapeRegExp (string: string): string {
		return string.replace(/([.+*?^$()[\]{}|\\])/g, "\\$1");
	}

	/**
	 * Creates a regular expression based on a provided string input.
	 * Returns `null` if the regex creation fails with an error
	 */
	parseRegExp (input: string): RegExp | null {
		const string = input.replace(/^\/|\/$/g, "");

		// find last possible forward slash that is not escaped with a backslash
		// this determines the forceful end of a regex, which is then followed by flag characters
		// Regex: find the slash not preceded by backslashes, that is also not ultimately followed by another slash
		const lastSlashIndex = string.match(/(?<!\\)(\/)(?!.*\/)/)?.index ?? -1;

		const regexBody = (lastSlashIndex !== -1) ? string.slice(0, lastSlashIndex) : string;
		const flags = (lastSlashIndex !== -1) ? string.slice(lastSlashIndex + 1) : "";

		let regex;
		try {
			regex = new RegExp(regexBody, flags);
		}
		catch {
			return null;
		}

		return regex;
	}

	replaceLinks (string: string, replacement = "[LINK]"): string {
		return string.replace(linkRegex, replacement);
	}
}
