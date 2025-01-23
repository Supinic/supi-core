import * as assert from "node:assert";
import SupiDate from "../objects/date.js";

/**
 * Generates an Array pre-filled with the index
 * @param length
 */
const simpleRange = (length: number) => [...new Array(length)].map((_, idx) => idx);

describe("SupiDate", () => {
	describe("getDaySuffix", () => {
		it("should return the correct suffix", () => {
			assert.deepEqual(
				([1, 2, 3, 4, 11, 12, 13, 21, 22, 23] as const).map(i => SupiDate.getDaySuffix(i)),
				["st", "nd", "rd", "th", "th", "th", "th", "st", "nd", "rd"]);
		});
	});

	describe("zf", () => {
		it("should pad a number with leading zeros", () => {
			assert.equal(SupiDate.zf(1, 3), "001");
			assert.equal(SupiDate.zf(123, 3), "123");
		});
	});

	describe("equals", () => {
		it("should work with itself", () => {
			assert.strictEqual(true, SupiDate.equals(new SupiDate(2020, 1, 1), new SupiDate(2020, 1, 1)));
			assert.strictEqual(true, !SupiDate.equals(new SupiDate(2020, 1, 1), new SupiDate(2021, 1, 1)));
		});
		it("should work with native dates", () => {
			assert.strictEqual(true, SupiDate.equals(new SupiDate(2020, 1, 1), new Date(2020, 0, 1)));
			assert.strictEqual(true, !SupiDate.equals(new SupiDate(2020, 1, 1), new Date(2021, 0, 1)));
		});
		it("should work with the same object", () => {
			const date = new SupiDate(2020, 1, 1);
			assert.strictEqual(true, SupiDate.equals(date, date));
		});
		it("should work with clones", () => {
			const date = new SupiDate(2020, 1, 1);
			const cloned = date.clone();
			assert.strictEqual(true, SupiDate.equals(date, cloned));
		});
	});

	describe("format", () => {
		describe("formatters", () => {
			describe("l", () => {
				it("should print the day of the week", () => {
					const actual = simpleRange(7).map(i => new SupiDate(2021, 10, i + 1).format("l"));
					const expected = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
					assert.deepEqual(actual, expected);
				});
			});
			describe("D", () => {
				it("should print the short day of the week", () => {
					const actual = simpleRange(7).map(i => new SupiDate(2021, 10, i + 1).format("D"));
					const expected = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
					assert.deepEqual(actual, expected);
				});
			});
			describe("F", () => {
				it("should print the month", () => {
					const actual = simpleRange(12).map(i => new SupiDate(2021, i + 1, 1).format("F"));
					const expected = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
					assert.deepEqual(actual, expected);
				});
			});
			describe("M", () => {
				it("should print the short month", () => {
					const actual = simpleRange(12).map(i => new SupiDate(2021, i + 1, 1).format("M"));
					const expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					assert.deepEqual(actual, expected);
				});
			});
			describe("S", () => {
				it("should print the day suffix", () => {
					assert.deepEqual(
						[1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(i => new SupiDate(2021, 1, i).format("S")),
						["st", "nd", "rd", "th", "th", "th", "th", "st", "nd", "rd"]);
				});
			});
			describe("d", () => {
				it("should print the padded day", () => {
					assert.equal(new SupiDate(2021, 1, 2).format("d"), "02");
					assert.equal(new SupiDate(2021, 1, 12).format("d"), "12");
				});
			});
			describe("j", () => {
				it("should print the day", () => {
					assert.equal(new SupiDate(2021, 1, 2).format("j"), "2");
					assert.equal(new SupiDate(2021, 1, 12).format("j"), "12");
				});
			});
			describe("m", () => {
				it("should print the padded month", () => {
					assert.equal(new SupiDate(2021, 2, 1).format("m"), "02");
					assert.equal(new SupiDate(2021, 12, 1).format("m"), "12");
				});
			});
			describe("n", () => {
				it("should print the month", () => {
					assert.equal(new SupiDate(2021, 2, 1).format("n"), "2");
					assert.equal(new SupiDate(2021, 12, 1).format("n"), "12");
				});
			});
			describe("Y", () => {
				it("should print the year", () => {
					assert.equal(new SupiDate(2021, 1, 1).format("Y"), "2021");
				});
			});
			describe("G", () => {
				it("should print the hour", () => {
					assert.equal(new SupiDate(2021, 1, 1, 1).format("G"), "1");
					assert.equal(new SupiDate(2021, 1, 1, 12).format("G"), "12");
				});
			});
			describe("H", () => {
				it("should print the padded hour", () => {
					assert.equal(new SupiDate(2021, 1, 1, 1).format("H"), "01");
					assert.equal(new SupiDate(2021, 1, 1, 12).format("H"), "12");
				});
			});
			describe("i", () => {
				it("should print the padded minute", () => {
					assert.equal(new SupiDate(2021, 1, 1, 1, 1).format("i"), "01");
					assert.equal(new SupiDate(2021, 1, 1, 1, 42).format("i"), "42");
				});
			});
			describe("s", () => {
				it("should print the padded minute", () => {
					assert.equal(new SupiDate(2021, 1, 1, 1, 1, 1).format("s"), "01");
					assert.equal(new SupiDate(2021, 1, 1, 1, 1, 42).format("s"), "42");
				});
			});
			describe("v", () => {
				it("should print the padded minute", () => {
					assert.equal(new SupiDate(2021, 1, 1, 1, 1, 0, 1).format("v"), "001");
					assert.equal(new SupiDate(2021, 1, 1, 1, 1, 0, 42).format("v"), "042");
					assert.equal(new SupiDate(2021, 1, 1, 1, 1, 0, 187).format("v"), "187");
				});
			});
		});
		it("should concat multiple formatters", () => {
			assert.equal(new SupiDate(2021, 10, 1).format("Ymd"), "20211001");
		});
		it("should keep non formatter characters", () => {
			assert.equal(new SupiDate(2021, 10, 1).format("Y-m-d"), "2021-10-01");
		});
	});

	describe("isValid", () => {
		const MAX_VALUE = 864e5 * 100_000_000;
		const MIN_VALUE = -864e5 * 100_000_000;

		it("should return true for valid dates", () => {
			const values = [
				// null, // Yes apparently `null` is a valid constructor for Date
				0,
				-1e12,
				1e12,
				MIN_VALUE,
				MAX_VALUE,
				"0",
				"1",
				"1970-01-01",
				"2022-06-01 10:00",
				"1999-09-19 19:19:19.191"
			];

			for (const value of values) {
				let date;
				assert.doesNotThrow(() => { date = new SupiDate(value); });
				assert.strictEqual(date!.isValid(), true, `Date should be valid for value "${value}"`);
			}
		});

		it("should return false for invalid dates", () => {
			const values = [
				MIN_VALUE - 1,
				MAX_VALUE + 1,
				-Infinity,
				Infinity,
				NaN,
				"",
				"this text cannot be parsed"
			];

			for (const value of values) {
				let date;
				assert.doesNotThrow(() => { date = new SupiDate(value); });
				assert.strictEqual(date!.isValid(), false, "Date should be invalid");
			}
		});
	});

	describe("setTimezoneOffset", () => {
		it("should apply the offset", () => {
			const date = new SupiDate();
			const other = date.clone();
			date.setTimezoneOffset(60);
			other.addMinutes(other.getTimezoneOffset() + 60);
			assert.strictEqual(true, SupiDate.equals(date, other));
		});
		it("should only accept quarter hours", () => {
			assert.throws(() => new SupiDate(2021, 10, 1).setTimezoneOffset(42));
			assert.throws(() => new SupiDate(2021, 10, 1).setTimezoneOffset(NaN));
		});
	});

	describe("discardTimeUnits", () => {
		it("should discard hours", () => {
			assert.equal(new SupiDate(2021, 10, 1, 12).discardTimeUnits("h").hours, 0);
		});
		it("should discard minutes", () => {
			assert.equal(new SupiDate(2021, 10, 1, 12, 42).discardTimeUnits("m").minutes, 0);
		});
		it("should discard seconds", () => {
			assert.equal(new SupiDate(2021, 10, 1, 12, 42, 43).discardTimeUnits("s").seconds, 0);
		});
		it("should discard milliseconds", () => {
			assert.equal(new SupiDate(2021, 10, 1, 12, 42, 43, 44).discardTimeUnits("ms").milliseconds, 0);
		});
		it("should discard multiple units at once", () => {
			const date = new SupiDate(2021, 10, 1, 12, 42, 43, 44).discardTimeUnits("h", "ms", "m");
			assert.deepEqual([date.hours, date.minutes, date.seconds, date.milliseconds], [0, 0, 43, 0]);
		});
	});

	describe("clone", () => {
		it("should clone the object", () => {
			const d1 = new SupiDate(2021, 10, 1);
			const d2 = d1.clone();
			d2.setHours(4);
			assert.deepEqual([d1.hours, d2.hours], [0, 4]);
			assert.strictEqual(true, d1 !== d2);
		});
	});

	describe("simpleDate", () => {
		it("should format the date correctly", () => {
			assert.equal(new SupiDate(2021, 9, 1).simpleDate(), "1.9.2021");
		});
	});

	describe("simpleDateTime", () => {
		it("should format the date correctly", () => {
			assert.equal(new SupiDate(2021, 9, 1, 4, 2, 1).simpleDateTime(), "1.9.2021 04:02:01");
		});
	});

	describe("fullDateTime", () => {
		it("should format the date correctly", () => {
			assert.equal(new SupiDate(2021, 9, 1, 4, 2, 1, 55).fullDateTime(), "1.9.2021 04:02:01.055");
		});
	});

	describe("sqlDate", () => {
		it("should format the date correctly", () => {
			assert.equal(new SupiDate(2021, 9, 1).sqlDate(), "2021-09-01");
		});
	});

	describe("sqlTime", () => {
		it("should format the date correctly", () => {
			assert.equal(new SupiDate(2021, 9, 1, 4, 2, 1, 55).sqlTime(), "04:02:01.055");
		});
	});

	describe("sqlDateTime", () => {
		it("should format the date correctly", () => {
			assert.equal(new SupiDate(2021, 9, 1, 4, 2, 1, 55).sqlDateTime(), "2021-09-01 04:02:01.055");
		});
	});

	describe("setters", () => {
		describe("year", () => {
			it("should change the year", () => {
				const date = new SupiDate(2021, 10, 1);
				date.year += 1;
				assert.equal(date.year, 2022);
			});
		});
		describe("month", () => {
			it("should change the month", () => {
				const date = new SupiDate(2021, 12, 1);
				date.month += 1;
				assert.equal(date.month, 1);
			});
		});
		describe("day", () => {
			it("should change the day", () => {
				const date = new SupiDate(2021, 10, 31);
				date.day += 1;
				assert.equal(date.day, 1);
			});
		});
		describe("hour", () => {
			it("should change the hour", () => {
				const date = new SupiDate(2021, 10, 31, 23);
				date.hours += 1;
				assert.equal(date.hours, 0);
			});
		});
		describe("minutes", () => {
			it("should change the minutes", () => {
				const date = new SupiDate(2021, 10, 31, 23, 59);
				date.minutes += 1;
				assert.equal(date.minutes, 0);
			});
		});
		describe("seconds", () => {
			it("should change the seconds", () => {
				const date = new SupiDate(2021, 10, 31, 23, 59, 59);
				date.seconds += 1;
				assert.equal(date.seconds, 0);
			});
		});
		describe("milliseconds", () => {
			it("should change the milliseconds", () => {
				const date = new SupiDate(2021, 10, 31, 23, 59, 59, 999);
				date.milliseconds += 1;
				assert.equal(date.milliseconds, 0);
			});
		});
	});

	describe("add methods", () => {
		describe("addYears", () => {
			it("should change the year", () => {
				const date = new SupiDate(2021, 10, 1);
				date.addYears(1);
				assert.equal(date.year, 2022);
			});
		});
		describe("addMonths", () => {
			it("should change the month", () => {
				const date = new SupiDate(2021, 12, 1);
				date.addMonths(1);
				assert.equal(date.month, 1);
			});
		});
		describe("addDays", () => {
			it("should change the day", () => {
				const date = new SupiDate(2021, 10, 31);
				date.addDays(1);
				assert.equal(date.day, 1);
			});
		});
		describe("addHours", () => {
			it("should change the hour", () => {
				const date = new SupiDate(2021, 10, 31, 23);
				date.addHours(1);
				assert.equal(date.hours, 0);
			});
		});
		describe("addMinutes", () => {
			it("should change the minutes", () => {
				const date = new SupiDate(2021, 10, 31, 23, 59);
				date.addMinutes(1);
				assert.equal(date.minutes, 0);
			});
		});
		describe("addSeconds", () => {
			it("should change the seconds", () => {
				const date = new SupiDate(2021, 10, 31, 23, 59, 59);
				date.addSeconds(1);
				assert.equal(date.seconds, 0);
			});
		});
		describe("addMilliseconds", () => {
			it("should change the milliseconds", () => {
				const date = new SupiDate(2021, 10, 31, 23, 59, 59, 999);
				date.addMilliseconds(1);
				assert.equal(date.milliseconds, 0);
			});
		});
	});
});
