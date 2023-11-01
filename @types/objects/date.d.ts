// import { Date as NativeDate } from "lib.es6";

export declare type DayOfTheWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export declare type Month = "January" | "February" | "March" | "April"
	| "May" | "June" | 	"July" | "August"
	| "September" | "October" | "November" | "December";

export declare type Formatted = string;
export declare type EnglishDaySuffix = "st" | "nd" | "rd" | "th";
export declare type TimeUnit = "h" | "m" | "s" | "ms";

/**
 * Extension of the native JavaScript Date class, with several additions to its API.
 * Note: the addition of `addX` methods, format and setters/getters for time units.
 */
export declare class SupiDate extends Date {
	static months: Month[];

	/**
	 * Returns the suffix used in English for a given day.
	 */
	static getDaySuffix (number: number): EnglishDaySuffix;

	/**
	 * Compares two instances for their equality.
	 */
	static equals (from: SupiDate, to: SupiDate): boolean;

	/**
	 * Pads a number with specified number of zeroes.
	 */
	static zf (number: number, padding: number): string;

	/**
	 * "Normalizes" the `Date.UTC` native static method by subtracting 1 from the provided month number,
	 * therefore matching the 1-indexed values used for days.
	 */
	static UTC: DateConstructor["UTC"];

	/**
	 * Returns the timestamp of today's midnight in UTC.
	 */
	static getTodayUTC (): number;

	/**
	 * Creates the instance. Uses the same constructor as native Date does.
	 */
	constructor (...args: Array<number | string | Date>);

	/**
	 * Formats the instance into specified format.
	 * For full documentation of the symbols, check here: {@link https://www.php.net/manual/en/datetime.format.php}
	 */
	format (formatString: string): Formatted;

	/**
	 * Determines if the date instance is valid, as in, its internal value is not `NaN`.
	 */
	isValid (): boolean;

	/**
	 * Syntactic sugar for format("j.n.Y")
	 * @example "1.3.2021"
	 */
	simpleDate (): Formatted;

	/**
	 * Syntactic sugar for format("j.n.Y H:i:s")
	 * @example "1.3.2021 08:07:01"
	 */
	simpleDateTime (): Formatted;

	/**
	 * Syntactic sugar for format("j.n.Y H:i:s.v")
	 * @example "1.3.2021 08:07:01.055"
	 */
	fullDateTime (): Formatted;

	/**
	 * Syntactic sugar for format("Y-m-d")
	 * @example "2021-03-01"
	 */
	sqlDate (): Formatted;

	/**
	 * Syntactic sugar for format("H:i:s.v")
	 * @example "08:07:01.055"
	 */
	sqlTime (): Formatted;

	/**
	 * Syntactic sugar for format("Y-m-d H:i:s.v")
	 * @example "2021-03-01 08:07:01.005"
	 */
	sqlDateTime (): Formatted;

	/**
	 * Sets the current timezone offset to the provided value.
	 * The offset provided is in minutes
	 */
	setTimezoneOffset (offset: number): SupiDate;

	/**
	 * Sets the provided time units to zero.
	 */
	discardTimeUnits (...units: TimeUnit[]): SupiDate;

	/**
	 * Clones the current SupiDate. The new object is independent of the old one.
	 */
	clone (): SupiDate;

	addYears (y: number): SupiDate;
	addMonths (m: number): SupiDate;
	addDays (d: number): SupiDate;
	addHours (h: number): SupiDate;
	addMinutes (m: number): SupiDate;
	addSeconds (s: number): SupiDate;
	addMilliseconds (ms: number): SupiDate;

	get dayOfTheWeek (): DayOfTheWeek;
	get year (): number;
	get month (): number;
	get day (): number;
	get hours (): number;
	get minutes (): number;
	get seconds (): number;
	get milliseconds (): number;

	set year (y: number);
	set month (m: number);
	set day (d: number);
	set hours (h: number);
	set minutes (m: number);
	set seconds (s: number);
	set milliseconds (ms: number);
}
