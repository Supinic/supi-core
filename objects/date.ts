type DayOfMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
	| 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19
	| 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
	| 30 | 31;

type EnglishDaySuffix = "st" | "nd" | "rd" | "th";
type HasValueOf = { valueOf: () => number };

export default class SupiDate extends Date {
	static months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	] as const;

	static getDaySuffix (number: DayOfMonth): EnglishDaySuffix {
		switch (number) {
			case 1:
			case 21:
			case 31:
				return "st";
			case 2:
			case 22:
				return "nd";
			case 3:
			case 23:
				return "rd";
			default:
				return "th";
		}
	}

	static zf (number: number, padding: number): string {
		return ("0".repeat(padding) + number).slice(-padding);
	}

	static equals (from: HasValueOf, to: HasValueOf): boolean {
		const fromValue = from.valueOf();
		const toValue = to.valueOf();

		return (fromValue === toValue);
	}

	static UTC (year: number, month: number, ...args: number[]): number {
		if (typeof month === "number") {
			month -= 1;
		}

		return super.UTC(year, month, ...args);
	}

	static getTodayUTC (): number {
		const today = new Date();

		return super.UTC(
			today.getUTCFullYear(),
			today.getUTCMonth(), // use UTC month because we use super.UTC directly
			today.getUTCDate()
		);
	}

	constructor (input?: string | number | Date | SupiDate);
	constructor (year: number, month: number, day?: number, hour?: number, minute?: number, second?: number, millis?: number);
	// eslint-disable-next-line max-params
	constructor (input?: number | string | Date | SupiDate, month?: number, day?: number, hour?: number, minute?: number, second?: number, millis?: number) {
		if (typeof month === "number") {
			// Subtract one from the month parameter, because of how stupid the JS Date constructor does it.
			month -= 1;
		}

		if (typeof input === "undefined") {
			super();
		}
		else if (typeof input === "number" && typeof month === "number") {
			super(input, month, day, hour, minute, second, millis);
		}
		else {
			super(input);
		}
	}

	format (formatString: string): string {
		const year = this.year;
		const month = this.month;
		const day = this.day;
		const hours = this.hours;
		const minutes = this.minutes;
		const seconds = this.seconds;
		const milli = this.milliseconds;

		let value = "";
		for (const char of formatString) {
			switch (char) {
				case "l":
					value += this.dayOfTheWeek;
					break;
				case "D":
					value += this.dayOfTheWeek.slice(0, 3);
					break;
				case "F":
					value += SupiDate.months[month - 1];
					break;
				case "M":
					value += SupiDate.months[month - 1].slice(0, 3);
					break;
				case "S":
					value += SupiDate.getDaySuffix(day);
					break;

				case "d":
					value += SupiDate.zf(day, 2);
					break;
				case "j":
					value += day;
					break;
				case "m":
					value += SupiDate.zf(month, 2);
					break;
				case "n":
					value += month;
					break;
				case "Y":
					value += year;
					break;

				case "G":
					value += hours;
					break;
				case "H":
					value += SupiDate.zf(hours, 2);
					break;
				case "i":
					value += SupiDate.zf(minutes, 2);
					break;
				case "s":
					value += SupiDate.zf(seconds, 2);
					break;
				case "v":
					value += SupiDate.zf(milli, 3);
					break;

				default:
					value += char;
			}
		}
		return value;
	}

	isValid (): boolean {
		return !Number.isNaN(this.valueOf());
	}

	simpleDate (): string {
		return this.format("j.n.Y");
	}

	simpleDateTime (): string {
		return this.format("j.n.Y H:i:s");
	}

	fullDateTime (): string {
		return this.format("j.n.Y H:i:s.v");
	}

	sqlDate (): string {
		return this.format("Y-m-d");
	}

	sqlTime (): string {
		return this.format("H:i:s.v");
	}

	sqlDateTime (): string {
		return this.format("Y-m-d H:i:s.v");
	}

	setTimezoneOffset (offset: number): this {
		if (offset % 15 !== 0) {
			throw new Error("Unrecognized offset - make sure to use offset in minutes");
		}

		this.setMinutes(this.getMinutes() + this.getTimezoneOffset() + offset);
		return this;
	}

	discardTimeUnits (...units: Array<"h" | "m" | "s" | "ms">): this {
		for (const unit of units) {
			switch (unit) {
				case "h":
					this.setHours(0);
					break;
				case "m":
					this.setMinutes(0);
					break;
				case "s":
					this.setSeconds(0);
					break;
				case "ms":
					this.setMilliseconds(0);
					break;
			}
		}
		return this;
	}

	clone (): SupiDate {
		return new SupiDate(this);
	}

	addYears (y: number): this {
		this.year += y;
		return this;
	}

	addMonths (m: number): this {
		this.month += m;
		return this;
	}

	addDays (d: number): this {
		this.day += d;
		return this;
	}

	addHours (h: number): this {
		this.hours += h;
		return this;
	}

	addMinutes (m: number): this {
		this.minutes += m;
		return this;
	}

	addSeconds (s: number): this {
		this.seconds += s;
		return this;
	}

	addMilliseconds (ms: number): this {
		this.milliseconds += ms;
		return this;
	}

	get dayOfTheWeek () {
		switch (super.getDay()) {
			case 0: return "Sunday";
			case 1: return "Monday";
			case 2: return "Tuesday";
			case 3: return "Wednesday";
			case 4: return "Thursday";
			case 5: return "Friday";
			case 6: return "Saturday";
			/* istanbul ignore next */
			default: throw new RangeError("Day of the week is out of the range 0-6. Has the definition of a week changed since 2019?");
		}
	}

	get milliseconds (): number {
		return super.getMilliseconds();
	}

	set milliseconds (ms) {
		super.setMilliseconds(ms);
	}

	get seconds () {
		return super.getSeconds();
	}

	set seconds (s) {
		super.setSeconds(s);
	}

	get minutes () {
		return this.getMinutes();
	}

	set minutes (m) {
		super.setMinutes(m);
	}

	get hours () {
		return super.getHours();
	}

	set hours (h) {
		super.setHours(h);
	}

	get day (): DayOfMonth {
		return (super.getDate() as DayOfMonth);
	}

	set day (d) {
		super.setDate(d);
	}

	get month () {
		return super.getMonth() + 1;
	}

	set month (m) {
		super.setMonth(m - 1);
	}

	get year () {
		return super.getFullYear();
	}

	set year (y) {
		super.setFullYear(y);
	}
}
