import SupiDate from "../objects/date.js";
import SupiError from "../objects/error.js";

import { MersenneTwister19937, Random } from "random-js";
import { load as loadCheerio } from "cheerio";
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

/**
 * Conscise collection of "helper" and "utility" methods.
 */
export default class Utils {
	/** Numeric constants to convert between any two time units. */
	static timeUnits = {
		y: { d: 365, h: 8760, m: 525600, s: 31536000, ms: 31536000.0e3 },
		d: { h: 24, m: 1440, s: 86400, ms: 86400.0e3 },
		h: { m: 60, s: 3600, ms: 3600.0e3 },
		m: { s: 60, ms: 60.0e3 },
		s: { ms: 1.0e3 }
	};

	/** List of named HTML entities and their identifiers */
	static htmlEntities = {
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
	};

	/** Collection of string template "tag" functions */
	tag = {
		trim: (strings, ...values) => {
			const result = [];
			for (let i = 0; i < strings.length; i++) {
				result.push(strings[i].replace(/\s+/g, " "), values[i]);
			}

			return result.join("").trim();
		},
		groupDigits: (strings, ...values) => {
			const result = [];
			for (let i = 0; i < strings.length; i++) {
				result.push(strings[i]);

				if (typeof values[i] === "number") {
					result.push(this.groupDigits(values[i]));
				}
				else {
					result.push(values[i]);
				}
			}

			return result.join("");
		}
	};

	/**
	 * Capitalizes the string's first letter.
	 * @param {string} string
	 * @returns {string}
	 */
	capitalize(string) {
		return string[0].toUpperCase() + string.substring(1).toLowerCase();
	}

	/**
	 * Returns a formatted string, specifying an amount of time delta from current date to provided date.
	 * @param {SupiDate|Date|number} target
	 * @param {boolean} [skipAffixes] if true, the affixes "in X hours" or "X hours ago" will be omitted
	 * @param {boolean} [respectLeapYears] If true, shows a time difference spanning a whole year as `1y` regardless
	 * of the actual length of the year. If disabled, a year is always counted to be 365 * 24 hours. Defaults to false
	 * @param {SupiDate} [deltaTo] If set, calculate time delta between target and deltaTo. If undefined, calculate
	 * delta between target and the current time.
	 * @returns {string}
	 */
	timeDelta(target, skipAffixes = false, respectLeapYears = false, deltaTo = undefined) {
		if (deltaTo === undefined) {
			deltaTo = new SupiDate();
		}

		if (target.valueOf && typeof target.valueOf() === "number") {
			target = new SupiDate(target.valueOf());
		}
		else {
			throw new TypeError("Invalid parameter type");
		}

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
		else if (respectLeapYears) { // 365 days or more
			const [earlier, later] = (deltaTo < target) ? [deltaTo, target] : [target, deltaTo];

			// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
			const trimmed = this.round(delta, -3);

			const laterRounded = new SupiDate(earlier.valueOf() + trimmed);

			// how many whole years lie between the dates?
			let years = laterRounded.getUTCFullYear() - earlier.getUTCFullYear();
			// now only a difference of <1 year remains.
			// Then calculate the remaining time range -> The remaining time delta is then represented by
			// `earlierPlusYears` and `laterRounded`
			const earlierPlusYears = earlier.clone();
			earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() + years);

			// this is in case `earlier` lies later "in the year" then `later`.
			// E.g. earlier=December 1 2019, later=January 1 2021 calculates
			// a year difference of `2`, but the number we want (whole years) is
			// 1.
			// I suppose a `if` would work too but I'm too afraid I would be missing edge cases by doing that.
			// Most of the time the while loop will run 0 or 1 times.
			while (earlierPlusYears.valueOf() > later) {
				earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() - 1);
				years--;
			}

			// Calculate number of remaining days
			const remainingDelta = this.round(laterRounded.valueOf() - earlierPlusYears.valueOf(), -4);
			const days = Math.trunc(remainingDelta / Utils.timeUnits.d.ms);

