/**
 * Extended and simpler-to-use version of native Date
 */
module.exports = class CustomDate extends Date {
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
	];

	static getDaySuffix (number) {
		if (typeof number !== "number" || Math.trunc(number) !== number) {
			throw new Error("Input must be an integer");
		}

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

	static zf (number, padding) {
		return ("0".repeat(padding) + number).slice(-padding);
	}

	static equals (from, to) {
		const fromValue = from?.valueOf();
		const toValue = to?.valueOf();
		if (typeof fromValue !== "number") {
			throw new Error("from value cannot be converted to a number");
		}
		else if (typeof toValue !== "number") {
			throw new Error("to value cannot be converted to a number");
		}

		return (fromValue === toValue);
	}

	constructor (...args) {
		if (args.length > 1 && args.every(i => typeof i === "number")) {
			// Subtract one from the month parameter, because of how stupid the JS Date constructor does it.
			args[1] = args[1] - 1;
		}

		super(...args);
	}

	format (formatString) {
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
					value += CustomDate.months[month - 1];
					break;
				case "M":
					value += CustomDate.months[month - 1].slice(0, 3);
					break;
				case "S":
					value += CustomDate.getDaySuffix(day);
					break;

				case "d":
					value += CustomDate.zf(day, 2);
					break;
				case "j":
					value += day;
					break;
				case "m":
					value += CustomDate.zf(month, 2);
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
					value += CustomDate.zf(hours, 2);
					break;
				case "i":
					value += CustomDate.zf(minutes, 2);
					break;
				case "s":
					value += CustomDate.zf(seconds, 2);
					break;
				case "v":
					value += CustomDate.zf(milli, 3);
					break;

				default:
					value += char;
			}
		}
		return value;
	}

	isValid () {
		return (Number.isNaN(this.valueOf()) === false);
	}

	simpleDate () {
		return this.format("j.n.Y");
	}

	simpleDateTime () {
		return this.format("j.n.Y H:i:s");
	}

	fullDateTime () {
		return this.format("j.n.Y H:i:s.v");
	}

	sqlDate () {
		return this.format("Y-m-d");
	}

	sqlTime () {
		return this.format("H:i:s.v");
	}
	sqlDateTime () {
		return this.format("Y-m-d H:i:s.v");
	}

	setTimezoneOffset (offset) {
		offset = Number(offset);

		if (Number.isNaN(offset)) {
			throw new Error("Invalid offset");
		}
		else if (offset % 15 !== 0) {
			throw new Error("Unrecognized offset - make sure to use offset in minutes");
		}

		this.setMinutes(this.getMinutes() + this.getTimezoneOffset() + offset);
		return this;
	}

	discardTimeUnits (...units) {
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
				default:
					throw new Error(`Unrecognized time unit ${unit}`);
			}
		}
		return this;
	}

	clone () {
		return new this.constructor(this);
	}

	addYears (y) {
		this.year += y;
		return this;
	}

	addMonths (m) {
		this.month += m;
		return this;
	}

	addDays (d) {
		this.day += d;
		return this;
	}

	addHours (h) {
		this.hours += h;
		return this;
	}

	addMinutes (m) {
		this.minutes += m;
		return this;
	}

	addSeconds (s) {
		this.seconds += s;
		return this;
	}

	addMilliseconds (ms) {
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

	get milliseconds () {
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

	get day () {
		return super.getDate();
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
};
