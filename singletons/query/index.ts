import SupiDate from "../../objects/date.js";
import SupiError from "../../objects/error.js";

import Batch from "./batch.js";
import Recordset, { ResultObject as RecordsetResultObject } from "./recordset.js";
import RecordDeleter from "./record-deleter.js";
import RecordUpdater from "./record-updater.js";
import Row from "./row.js";

import { createPool as createMariaDbPool, Pool, PoolConnection, SqlError, Types as ColumnType } from "mariadb";
import type { SimpleGenericData } from "../../@types/globals.js";

const updateBatchLimit = 1000;
export const formatSymbolRegex = /%(s\+|n\+|b|dt|d|n|p|s|t|\*?like\*?)/g;
const defaultPoolOptions = {
	multipleStatements: true,
	insertIdAsNumber: true,
	decimalAsNumber: true,
	bigIntAsNumber: false
};

const isValidPositiveInteger = (input: number, min = 0) => Number.isInteger(input) && (input >= min);
const isStringArray = (input: Array<string|number>): input is string[] => input.every(i => typeof i === "string");
const isProperNumberArray = (input: Array<string|number>): input is number[] => (
	input.every(i => typeof i === "number" && !Number.isNaN(i))
);
const isMariaSet = (input: SqlValue): input is string[] => Array.isArray(input) && isStringArray(input);

const getTypeName = (input: unknown): string => {
	if (input === null) {
		return "null";
	}
	else if (input === undefined) {
		return "undefined";
	}
	else if (typeof input === "object" && typeof input?.constructor?.name === "string") {
		return input.constructor.name;
	}
	else {
		return typeof input;
	}
};

export type Value = string | number | bigint | SupiDate | null;

/**
 * The "INT" value is added on top of `mariadb`s types, because it uses two different enums for column types.
 * Compare the type `3` defined in `field-type.js` and in `types/index.d.ts`:
 * - https://github.com/mariadb-corporation/mariadb-connector-nodejs/blob/master/lib/const/field-type.js#L12
 * - https://github.com/mariadb-corporation/mariadb-connector-nodejs/blob/master/types/index.d.ts#L933
*/
export type ExtendedColumnType = ColumnType | "INT";
export declare type MariaRowMeta = {
	collation: {
		index: number;
		name: string;
		charset: string;
		maxLength: number;
	};
	columnLength: number;
	columnType: number;
	flags: number;
	scale: number;
	type: ColumnType;
	name: () => string;
}

export type ColumnDefinition = {
	name: string;
	type: ExtendedColumnType,
	notNull: boolean;
	primaryKey: boolean;
	unsigned: boolean;
	autoIncrement: boolean;
	/** @description If true, the column is a numeric field left-filled with zeroes */
	zeroFill: boolean;
	length: number;
};

export type TableDefinition = {
	database: string;
	name: string;
	path: string;
	escapedPath: string;
	columns: ColumnDefinition[];
};

export type Database = TableDefinition["database"];
export type Field = ColumnDefinition["name"];
export type Table = TableDefinition["name"];

export type JavascriptValue = number | string | bigint | boolean | SupiDate | null | string[];
export type SqlValue = number | string | Date | bigint | null | string[];

export type PrimaryKeyValue = JavascriptValue;
export type FormatSymbol = "b" | "d" | "dt" | "n" | "s" | "t" | "s+" | "n+" | "like" | "like*" | "*like" | "*like*";
export type FormatValue = number | string | boolean | SupiDate | bigint | string[] | number[] | null;
export type GenericQueryBuilderOptions = {
	transaction?: PoolConnection
};

type BatchOptions = ConstructorParameters<typeof Batch> & {
	database: Database;
	table: Table;
};

type BatchUpdateOptions <T> = {
	batchSize: number;
	callback: (ru: RecordUpdater, row: T) => void;
	staggerDelay: number;
};

type ConstructorOptions = {
	user: string;
	password: string;
	connectionLimit?: number;
	host: string;
	port?: number;
};

export default class QuerySingleton {
	#definitionPromises: Map<Database, ReturnType<QuerySingleton["getDefinition"]>> = new Map();
	tableDefinitions: Record<Database, Record<Table, TableDefinition>> = {};

