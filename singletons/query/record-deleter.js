/**
 * Represents the UPDATE sql statement.
 */
module.exports = class RecordDeleter {
	#query = null;
	#deleteFrom = { database: null, table: null };
	#where = [];
	#confirmedFullDelete = false;

	/**
	 * Creates a new Recordset instance.
	 * @param {Query} query
	 * @name {Recordset}
	 */
	constructor (query) {
		/** @type {Query} */
		this.#query = query;
	}

	/**
	 * Placeholder for the "correct" SQL syntax
	 * @returns {RecordDeleter}
	 */
	delete () {
		return this;
	}

	/**
	 * Creates a FROM statement for DELETE
	 * @param {string} database
	 * @param {string} table
	 * @returns {RecordDeleter}
	 */
	from (database, table) {
		this.#deleteFrom.database = database;
		this.#deleteFrom.table = table;
		return this;
	}

	/**
	 * Sets a WHERE condition.
	 * First parameter can be an option argument {@link WhereHavingParams}
	 * Multiple formatting symbols {@link FormatSymbol} can be used
	 * @param {Array.<string|FormatSymbol|WhereHavingParams>} args
	 * @returns {RecordDeleter}
	 */
	where (...args) {
		let options = {};
		if (args[0] && args[0].constructor === Object) {
			options = args[0];
			args.shift();
		}

		if (typeof options.condition !== "undefined" && !options.condition) {
			return this;
		}

		let format = "";
		if (typeof args[0] === "string") {
			format = args.shift();
		}

		let index = 0;
		format = format.replace(this.#query.formatSymbolRegex, (fullMatch, param) => (
			this.#query.parseFormatSymbol(param, args[index++])
		));

		this.#where = this.#where.concat(format);

		return this;
	}

	/**
	 * If there is a need to delete without WHERE, this flag must be set.
	 * Otherwise, a no-condition DELETE will not be performed, and ends with an exception.
	 * @returns {RecordDeleter}
	 * @throws {sb.Error} If no FROM database/table have been provided.
	 */
	confirm () {
		this.#confirmedFullDelete = true;
		return this;
	}

	/**
	 * Translates the RecordDeleter to its SQL representation.
	 * @returns {Promise<string[]>}
	 * @throws {sb.Error} If no FROM database/table have been provided.
	 */
	async toSQL () {
		if (!this.#deleteFrom.database || !this.#deleteFrom.table) {
			throw new sb.Error({
				message: "No UPDATE database/table in RecordUpdater - invalid definition"
			});
		}

		const sql = [];
		sql.push(`DELETE FROM \`${this.#deleteFrom.database}\`.\`${this.#deleteFrom.table}\``);

		if (this.#where.length !== 0) {
			sql.push(`WHERE (${this.#where.join(") AND (")})`);
		}
		else if (!this.#confirmedFullDelete) {
			throw new sb.Error({
				message: "Unconfirmed full table deletion",
				args: {
					from: this.#deleteFrom
				}
			});
		}

		return sql;
	}

	/**
	 * Runs the UPDATE SQL query and returns the status object.
	 * @returns {Object}
	 */
	async fetch () {
		const sql = await this.toSQL();
		return await this.#query.raw(...sql);
	}
};
