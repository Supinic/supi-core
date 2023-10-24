import SupiError from "../../objects/error.js";

/**
 * Represents the UPDATE sql statement.
 */
export default class RecordUpdater {
	#query;
	#transaction;
	#update = { database: null, table: null };
	#set = [];
	#where = [];

	#priority = "normal";
	#ignoreDuplicates = false;

	constructor (query, options = {}) {
		/** @type {Query} */
		this.#query = query;
		this.#transaction = options.transaction ?? null;
	}

	priority (value) {
		if (!["normal", "low"].includes(value)) {
			throw new SupiError({
				message: "Incorrect priority value",
				args: { value }
			});
		}

		this.#priority = value;
		return this;
	}

	ignoreDuplicates () {
		this.#ignoreDuplicates = true;
		return this;
	}

	update (database, table) {
		this.#update.database = database;
		this.#update.table = table;
		return this;
	}

	set (column, value) {
		this.#set = this.#set.concat({ column, value });
		return this;
	}

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

	async toSQL () {
		if (!this.#update.database || !this.#update.table) {
			throw new SupiError({
				message: "No UPDATE database/table in RecordUpdater - invalid definition"
			});
		}
		else if (this.#set.length === 0) {
			throw new SupiError({
				message: "No SET in RecordUpdater - invalid definition"
			});
		}

		const sql = [];
		const set = [];
		const { columns } = await this.#query.getDefinition(this.#update.database, this.#update.table);
		const priority = (this.#priority === "low") ? "LOW_PRIORITY " : "";
		const ignore = (this.#ignoreDuplicates) ? "IGNORE " : "";

		sql.push(`UPDATE ${priority} ${ignore} \`${this.#update.database}\`.\`${this.#update.table}\``);

		for (const { column, value } of this.#set) {
			const definition = columns.find(i => i.name === column);
			if (!definition) {
				throw new SupiError({
					message: `Unrecognized column "${column}"`
				});
			}

			if (value?.useField) {
				set.push(`${column} = ${value.value}`);
			}
			else {
				set.push(`${column} = ${this.#query.convertToSQL(value, definition.type)}`);
			}
		}

		sql.push(`SET ${set.join(", ")}`);
		if (this.#where.length !== 0) {
			sql.push(`WHERE (${this.#where.join(") AND (")})`);
		}

		return sql;
	}

	async fetch () {
		const sql = await this.toSQL();
		const sqlString = sql.join("\n");
		return await this.#query.transactionQuery(sqlString, this.#transaction);
	}
}