	pool: Pool;

	constructor (options: ConstructorOptions) {
		this.pool = createMariaDbPool({
			user: options.user,
			password: options.password,
			host: options.host,
			port: options.port ?? 3306,
			connectionLimit: options.connectionLimit ?? 25,
			...defaultPoolOptions
		});
	}

	async raw (...args: string[]): ReturnType<PoolConnection["query"]> {
		const query = args.join("\n");
		let connector;
		try {
			connector = await this.pool.getConnection();
		}
		catch (e) {
			let code: string | null = null;
			if (e instanceof SqlError) {
				code = e.code;
			}

			throw new SupiError({
				message: "Fetching database connection failed",
				args: { code },
				cause: e
			});
		}

		let result;
		try {
			result = connector.query({
				sql: query
			});
		}
		finally {
			await connector.release();
		}

		return result;
	}

	async send (...args: string[]): ReturnType<QuerySingleton["raw"]> {
		return this.raw(...args);
	}

	async transactionQuery (sql: string, transaction?: PoolConnection): ReturnType<PoolConnection["query"]> {
		if (transaction) {
			return transaction.query({ sql });
		}
		else {
			return this.raw(sql);
		}
	}

	async getTransaction (): Promise<PoolConnection> {
		const connector = await this.pool.getConnection();
		await connector.beginTransaction();
		return connector;
	}

	async getRecordset (callback: (rs: Recordset) => Recordset, options: GenericQueryBuilderOptions = {}): ReturnType<Recordset["fetch"]> {
		const rs = new Recordset(this, options);
		callback(rs);
		return await rs.fetch();
	}

	async getRecordDeleter (callback: (rd: RecordDeleter) => RecordDeleter, options: GenericQueryBuilderOptions = {}): ReturnType<RecordDeleter["fetch"]> {
		const rd = new RecordDeleter(this, options);
		callback(rd);
		return await rd.fetch();
	}

	async getRecordUpdater (callback: (ru: RecordUpdater) => RecordUpdater, options: GenericQueryBuilderOptions = {}): ReturnType<RecordUpdater["fetch"]> {
		const ru = new RecordUpdater(this, options);
		callback(ru);
		return await ru.fetch();
	}

	async getRow (database: Database, table: Table, options: GenericQueryBuilderOptions = {}): Promise<Row> {
		const row = new Row(this, options);
		await row.initialize(database, table);
		return row;
	}

	async getBatch (database: Database, table: Table, columns: Field[], options: BatchOptions): Promise<Batch> {
		const batch = new Batch(this, {
			...options,
			database,
			table
		});

		await batch.initialize(columns);
		return batch;
	}

	isRecordset (input: unknown): input is Recordset { return (input instanceof Recordset); }
	isRecordDeleter (input: unknown): input is RecordDeleter { return (input instanceof RecordDeleter); }
	isRecordUpdater (input: unknown): input is RecordUpdater { return (input instanceof RecordUpdater); }
	isRow (input: unknown): input is Row { return (input instanceof Row); }
	isBatch (input: unknown): input is Batch { return (input instanceof Batch); }

	async getDefinition (database: Database, table: Table): Promise<TableDefinition> {
		const key = `${database}.${table}`;
		if (this.tableDefinitions[database] && this.tableDefinitions[database][table]) {
			return this.tableDefinitions[database][table];
		}
		else if (this.#definitionPromises.has(key)) {
			return this.#definitionPromises.get(key) as Promise<TableDefinition>;
		}

		const promise = (async () => {
			const path = `${this.escapeIdentifier(database)}.${this.escapeIdentifier(table)}`;
			const escapedPath = `\`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\``;

			this.tableDefinitions[database] ??= {};

			const obj: TableDefinition = {
				name: table,
				database,
				path,
				escapedPath,
				columns: []
			};

			const data = await this.raw(`SELECT * FROM ${escapedPath} WHERE 1 = 0`) as {
				meta: MariaRowMeta[]
			};

			/* eslint-disable no-bitwise */
			for (const column of data.meta) {
				obj.columns.push({
					name: column.name(),
					length: column.columnLength ?? null,
					type: ((column.flags & QuerySingleton.flagMask.SET) === 0) ? column.type : ColumnType.SET,
					notNull: Boolean(column.flags & QuerySingleton.flagMask.NOT_NULL),
					primaryKey: Boolean(column.flags & QuerySingleton.flagMask.PRIMARY_KEY),
					unsigned: Boolean(column.flags & QuerySingleton.flagMask.UNSIGNED),
					autoIncrement: Boolean(column.flags & QuerySingleton.flagMask.AUTO_INCREMENT),
					zeroFill: Boolean(column.flags & QuerySingleton.flagMask.ZEROFILL_FLAG)
				});
			}
			/* eslint-enable no-bitwise */

			this.tableDefinitions[database][table] = obj;
			this.#definitionPromises.delete(key);

			return this.tableDefinitions[database][table];
		})();

		this.#definitionPromises.set(key, promise);
		return promise;
	}

