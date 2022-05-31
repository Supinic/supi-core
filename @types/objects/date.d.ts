// import { Date as NativeDate } from "lib.es6";

export declare type Month = "January" | "February" | "March" | "April"
	| "May" | "June" | 	"July" | "August"
	| "September" | "October" | "November" | "December";

export declare type Formatted = string;
export declare type EnglishDaySuffix = "st" | "nd" | "rd" | "th";
export declare type TimeUnit = "h" | "m" | "s" | "ms";

export declare class CustomDate extends Date {
	static months: Month[];
	static getDaySuffix (number: number): EnglishDaySuffix;
	static equals (from: CustomDate, to: CustomDate): boolean;

	constructor (...args: Array<number | string | Date>);

	format (formatString: string): Formatted;
	isValid (): boolean;
	simpleDate (): Formatted;
	fullDateTime (): Formatted;
	sqlDate (): Formatted;
	sqlTime (): Formatted;
	sqlDateTime (): Formatted;
	setTimezoneOffset (offset: number): CustomDate;
	discardTimeUnits (...units: TimeUnit[]): CustomDate;
	clone (): CustomDate;

	addYears (y: number): CustomDate;
	addMonths (m: number): CustomDate;
	addDays (d: number): CustomDate;
	addHours (h: number): CustomDate;
	addMinutes (m: number): CustomDate;
	addSeconds (s: number): CustomDate;
	addMilliseconds (ms: number): CustomDate;

	get dayOfTheWeek (): number;
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
