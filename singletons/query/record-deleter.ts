import { SupiError } from "../../objects/error.js";
import QuerySingleton, { Database, Table, Value, formatSymbolRegex, FormatValue, FormatSymbol } from "./index.js";
import type { PoolConnection } from "mariadb";

type ConstructorOptions = {
	transaction?: PoolConnection;
};
type FromValue = {
	database: Database | null;
	table: Table | null;
};
type ResultObject = Record<string, Value>;

type ConditionObject = { condition: boolean; };

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

	where (format: string, ...args: FormatValue[]): this;
	where (options: ConditionObject, format: string, ...args: FormatValue[]): this;
	where (first: string | ConditionObject, ...second: FormatValue[]): this {
		let args: FormatValue[];
		let options: Partial<ConditionObject>;
		let format: string;

		if (first && typeof first === "object") {
			if (typeof second[0] !== "string") {
				throw new SupiError({
					message: "Invalid combination of arguments, must be `string`"
				});
			}

			options = first;
			format = second[0];
			args = second.slice(1);
		}
		else {
			options = {};
			format = first;
			args = second;
		}

		if (typeof options.condition !== "undefined" && !options.condition) {
			return this;
		}

		let index = 0;
		format = format.replace(formatSymbolRegex, (fullMatch, param: FormatSymbol) => (
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
	toSQL (): string[] {
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
		const sql = this.toSQL();
		const sqlString = sql.join("\n");
		return await this.#query.transactionQuery(sqlString, this.#transaction) as ResultObject;
	}
}