	async isDatabasePresent (database: Database): Promise<boolean> {
		const exists = await this.getRecordset(rs => rs
			.select("1")
			.from("INFORMATION_SCHEMA", "SCHEMATA")
			.where("SCHEMA_NAME = %s", database)
		) as RecordsetResultObject;

		return (exists.length !== 0);
	}

	async isTablePresent (database: Database, table: Table): Promise<boolean> {
		const exists = await this.getRecordset(rs => rs
			.select("1")
			.from("INFORMATION_SCHEMA", "TABLES")
			.where("TABLE_SCHEMA = %s", database)
			.where("TABLE_NAME = %s", table)
		) as RecordsetResultObject;

		return (exists.length !== 0);
	}

	async isTableColumnPresent (database: Database, table: Table, column: Field): Promise<boolean> {
		const exists = await this.getRecordset(rs => rs
			.select("1")
			.from("INFORMATION_SCHEMA", "COLUMNS")
			.where("TABLE_SCHEMA = %s", database)
			.where("TABLE_NAME = %s", table)
			.where("COLUMN_NAME = %s", column)
		) as RecordsetResultObject;

		return (exists.length !== 0);
	}

	/**
	 * Performs a configurable batched update.
	 * Supports staggering, grouping statements into transactions, and more.
	 * @param data List of rows to update
	 * @param options Configurable options object
	 * @param options.callback Callback that gets passed into the RecordUpdater instances
	 */
	async batchUpdate <T extends SimpleGenericData> (data: T[], options: BatchUpdateOptions<T>) {
		const { batchSize, callback, staggerDelay } = options;
		if (typeof callback !== "function") {
			throw new SupiError({
				message: `Callback must be a function, received ${typeof callback}`
			});
		}

		const limit = (isValidPositiveInteger(batchSize, 1))
			? batchSize
			: updateBatchLimit;

		const queries = await Promise.all(data.map(async row => {
			const ru = new RecordUpdater(this);
			callback(ru, row);

			const sql = await ru.toSQL();
			return `${sql.join(" ")};`;
		}));

		if (isValidPositiveInteger(staggerDelay, 0)) {
			let counter = 0;
			for (let i = 0; i <= queries.length; i += limit) {
				const slice = queries.slice(i, i + limit).join("\n");

				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				setTimeout(async () => {
					const transaction = await this.getTransaction();
					try {
						await transaction.query(slice);
						await transaction.commit();
					}
					catch (e) {
						console.warn("Batch update fail", e);
						await transaction.rollback();
					}
					finally {
						await transaction.end();
					}
				}, (counter * staggerDelay));

				counter++;
			}
		}
		else {
			for (let i = 0; i <= queries.length; i += limit) {
				const transaction = await this.getTransaction();
				const slice = queries.slice(i, i + limit);

				try {
					await transaction.query(slice.join("\n"));
					await transaction.commit();
				}
				catch (e) {
					console.warn("Batch update fail", e);
					await transaction.rollback();
				}
				finally {
					await transaction.end();
				}
			}
		}
	}

	getCondition (callback: (rs: Recordset) => Recordset): string {
		const rs = new Recordset(this);
		callback(rs);
		return rs.toCondition();
	}