			string = `${years}y, ${days}d`;
		}
		else { // 365 days or more
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
	 * @param {string} message
	 * @param {"asc"|"desc"} [orderBy] Direction to order the result Map by
	 * @returns {Map<string, number>} The amount of times a word has been used in the message
	 */
	toDictionary(message, orderBy = "asc") {
		const arr = message.replace(/\s+/g, " ").trim().split(" ");
		let dictionary = new Map(arr.map(i => [i, 0]));
		for (const i of arr) {
			dictionary.set(i, dictionary.get(i) + 1);
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
	 * @param {number} number
	 * @param {number} [places]
	 * @param {Object} options = {}
	 * @param {"ceil"|"floor"|"round"|"trunc"} [options.direction]
	 * @returns {number}
	 */
	round(number, places = 0, options = {}) {
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
	 * @param string
	 * @returns {string}
	 */
	escapeHTML(string) {
		return string
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	/**
	 * Fixes an HTML string by replacing all escape sequences with their character representations
	 * @param {string} string
	 * @returns {string}
	 */
	fixHTML(string) {
		return string.replace(/&#?(?<identifier>[a-z0-9]+);/g, (...params) => {
			const { identifier } = params.pop();
			return Utils.htmlEntities[identifier] || String.fromCharCode(Number(identifier));
		});
	}

	/**
	 * Removes all HTML-like tags from input string.
	 * @param string
	 * @returns {string}
	 */
	removeHTML(string) {
		return string.replace(/<\s*br.*?>/g, "\n").replace(/<(.*?)>/g, "");
	}

	/**
	 * Wraps the input string into the given amount of characters, discarding the rest.
	 * @param {string} string
	 * @param {number} length
	 * @param {Object} options={}
	 * @param {Object} [options.keepWhitespace] If true, no whitespace
	 * @returns {string}
	 */
	wrapString(string, length, options = {}) {
		if (typeof string !== "string") {
			throw new SupiError({
				message: "Provided input must be a string",
				args: {
					type: typeof string,
					name: string?.constructor?.name ?? "(none)"
				}
			});
		}

		if (!options.keepWhitespace) {
			string = string.replace(/\r?\n/g, " ").replace(/\s+/g, " ");
		}

		return (string.length >= length)
			? `${string.slice(0, length - 1)}…`
			: string;
	}

	/**
	 * Returns a random integer between min and max, inclusively.
	 * @param {number} min
	 * @param {number} max
	 * @returns {number}
	 */
	random(min, max) {
		return randomizer.integer(min, max);
	}

	/**
	 * Returns a random array element.
	 * @param {Array} arr
	 * @returns {*}
	 */
	randArray(arr) {
		return (arr.length === 0)
			? undefined
			: arr[this.random(0, arr.length - 1)];
	}

	/**
	 * Creates a shuffled shallow copy of the provided array.
	 * @param {Array} arr
	 * @returns {Array}
	 */
	shuffleArray(arr) {
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
	 * @param {number} seconds
	 * @param {boolean} [videoStyle] If false, format will be HH:MM:SS - if true, format will be HH hr, MM min, SS sec
	 * @returns {string}
	 */
	formatTime(seconds = 0, videoStyle = false) {
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
	 * @param {string[]} array
	 * @param {string} [character]
	 * @returns {string}
	 */
	argsToFixedURL(array, character = "+") {
		return array.map(i => encodeURIComponent(i)).join(character);
	}

	/**
	 * Removes all (central European?) accents from a string.
	 * @param {string} string
	 * @returns {string}
	 */
	removeAccents(string) {
		return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}

	/**
	 * Pads a number with specified number of zeroes.
	 * @param {number} number
	 * @param {number} padding
	 * @returns {string}
	 */
	zf(number, padding) {
		return ("0".repeat(padding) + number).slice(-padding);
	}

	/**
	 * Parses strings containing time units into a time number.
	 * @param {string} string A string containing potential data about a duration.
	 * @param {object} options
	 * @returns {number|{time: number, ranges: Object[]}}
	 */
	parseDuration(string, options) {
		return parseDuration(string, options);
	}

	/**
	 * Parses a simple video duration in the format HH:MM:SS.vvv to seconds.
	 * Each part is voluntary, [HH:][MM:]SS[.vvv]
	 * @param {string} string
	 * @returns {number|null}
	 */
	parseVideoDuration(string) {
		const parts = string.split(":");
		if (parts.length === 0) {
			return Number(string) ?? null;
		}

		parts.splice(3);

		let mult = 1;
		let number = 0;
		for (let i = parts.length - 1; i >= 0; i--) {
			number += Number(parts[i]) * mult;
			mult *= 60;
		}

		return number ?? null;
	}

	convertCase(text, caseFrom, caseTo) {
		if (typeof text !== "string") {
			throw new SupiError({
				message: "Text must be typeof string",
				args: { text, caseFrom, caseTo }
			});
		}

		let words = [];
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

	convertCaseObject(object, caseFrom, caseTo) {
		const result = {};
		for (const [key, value] of Object.entries(object)) {
			if (value && value.constructor === Object) {
				result[this.convertCase(key, caseFrom, caseTo)] = this.convertCaseObject(value, caseFrom, caseTo);
			}
			else if (Array.isArray(value) && value.every(i => i && i.constructor === Object)) {
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

	isValidInteger(input, minLimit = 0) {
		if (typeof input !== "number") {
			return false;
		}

		return Boolean(Number.isFinite(input) && Math.trunc(input) === input && input >= minLimit);
	}

	/**
	 * Splits an array into two, based on the condition function.
	 * @param {Array} array
	 * @param {Function} filter Takes three arguments: (item, index, array)
	 * @returns {[Array, Array]} Two arrays: First one with condition === true, second one with false.
	 */
	splitByCondition(array, filter) {
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
	 * Utils wrapper for the cheerio module.
	 * @todo remove from sb.Utils completely, and use without wrapping in projects as necessary
	 * @param {string} html
	 * @returns {*} CheerioAPI
	 */
	cheerio(html) {
		return loadCheerio(html);
	}

	/**
	 * Formats a number representing byte count into the closest matching SI/IEM prefix.
	 * @param {number} number
	 * @param {number} digits
	 * @param {"iec"|"si"} type
	 * @returns {string}
	 */
	formatByteSize(number, digits = 3, type = "si") {
		if (type !== "si" && type !== "iec") {
			throw new SupiError({
				message: "Unsupported byte size format",
				args: { number, type }
			});
		}

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
	 * @param {number} length
	 * @param {string|string[]} [characters]
	 * @returns {string}
	 */
	randomString(length, characters) {
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
	 * @param {Object} object
	 * @returns {Object}
	 */
	deepFreeze(object) {
		const properties = Object.getOwnPropertyNames(object);
		for (const key of properties) {
			const value = object[key];
			if (value && typeof value === "object" && value.constructor !== RegExp) {
				this.deepFreeze(value);
			}
		}

		return Object.freeze(object);
	}

	/**
	 * Jaro-Winkler similarity of two strings.
	 * @param {string} from
	 * @param {string} target
	 * @returns {number}
	 */
	jaroWinklerSimilarity(from, target) {
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
	 * @param {string} from
	 * @param {string[]} originalTargets
	 * @param {Object} [options]
	 * @param {boolean} [options.ignoreCase] if true, all cases will be ignored
	 * @param {boolean} [options.fullResult] if true, a full array of ClosestStringDescriptor-s will be returned. Mutually exclusive with descriptor
	 * @param {boolean} [options.descriptor] if true, a ClosestStringDescriptor will be returned. Mutually exclusive with fullResult
	 * @returns {null|string|ClosestStringDescriptor|ClosestStringDescriptor[]} null if nothing found, otherwise result based on options
	 */
	selectClosestString(from, originalTargets, options = {}) {
		const targets = originalTargets.slice(0);
		if (options.ignoreCase) {
			from = from.toLowerCase();
			for (let i = 0; i < targets.length; i++) {
				targets[i] = targets[i].toLowerCase();
			}
		}

		const scoreArray = targets.map((i, ind) => this.jaroWinklerSimilarity(from, targets[ind]));
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
	 * @param {number} number
	 * @param {string} separator
	 * @returns {string}
	 */
	groupDigits(number, separator = " ") {
		const local = new Intl.NumberFormat().format(number);
		return local.replace(/,/g, separator);
	}

	/**
	 * Formats a number to return a simplified string with the best matching SI prefix.
	 * @param {number} number
	 * @param {string} unit
	 * @param {number} places
	 * @param {boolean} addSpace
	 * @returns {string}
	 */
	formatSI(number, unit = "", places = 0, addSpace = false) {
		const space = (addSpace) ? " " : "";
		const prefixes = ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];
		const digits = Math.ceil(Math.log10(number + 1));
		const multiplier = Math.trunc((digits - 1) / 3);
		const rounded = this.round(number / (10 ** (multiplier * 3)), places);

		return `${rounded}${space}${prefixes[multiplier]}${unit}`;
	}

	/**
	 * Splits a given string into a given amount of "messages", where each contains up to `limit` characters.
	 * Only splits on entire words
	 * @param {string} message
	 * @param {number} limit
	 * @param {number} messageCount
	 * @returns {[]}
	 */
	partitionString(message, limit, messageCount) {
		if (!this.isValidInteger(limit)) {
			throw new SupiError({
				message: "Limit must be a positive integer"
			});
		}

		const words = [];
		const regex = new RegExp(`.{1,${limit}}`, "g");
		for (const rawWord of message.split(" ")) {
			if (rawWord.length > limit) {
				words.push(...rawWord.match(regex));
			}
			else {
				words.push(rawWord);
			}
		}

		const result = [];
		let buffer = [];
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
	escapeRegExp(string) {
		if (typeof string !== "string") {
			throw new TypeError("Both string and flags must be provided and be a string");
		}

		return string.replace(/([.+*?^$()[\]{}|\\])/g, "\\$1");
	}

	/**
	 * Creates a regular expression based on a provided string input.
	 * @param {string} input
	 * @returns {RegExp|null} Returns `null` if the regex creation fails with an error
	 */
	parseRegExp(input) {
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
		catch (e) {
			return null;
		}

		return regex;
	}

	replaceLinks(string, replacement = "[LINK]") {
		return string.replace(linkRegex, replacement);
	}

	get modulePath() { return "utils"; }

	/** @inheritDoc */
	destroy() {
		this.duration = null;
	}
}

/**
 * @typedef {Object} ClosestStringDescriptor
 * @property {string} string
 * @property {string} original
 * @property {number} index
 * @property {number} score
 * @property {boolean} includes
 */
