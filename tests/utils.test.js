(async () => {
	const assert = require("assert");
	const unmockedDate = require("../objects/date.js");
	const range = (from, to) => [...Array(to - from + 1)].map((i, ind) => ind + from);

	globalThis.sb = {
		Config: {
			get: () => null
		}
	};

	await require("../")("sb", {
		whitelist: [
			"singletons/utils"
		]
	});

	sb.Date = class ZeroMockedDate extends unmockedDate {
		constructor () {
			super();
			this.setTime(0);
		}
	};

	describe("timeDelta", () => {
		const MINUTE = 60_000;
		const HOUR = 60 * MINUTE;
		const DAY = 24 * HOUR;
		const YEAR = 365 * DAY;

		const timeDelta = sb.Utils.timeDelta.bind(sb.Utils);

		it("checks types properly", function () {
			assert.doesNotThrow(() => timeDelta(new Date()));
			assert.doesNotThrow(() => timeDelta(new sb.Date()));
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
			const date = new unmockedDate(0);
			assert.strictEqual(timeDelta(date), "right now!");
		});

		it("parses milliseconds-specific times properly", () => {
			const futureDate = new unmockedDate(10);
			assert.strictEqual(timeDelta(futureDate), "in 10ms");
			assert.strictEqual(timeDelta(futureDate, true), "10ms");

			const pastDate = new unmockedDate(-10);
			assert.strictEqual(timeDelta(pastDate), "10ms ago");
			assert.strictEqual(timeDelta(pastDate, true), "10ms");
		});

		it("parses seconds properly", () => {
			for (let i = 1_000; i < 60_000; i += 10) {
				const futureDate = new unmockedDate(i);
				const expectedLongString = `in ${i / 1000}s`;
				const expectedShortString = `${i / 1000}s`;

				assert.strictEqual(timeDelta(futureDate), expectedLongString, "Input: " + i);
				assert.strictEqual(timeDelta(futureDate, true), expectedShortString, "Input: " + i);
			}

			for (let i = -1_000; i > -60_000; i -= 50) {
				const pastDate = new unmockedDate(i);
				const expectedLongString = `${Math.abs(i) / 1000}s ago`;
				const expectedShortString = `${Math.abs(i) / 1000}s`;

				assert.strictEqual(timeDelta(pastDate), expectedLongString, "Input: " + i);
				assert.strictEqual(timeDelta(pastDate, true), expectedShortString, "Input: " + i);
			}
		});

		it("rounds off milliseconds in context of seconds", () => {
			// 29.995 through 30.004, all resulting in "30s"
			const expectedLongString = "in 30s";
			const expectedShortString = "30s";
			const rounded = [29995, 29996, 29997, 29998, 29999, 30000, 30001, 30002, 30003, 30004];
			for (const time of rounded) {
				const date = new unmockedDate(time);
				assert.strictEqual(timeDelta(date), expectedLongString, "Input: " + time);
				assert.strictEqual(timeDelta(date, true), expectedShortString, "Input: " + time);
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
						timeDelta(new unmockedDate(time), true),
						string,
						"Input: " + time
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
						timeDelta(new unmockedDate(time), true),
						string,
						"Input: " + time
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
						timeDelta(new unmockedDate(time), true),
						string,
						"Input: " + time
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
						timeDelta(new unmockedDate(time), true),
						string,
						"Input: " + time
					);
				}
			}
		});
	});
})();