	invalidateDefinition (database: Database, table: Table) {
		if (this.tableDefinitions[database] && this.tableDefinitions[database][table]) {
			delete this.tableDefinitions[database][table];
		}
	}

	invalidateAllDefinitions () {
		this.tableDefinitions = {};
	}

	/**
	 * Converts a SQL value and type to a Javascript value
	 * SQL TINYINT(1) -> JS boolean
	 * SQL DATE/DATETIME/TIMESTAMP -> JS sb.Date
	 * SQL JSON -> JS Object
	 * SQL *INT/*TEXT/*CHAR -> JS number/string
	 */
	convertToJS (value: SqlValue, type: ExtendedColumnType): JavascriptValue | string[] {
		if (value === null) {
			return value;
		}

		switch (type) {
			case ColumnType.TINY: return (value === 1);

			case ColumnType.SET: {
				if (!isMariaSet(value)) {
					throw new SupiError({
						message: "SET value must be a string[]"
					});
				}

				return value;
			}

			// case ColumnType.TIME:
			case ColumnType.DATE:
			case ColumnType.DATETIME:
			case ColumnType.TIMESTAMP: {
				if (typeof value !== "number") {
					throw new SupiError({
						message: "Cannot use non-number values for dates and timestamps"
					});
				}

				return new SupiDate(value);
			}

			case ColumnType.BIGINT: {
				if (typeof value !== "number" && typeof value !== "string") {
					throw new SupiError({
						message: "Bigint value must be number or string"
					});
				}

				return BigInt(value);
			}

			case ColumnType.JSON: {
				if (typeof value !== "string") {
					throw new SupiError({
						message: "JSON value must be string"
					});
				}

				try {
					JSON.parse(value);
				}
				catch (e) {
					throw new SupiError({
						message: "Could not parse JSON value",
						args: { value },
						cause: e
					});
				}

				return value;
			}

			case "INT":
			case ColumnType.SHORT:
			case ColumnType.NEWDECIMAL: return Number(value);

			case ColumnType.STRING:
			case ColumnType.VAR_STRING:
			case ColumnType.BLOB:
			default: return String(value);
		}
	}

	/**
	 * Converts a Javascript value to its SQL counterpart
	 * JS null -> SQL NULL
	 * JS boolean -> SQL TINYINT(1)
	 * JS Date/sb.Date -> SQL TIME/DATE/DATETIME/TIMESTAMP
	 * JS string -> escaped SQL VARCHAR/*TEXT
	 * JS number -> SQL *INT
	 */
	convertToSQL (value: JavascriptValue, targetType: ExtendedColumnType): string {
		if (value === null) {
			return "NULL";
		}
		else if (targetType === ColumnType.TINY) {
			if (typeof value !== "boolean") {
				throw new SupiError({
					message: "Expected value type: boolean",
					args: value
				});
			}

			return (value) ? "1" : "0";
		}
		else if (targetType === ColumnType.SET && Array.isArray(value)) {
			const string = this.escapeString(value.join(","));
			return `'${string}'`;
		}
		else if (targetType === ColumnType.TIME || ColumnType.DATE || ColumnType.DATETIME || targetType === ColumnType.TIMESTAMP) {
			if (value instanceof Date) {
				value = new SupiDate(value);
			}

			if (!(value instanceof SupiDate)) {
				throw new SupiError({
					message: "Expected value type: date",
					args: value
				});
			}

			switch (targetType) {
				case ColumnType.TIME: return `'${value.sqlTime()}'`;
				case ColumnType.DATE: return `'${value.sqlDate()}'`;
				case ColumnType.DATETIME: return `'${value.sqlDateTime()}'`;
				case ColumnType.TIMESTAMP: return `'${value.sqlDateTime()}'`;
			}
		}
		else if (typeof value === "string") {
			return `'${this.escapeString(value)}'`;
		}

		return String(value);
	}

	escapeIdentifier (string: string) {
		// @todo should safely escape identifiers into backticks

		// const result = (/\*$/.test(string))
		// 	? string
		// 	: "`" + string.replace(/^`|`$/g, "").replace(/`/g, "``") + "`";
		//

		return string;

		// return "`" + string.replace(/^`|`$/g, "").replace(/`/g, "``") + "`";
		// return "`" + string.replace(/^`|`$/g, "").replace(/`/g, "\\`") + "`";
	}

