import SupiError from "../../objects/error.js";
import QuerySingleton, {
	Database,
	Table,
	ColumnDefinition,
	Field,
	JavascriptValue
} from "./index.js";
import type { PoolConnection } from "mariadb";

type ConstructorOptions = {
	transaction?: PoolConnection;
	database: Database;
	table: Table;
	threshold?: number;
};

type BatchRecord = Record<Field, JavascriptValue>;
type FindCallback = (value: BatchRecord, index: number, obj: BatchRecord[]) => boolean;

type InsertOptions = {
	duplicate?: (data: string[][], stringColumns: Field[]) => string;
	ignore?: boolean;
};

/**
 * Represents the SQL INSERT statement for multiple rows.
 * One instance is always locked to one table and some of its columns based on constructor.
 */
export default class Batch {
	#query: QuerySingleton;
	#transaction?: PoolConnection;

	readonly database: Database;
	readonly table: Table;
	records: BatchRecord[] = [];
	columns: ColumnDefinition[] = [];

	threshold = 1;
	ready = false;

	constructor (query: QuerySingleton, options: ConstructorOptions) {
		this.#query = query;
		this.#transaction = options.transaction;
		this.database = options.database;
		this.table = options.table;

		if (typeof options.threshold === "number") {
			this.threshold = options.threshold;
		}
	}

	async initialize (columns: Field[]): Promise<this> {
		const definition = await this.#query.getDefinition(this.database, this.table);
		for (const column of columns) {
			if (definition.columns.every(col => column !== col.name)) {
				throw new SupiError({
					message: "Unrecognized Batch column",
					args: {
						database: this.database,
						table: this.table,
						unrecognizedColumn: column,
						tableColumns: definition.columns
					}
				});
			}
		}

		this.columns = definition.columns.filter(column => columns.includes(column.name));
		this.ready = true;

		return this;
	}

	add (data: BatchRecord): number {
		for (const key of Object.keys(data)) {
			const column = this.columns.find(i => i.name === key);
			if (!column) {
				throw new SupiError({
					message: "Invalid batch column provided",
					args: {
						column: key, allowedColumns: this.columns.map(i => i.name)
					}
				});
			}
		}

		return (this.records.push(data) - 1);
	}

	delete (index: number): void {
		this.records.splice(index, 1);
	}

	find (callback: FindCallback): BatchRecord | undefined {
		return this.records.find(callback);
	}

	async insert (options: InsertOptions = {}): Promise<void> {
		// If there are not enough records, skip immediately
		if (this.records.length < this.threshold) {
			return;
		}

		const stringColumns = [];
		let data: string[][] = this.records.map(() => []);
		for (const column of this.columns) {
			const name = column.name;
			const type = column.type;
			stringColumns.push(this.#query.escapeIdentifier(name));

			for (let i = 0; i < this.records.length; i++) {
				const sql = this.#query.convertToSQL(this.records[i][name], type);
				data[i].push(sql);
			}
		}

		const { duplicate, ignore } = options;
		if (duplicate && ignore) {
			throw new SupiError({
				message: "Cannot set ignore and duplicate at the same time"
			});
		}

		data = data.filter(i => i.length !== 0);
		if (data.length !== 0) {
			const sqlString = [
				`INSERT ${ignore ? "IGNORE" : ""} INTO`,
				`\`${this.database}\`.\`${this.table}\``,
				`(${stringColumns.join(", ")})`,
				`VALUES (${data.map(row => row.join(", "))
					.join("), (")})`,
				(duplicate ? duplicate(data, stringColumns) : "")
			].join("\n");

			try {
				await this.#query.transactionQuery(sqlString, this.#transaction);
			}
			catch (e) {
				console.error("Batch SQL failed", e);
			}
		}

		this.clear();
	}

	clear () {
		this.records = [];
	}
}
