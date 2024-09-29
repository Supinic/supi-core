import SupiError from "../../objects/error.js";
import QuerySingleton from "./index.js";
import type { PoolConnection } from "mariadb";
import { Database, Table, ColumnDefinition, Value, TableDefinition } from "../../@types/singletons/query/index.js";
import { MixedWhereHavingArgument, WhereHavingOptions } from "./recordset.js";

type Priority = "normal" | "low";
type ConstructorOptions = {
	transaction?: PoolConnection;
};
type Column = ColumnDefinition["name"];
type SetValue = {
	column: Column;
	value: Value;
};
type UpdateValue = {
	database: Database | null;
	table: Table | null;
};
type ResultObject = Record<string, Value>;

/**
 * Represents the UPDATE sql statement.
 */
export default class RecordUpdater {
	#query: QuerySingleton;
	#transaction: PoolConnection | null;
	#update: UpdateValue = { database: null, table: null };
	#set: SetValue[] = [];
	#where: string[] = [];

	#priority: Priority = "normal";
	#ignoreDuplicates = false;

	constructor (query: QuerySingleton, options: ConstructorOptions = {}) {
		this.#query = query;
		this.#transaction = options.transaction ?? null;
	}

	priority (value: Priority): this {
		if (!["normal", "low"].includes(value)) {
			throw new SupiError({
				message: "Incorrect priority value",
				args: { value }
			});
		}

		this.#priority = value;
		return this;
	}

	ignoreDuplicates (): this {
		this.#ignoreDuplicates = true;
		return this;
	}

	update (database: Database, table: Table): this {
		this.#update.database = database;
		this.#update.table = table;
		return this;
	}

	set (column: Column, value: Value): this {
		this.#set.push({ column, value });
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

	async toSQL (): Promise<string[]> {
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

		// `as TableDefinition` used while Query is not yet rewritten to TS
		const { columns } = await this.#query.getDefinition(this.#update.database, this.#update.table) as TableDefinition;
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

	async fetch (): Promise<ResultObject> {
		const sql = await this.toSQL();
		const sqlString = sql.join("\n");
		return await this.#query.transactionQuery(sqlString, this.#transaction);
	}
}