	escapeString (string: string): string {
		return string.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "\\\"");
	}

	escapeLikeString (string: string): string {
		return this.escapeString(string).replace(/%/g, "\\%").replace(/_/g, "\\_");
	}

	/**
	 * Replaces format symbols used in WHERE/HAVING with their provided values and escapes/parses them.
	 */
	parseFormatSymbol (type: FormatSymbol, param: FormatValue): string {
		switch (type) {
			case "b":
				if (typeof param !== "boolean") {
					throw new SupiError({ message: `Expected boolean, got ${getTypeName(param)}` });
				}

				return (param ? "1" : "0");

			case "d":
				if (param instanceof Date && !(param instanceof SupiDate)) {
					param = new SupiDate(param);
				}
				if (!(param instanceof SupiDate)) {
					throw new SupiError({ message: `Expected SupiDate, got ${getTypeName(param)}` });
				}

				return `'${param.sqlDate()}'`;

			case "dt":
				if (param instanceof Date && !(param instanceof SupiDate)) {
					param = new SupiDate(param);
				}
				if (!(param instanceof SupiDate)) {
					throw new SupiError({ message: `Expected SupiDate, got ${getTypeName(param)}` });
				}

				return `'${param.sqlDateTime()}'`;

			case "n":
				if (typeof param !== "number") {
					throw new SupiError({ message: `Expected number, got ${getTypeName(param)}` });
				}
				else if (Number.isNaN(param)) {
					throw new SupiError({ message: `Cannot use ${param} as a number in SQL` });
				}

				return String(param);

			case "s":
				if (typeof param !== "string") {
					throw new SupiError({ message: `Expected string, got ${getTypeName(param)}` });
				}

				return `'${this.escapeString(param)}'`;

			case "t":
				if (param instanceof Date && !(param instanceof SupiDate)) {
					param = new SupiDate(param);
				}
				if (!(param instanceof SupiDate)) {
					throw new SupiError({ message: `Expected SupiDate, got ${getTypeName(param)}` });
				}

				return param.sqlTime();

			case "s+":
				if (!Array.isArray(param)) {
					throw new SupiError({ message: `Expected Array, got ${getTypeName(param)}` });
				}
				else if (!isStringArray(param)) {
					throw new SupiError({ message: "Array must contain strings only" });
				}

				return `(${param.map(i => this.escapeString(i)).map(i => `'${i}'`).join(",")})`;

			case "n+":
				if (!Array.isArray(param)) {
					throw new SupiError({ message: `Expected Array, got ${getTypeName(param)}` });
				}
				else if (!isProperNumberArray(param)) {
					throw new SupiError({ message: "Array must contain proper numbers only" });
				}

				return `(${param.join(",")})`;

			case "like":
			case "*like":
			case "like*":
			case "*like*": {
				if (typeof param !== "string") {
					throw new SupiError({ message: `Expected string, got ${getTypeName(param)}` });
				}

				const start = (type.startsWith("*")) ? "%" : "";
				const end = (type.endsWith("*")) ? "%" : "";
				const string = this.escapeLikeString(param);

				return ` LIKE '${start}${string}${end}'`;
			}

			default: throw new SupiError({
				message: "Unknown Recordset replace parameter",
				args: type
			});
		}
	}

	static get sqlKeywords () {
		return ["SUM", "COUNT", "AVG"] as const;
	}

	static get flagMask () {
		return {
			NOT_NULL: 1,
			PRIMARY_KEY: 2,
			UNIQUE_KEY: 4,
			MULTIPLE_KEY: 8,
			BLOB: 16,
			UNSIGNED: 32,
			ZEROFILL_FLAG: 64,
			BINARY_COLLATION: 128,
			ENUM: 256,
			AUTO_INCREMENT: 512,
			TIMESTAMP: 1024,
			SET: 2048,
			NO_DEFAULT_VALUE_FLAG: 4096,
			ON_UPDATE_NOW_FLAG: 8192,
			NUM_FLAG: 32768
		} as const;
	}

	get formatSymbolRegex () {
		return formatSymbolRegex;
	}
}
