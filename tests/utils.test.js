import assert from "assert";
import SupiDate from "../objects/date.js";
import UtilsConstructor from "../singletons/utils.js";

const range = (from, to) => [...new Array(to - from + 1)].map((i, ind) => ind + from);
const Utils = new UtilsConstructor();

describe("timeDelta", () => {
	const MINUTE = 60_000;
	const HOUR = 60 * MINUTE;
	const DAY = 24 * HOUR;
	const YEAR = 365 * DAY;

	const timeDelta = (target, skipAffixes, respectLeapYears, deltaTo) => Utils.timeDelta(target, skipAffixes ?? false, respectLeapYears ?? false, deltaTo ?? new SupiDate(0));

	it("checks types properly", () => {
		assert.doesNotThrow(() => timeDelta(new Date()));
		assert.doesNotThrow(() => timeDelta(new SupiDate()));
		assert.doesNotThrow(() => timeDelta(12345));

		const mockedNumberValueOf = { valueOf: () => 12345 };
		assert.doesNotThrow(() => timeDelta(mockedNumberValueOf));

		assert.throws(() => timeDelta(null));
		assert.throws(() => timeDelta("string"));
		assert.throws(() => timeDelta({}));
		assert.throws(() => timeDelta([]));

		const mockedStringValueOf = { valueOf: () => "string" };
		assert.throws(() => timeDelta(mockedStringValueOf));
	});

	it("returns a special value for delta === 0", () => {
		const date = new SupiDate(0);
		assert.strictEqual(timeDelta(date), "right now!");
	});

	it("parses milliseconds-specific times properly", () => {
		const futureDate = new SupiDate(10);
		assert.strictEqual(timeDelta(futureDate), "in 10ms");
		assert.strictEqual(timeDelta(futureDate, true), "10ms");

		const pastDate = new SupiDate(-10);
		assert.strictEqual(timeDelta(pastDate), "10ms ago");
		assert.strictEqual(timeDelta(pastDate, true), "10ms");
	});

	it("parses seconds properly", () => {
		for (let i = 1000; i < 60_000; i += 10) {
			const futureDate = new SupiDate(i);
			const expectedLongString = `in ${i / 1000}s`;
			const expectedShortString = `${i / 1000}s`;

			assert.strictEqual(timeDelta(futureDate), expectedLongString, `Input: ${i}`);
			assert.strictEqual(timeDelta(futureDate, true), expectedShortString, `Input: ${i}`);
		}

		for (let i = -1000; i > -60_000; i -= 50) {
			const pastDate = new SupiDate(i);
			const expectedLongString = `${Math.abs(i) / 1000}s ago`;
			const expectedShortString = `${Math.abs(i) / 1000}s`;

			assert.strictEqual(timeDelta(pastDate), expectedLongString, `Input: ${i}`);
			assert.strictEqual(timeDelta(pastDate, true), expectedShortString, `Input: ${i}`);
		}
	});

	it("rounds off milliseconds in context of seconds", () => {
		// 29.995 through 30.004, all resulting in "30s"
		const expectedLongString = "in 30s";
		const expectedShortString = "30s";
		const rounded = [29995, 29996, 29997, 29998, 29999, 30000, 30001, 30002, 30003, 30004];
		for (const time of rounded) {
			const date = new SupiDate(time);
			assert.strictEqual(timeDelta(date), expectedLongString, `Input: ${time}`);
			assert.strictEqual(timeDelta(date, true), expectedShortString, `Input: ${time}`);
		}
	});

	it("parses minutes properly", () => {
		const definition = [
			[range(118500, 119499), "1m, 59s"],
			[range(119500, 120499), "2m, 0s"]
		];

		for (const [range, string] of definition) {
			for (const time of range) {
				assert.strictEqual(
					timeDelta(new SupiDate(time), true),
					string,
					`Input: ${time}`
				);
			}
		}
	});

	it("parses hours properly", () => {
		const definition = [
			[range(7_199_000, 7_199_499), "1h, 59m"],
			[range(7_199_500, 7_200_499), "2h, 0m"]
		];

		for (const [range, string] of definition) {
			for (const time of range) {
				assert.strictEqual(
					timeDelta(new SupiDate(time), true),
					string,
					`Input: ${time}`
				);
			}
		}
	});

	it("parses days properly", () => {
		const definition = [
			[range(48 * 3_600_000 - 1000, 48 * 3_600_000 - 501), "1d, 23h"],
			[range(48 * 3_600_000 - 499, 48 * 3_600_000 + 499), "2d, 0h"]
		];

		for (const [range, string] of definition) {
			for (const time of range) {
				assert.strictEqual(
					timeDelta(new SupiDate(time), true),
					string,
					`Input: ${time}`
				);
			}
		}
	});

	it("parses higher values properly", () => {
		const definition = [
			[range(2 * YEAR - 999, 2 * YEAR + 999), "2y, 0d"],
			[range(YEAR + 364 * DAY, YEAR + 364 * DAY + 999), "1y, 364d"]
		];

		for (const [range, string] of definition) {
			for (const time of range) {
				assert.strictEqual(
					timeDelta(new SupiDate(time), true),
					string,
					`Input: ${time}`
				);
			}
		}
	});

	it("shows leap years as 1y", () => {
		// now is 2020-01-01, the date to calculate to is 2030-01-01
		assert.strictEqual(
			timeDelta(
				new SupiDate("January 5, 2030 00:00:00 UTC"),
				false,
				true,
				new SupiDate("January 1, 2020 00:00:00 UTC")
			),
			"in 10y, 4d"
		);
		// reverse
		assert.strictEqual(
			timeDelta(
				new SupiDate("December 29, 2019 00:00:00 UTC"),
				false,
				true,
				new SupiDate("January 1, 2030 00:00:00 UTC")
			),
			"10y, 3d ago"
		);

		// mode with leap year calculation disabled
		assert.strictEqual(
			timeDelta(
				new SupiDate("January 1, 2030 00:00:00 UTC"),
				true,
				false,
				new SupiDate("January 1, 2020 00:00:00 UTC")
			),
			"10y, 3d"
		);
	});
});
