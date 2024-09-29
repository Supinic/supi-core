import SupiError from "../../objects/error.js";
import QuerySingleton, { Database, Table, Value } from "./index.js";
import type { PoolConnection } from "mariadb";
import { MixedWhereHavingArgument, WhereHavingOptions } from "./recordset.js";

type ConstructorOptions = {
	transaction?: PoolConnection;
};
type FromValue = {
	database: Database | null;
	table: Table | null;
};
type ResultObject = Record<string, Value>;

/**
 * Represents the UPDATE sql statement.
 */
export default class RecordDeleter {
	#query: QuerySingleton;
	#transaction?: PoolConnection;
	#deleteFrom: FromValue = { database: null, table: null };
	#where: string[] = [];
	#confirmedFullDelete = false;

	constructor (query: QuerySingleton, options: ConstructorOptions = {}) {
		this.#query = query;
		this.#transaction = options.transaction;
	}

	/**
	 * Syntactic sugar, so that the resulting chain call looks nice.
	 * `recordDeleter.delete().from().where()`
	 * The method doesn't actually do anything.
	 */
	delete (): this {
		return this;
	}

	from (database: Database, table: Table): this {
		this.#deleteFrom.database = database;
		this.#deleteFrom.table = table;
		return this;
	}

	where (...args: MixedWhereHavingArgument[]): this {
		let options: WhereHavingOptions = {};
		if (args[0] && typeof args[0] === "object") {
			options = args[0];
			args.shift();
		}

		if (typeof options.condition !== "undefined" && !options.condition) {
			return this;
		}

		let format = "";
		if (typeof args[0] === "string") {
			format = args.shift() as string;
		}

		let index = 0;
		format = format.replace(this.#query.formatSymbolRegex, (fullMatch, param) => (
			this.#query.parseFormatSymbol(param, args[index++])
		));

		this.#where.push(format);

		return this;
	}

	/**
	 * Must be called if a RecordDeleter is meant to be used without calling the `where()` method.
	 * This prevents data deletion in case the `where` method call is omitted by accident.
	 */
	confirm () {
		this.#confirmedFullDelete = true;
		return this;
	}

	/**
	 * Translates the RecordDeleter to its SQL representation.
	 */
	async toSQL (): Promise<string[]> {
		if (!this.#deleteFrom.database || !this.#deleteFrom.table) {
			throw new SupiError({
				message: "No UPDATE database/table in RecordUpdater - invalid definition"
			});
		}

		const sql = [];
		sql.push(`DELETE FROM \`${this.#deleteFrom.database}\`.\`${this.#deleteFrom.table}\``);

		if (this.#where.length !== 0) {
			sql.push(`WHERE (${this.#where.join(") AND (")})`);
		}
		else if (!this.#confirmedFullDelete) {
			throw new SupiError({
				message: "Unconfirmed full table deletion",
				args: {
					from: this.#deleteFrom
				}
			});
		}

		return sql;
	}

	async fetch (): Promise<ResultObject> {
		const sql = await this.toSQL();
		const sqlString = sql.join("\n");
		return await this.#query.transactionQuery(sqlString, this.#transaction) as ResultObject;
	}
}
