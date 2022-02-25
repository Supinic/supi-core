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

	/**
	 * Returns the suffix used in English for a given day.
	 * @param {number} number Day of the month (1..31)
	 * @returns {"st"|"nd"|"rd"|"th"}
	 */
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

	/**
	 * Pads a number with specified number of zeroes.
	 * @private
	 * @param {number} number
	 * @param {number} padding
	 * @returns {string}
	 */
	static zf (number, padding) {
		return ("0".repeat(padding) + number).slice(-padding);
	}

	/**
	 * Compares two instances for their equality
	 * @param {sb.Date} from
	 * @param {sb.Date} to
	 * @returns {boolean}
	 */
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

	/**
	 * Creates the instance. Uses the same constructor as native Date does.
	 * @param {*} args
	 */
	constructor (...args) {
		if (args.length > 1 && args.every(i => typeof i === "number")) {
			// Subtract one from the month parameter, because of how stupid the JS Date constructor does it.
			args[1] = args[1] - 1;
		}

		super(...args);
	}

	/**
	 * Formats the instance into specified format.
	 * @param {string} formatString
	 * @returns {string}
	 */
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

	/**
	 * @returns {string} For example 1.3.2021
	 */
	simpleDate () {
		return this.format("j.n.Y");
	}

	/**
	 * @returns {string} For example 1.3.2021 08:07:01
	 */
	simpleDateTime () {
		return this.format("j.n.Y H:i:s");
	}

	/**
	 * @returns {string} For example 1.3.2021 08:07:01.055
	 */
	fullDateTime () {
		return this.format("j.n.Y H:i:s.v");
	}

	/**
	 * @returns {string} For example 2021-03-01
	 */
	sqlDate () {
		return this.format("Y-m-d");
	}

	/**
	 * @returns {string} For example 08:07:01.055
	 */
	sqlTime () {
		return this.format("H:i:s.v");
	}

	/**
	 * @returns {string} For example 2021-03-01 08:07:01.005
	 */
	sqlDateTime () {
		return this.format("Y-m-d H:i:s.v");
	}

	/**
	 * @param {number} offset in minutes
	 * @returns {sb.Date}
	 */
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

	/**
	 * Sets the provided time units to zero.
	 * @param {..."h"|"m"|"s"|"ms"} units
	 * @returns {sb.Date}
	 */
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

	/**
	 * Clones the current CustomDate. The new object is independent of the old one.
	 * @returns {sb.Date}
	 */
	clone () {
		return new this.constructor(this);
	}

	/**
	 * @param {number} y Number of years to add.
	 * @returns {sb.Date}
	 */
	addYears (y) {
		this.year += y;
		return this;
	}

	/**
	 * @param {number} m Number of months to add.
	 * @returns {sb.Date}
	 */
	addMonths (m) {
		this.month += m;
		return this;
	}

	/**
	 * @param {number} d Number of days to add.
	 * @returns {sb.Date}
	 */
	addDays (d) {
		this.day += d;
		return this;
	}

	/**
	 * @param {number} h Number of hours to add.
	 * @returns {sb.Date}
	 */
	addHours (h) {
		this.hours += h;
		return this;
	}

	/**
	 * @param {number} m Number of minutes to add.
	 * @returns {sb.Date}
	 */
	addMinutes (m) {
		this.minutes += m;
		return this;
	}

	/**
	 * @param {number} s Number of seconds to add.
	 * @returns {sb.Date}
	 */
	addSeconds (s) {
		this.seconds += s;
		return this;
	}

	/**
	 * @param {number} ms Number of milliseconds to add.
	 * @returns {sb.Date}
	 */
	addMilliseconds (ms) {
		this.milliseconds += ms;
		return this;
	}

	/**
	 * @returns {"Sunday"|"Monday"|"Tuesday"|"Wednesday"|"Thursday"|"Friday"|"Saturday"} The day of the week in English.
	 */
	get dayOfTheWeek () {
		switch (super.getDay()) {
			case 0: return "Sunday";
			case 1: return "Monday";
			case 2: return "Tuesday";
			case 3: return "Wednesday";
			case 4: return "Thursday";
			case 5: return "Friday";
			case 6: return "Saturday";
			default: throw new RangeError("Day of the week is out of the range 0-6. Has the definition of a week changed since 2019?");
		}
	}

	/**
	 * @returns {number}
	 */
	get milliseconds () {
		return super.getMilliseconds();
	}

	/**
	 * @param {number} ms
	 */
	set milliseconds (ms) {
		super.setMilliseconds(ms);
	}

	/**
	 * @returns {number}
	 */
	get seconds () {
		return super.getSeconds();
	}

	/**
	 * @param {number} s
	 */
	set seconds (s) {
		super.setSeconds(s);
	}

	/**
	 * @returns {number}
	 */
	get minutes () {
		return this.getMinutes();
	}

	/**
	 * @param {number} m
	 */
	set minutes (m) {
		super.setMinutes(m);
	}

	/**
	 * @returns {number}
	 */
	get hours () {
		return super.getHours();
	}

	/**
	 * @param {number} h
	 */
	set hours (h) {
		super.setHours(h);
	}

	/**
	 * @returns {number}
	 */
	get day () {
		return super.getDate();
	}

	/**
	 * @param {number} d
	 */
	set day (d) {
		super.setDate(d);
	}

	/**
	 * @returns {number}
	 */
	get month () {
		return super.getMonth() + 1;
	}

	/**
	 * @param {number} m
	 */
	set month (m) {
		super.setMonth(m - 1);
	}

	/**
	 * @returns {number}
	 */
	get year () {
		return super.getFullYear();
	}

	/**
	 * @param {number} y
	 */
	set year (y) {
		super.setFullYear(y);
	}
};
