import SupiDate from "../../objects/date.js";
import SupiError from "../../objects/error.js";

import { createPool as createMariaDbPool } from "mariadb";
import Batch from "./batch.js";
import Recordset from "./recordset.js";
import RecordDeleter from "./record-deleter.js";
import RecordUpdater from "./record-updater.js";
import Row from "./row.js";

const updateBatchLimit = 1000;
const formatSymbolRegex = /%(s\+|n\+|b|dt|d|n|p|s|t|\*?like\*?)/g;
const defaultPoolOptions = {
	multipleStatements: true,
	insertIdAsNumber: true,
	decimalAsNumber: true,
	bigIntAsNumber: false
};

const isValidPositiveInteger = (input, min = 0) => Number.isInteger(input) && (input >= min);

export default class QuerySingleton {
	#loggingThreshold = null;
	#definitionPromises = new Map();
	lifetimes = {
		batches: new WeakSet(),
		connectors: new WeakMap(),
		recordDeleters: new WeakSet(),
		recordsets: new WeakSet(),
		recordUpdaters: new WeakSet(),
		rows: new WeakSet(),
		transactions: new WeakSet()
	};

	/** @type {TableDefinition[]} */
	tableDefinitions = [];

	throughput = {
		connectors: {
			requested: 0,
			retrieved: 0,
			released: 0
		}
	};

	constructor (options = {}) {
		if (!options.user) {
			throw new SupiError({
				message: "Missing `options.user`"
			});
		}
		else if (typeof options.password !== "string") {
			throw new SupiError({
				message: "Missing `options.password` (can be empty string)"
			});
		}
		else if (!options.path && !options.host) {
			throw new SupiError({
				message: "Missing `options.path` and `options.host` - exactly one must be provided"
			});
		}

		if (options.path) {
			this.pool = createMariaDbPool({
				user: options.user,
				password: options.password,
				socketPath: options.path,
				connectionLimit: options.connectionLimit ?? 25,
				...defaultPoolOptions
			});
		}
		else if (options.host) {
			this.pool = createMariaDbPool({
				user: options.user,
				password: options.password,
				host: options.host,
				port: options.port ?? 3306,
				connectionLimit: options.connectionLimit ?? 25,
				...defaultPoolOptions
			});
		}
		else {
			throw new SupiError({
				message: "Incomplete configuration passed as `options`"
			});
		}
	}

	async raw (...args) {
		this.throughput.connectors.requested++;

		const query = args.join("\n");
		let connector;
		try {
			connector = await this.pool.getConnection();
		}
		catch (e) {
			throw new SupiError({
				message: "Fetching database connection failed",
				args: {
					code: e.code
				},
				cause: e
			});
		}

		this.throughput.connectors.retrieved++;
		this.lifetimes.connectors.set(connector, {
			args,
			error: new Error().stack
		});

		let result;
		try {
			result = connector.query({
				sql: query,
				multipleStatements: true
			});
		}
		finally {
			await connector.release();
			this.throughput.connectors.released++;
		}

		return result;
	}

	async send (...args) {
		return this.raw(...args);
	}

	async transactionQuery (sql, transaction) {
		if (transaction) {
			return transaction.query({
				sql,
				multipleStatements: true
			});
		}
		else {
			return this.raw(sql);
		}
	}

	async getTransaction () {
		const connector = await this.pool.getConnection();
		this.lifetimes.transactions.add(connector);

		await connector.beginTransaction();
		return connector;
	}

	async getRecordset (callback, options = {}) {
		const rs = new Recordset(this, options);
		this.lifetimes.recordsets.add(rs);

		callback(rs);
		return await rs.fetch();
	}

	async getRecordDeleter (callback, options = {}) {
		const rd = new RecordDeleter(this, options);
		this.lifetimes.recordDeleters.add(rd);

		callback(rd);
		return await rd.fetch();
	}

	async getRecordUpdater (callback, options = {}) {
		const ru = new RecordUpdater(this, options);
		this.lifetimes.recordUpdaters.add(ru);

		callback(ru);
		return await ru.fetch();
	}

	async getRow (database, table, options = {}) {
		/** @type {Row} */
		const row = new Row(this, options);
		this.lifetimes.rows.add(row);

		await row.initialize(database, table);
		return row;
	}

	async getBatch (database, table, columns, options = {}) {
		const batch = new Batch(this, {
			...options,
			database,
			table
		});
		this.lifetimes.batches.add(batch);

		await batch.initialize(columns);
		return batch;
	}

	isRecordset (input) { return (input instanceof Recordset); }
	isRecordDeleter (input) { return (input instanceof RecordDeleter); }
	isRecordUpdater (input) { return (input instanceof RecordUpdater); }
	isRow (input) { return (input instanceof Row); }
	isBatch (input) { return (input instanceof Batch); }

	async getDefinition (database, table) {
		const key = `${database}.${table}`;
		if (this.tableDefinitions[database] && this.tableDefinitions[database][table]) {
			return this.tableDefinitions[database][table];
		}
		else if (this.#definitionPromises.has(key)) {
			return this.#definitionPromises.get(key);
		}

		const promise = (async () => {
			const path = `${this.escapeIdentifier(database)}.${this.escapeIdentifier(table)}`;
			const escapedPath = `\`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\``;
			this.tableDefinitions[database] = this.tableDefinitions[database] || {};
			const obj = {
				name: table, database, path, escapedPath, columns: []
			};

			const data = await this.raw(`SELECT * FROM ${escapedPath} WHERE 1 = 0`);

			/* eslint-disable no-bitwise */
			for (const column of data.meta) {
				obj.columns.push({
					name: column.name(),
					length: column.columnLength ?? null,
					type: ((column.flags & QuerySingleton.flagMask.SET) === 0) ? column.type : "SET",
					notNull: Boolean(column.flags & QuerySingleton.flagMask.NOT_NULL),
					primaryKey: Boolean(column.flags & QuerySingleton.flagMask.PRIMARY_KEY),
					unsigned: Boolean(column.flags & QuerySingleton.flagMask.UNSIGNED),
					autoIncrement: Boolean(column.flags & QuerySingleton.flagMask.AUTO_INCREMENT),
					zeroFill: Boolean(column.flags & QuerySingleton.flagMask.ZERO_FILL)
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

	async isDatabasePresent (database) {
		const exists = await this.getRecordset(rs => rs
			.select("1")
			.from("INFORMATION_SCHEMA", "SCHEMATA")
			.where("SCHEMA_NAME = %s", database)
		);

		return (exists.length !== 0);
	}

	async isTablePresent (database, table) {
		const exists = await this.getRecordset(rs => rs
			.select("1")
			.from("INFORMATION_SCHEMA", "TABLES")
			.where("TABLE_SCHEMA = %s", database)
			.where("TABLE_NAME = %s", table)
		);

		return (exists.length !== 0);
	}

	async isTableColumnPresent (database, table, column) {
		const exists = await this.getRecordset(rs => rs
			.select("1")
			.from("INFORMATION_SCHEMA", "COLUMNS")
			.where("TABLE_SCHEMA = %s", database)
			.where("TABLE_NAME = %s", table)
			.where("COLUMN_NAME = %s", column)
		);

		return (exists.length !== 0);
	}

	async batchUpdate (data, options = {}) {
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
				let slice = queries.slice(i, i + limit).join("\n");

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
						slice = null;
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

	getCondition (callback) {
		const rs = new Recordset(this);
		callback(rs);
		return rs.toCondition();
	}

	invalidateDefinition (database, table) {
		if (this.tableDefinitions[database] && this.tableDefinitions[database][table]) {
			this.tableDefinitions[database][table] = null;
		}
	}

	invalidateAllDefinitions () {
		this.tableDefinitions = [];
	}

	convertToJS (value, type) {
		if (value === null) {
			return value;
		}

		switch (type) {
			case "TINY": return (value === 1);

			// case "TIME":
			case "DATE":
			case "DATETIME":
			case "TIMESTAMP": return new SupiDate(value);

			case "BIGINT":
			case "LONGLONG": return BigInt(value);

			case "JSON": return JSON.parse(value);

			case "INT":
			case "SHORT":
			case "NEWDECIMAL": return Number(value);

			default: return value;
		}
	}

	convertToSQL (value, targetType) {
		const sourceType = typeof value;

		if (value === null) {
			return "NULL";
		}
		else if (targetType === "TINY") {
			if (sourceType !== "boolean") {
				throw new SupiError({
					message: "Expected value type: boolean",
					args: value
				});
			}

			return (value === true) ? "1" : "0";
		}
		else if (targetType === "SET" && Array.isArray(value)) {
			const string = this.escapeString(value.join(","));
			return `'${string}'`;
		}
		else if (targetType === "TIME" || targetType === "DATE" || targetType === "DATETIME" || targetType === "TIMESTAMP") {
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
				case "TIME": return `'${value.sqlTime()}'`;
				case "DATE": return `'${value.sqlDate()}'`;
				case "DATETIME": return `'${value.sqlDateTime()}'`;
				case "TIMESTAMP": return `'${value.sqlDateTime()}'`;
			}
		}
		else if (sourceType === "string") {
			return `'${this.escapeString(value)}'`;
		}
		else {
			return value;
		}
	}

	escapeIdentifier (string) {
		// @todo figure this out

		// // console.log("escape identifier", "`" + string.replace(/^`|`$/g, "").replace(/`/g, "``") + "`");
		// const result = (/\*$/.test(string))
		// 	? string
		// 	: "`" + string.replace(/^`|`$/g, "").replace(/`/g, "``") + "`";
		//

		if (typeof string === "string" && string.includes("chatrooms")) {
			string = `\`${string}\``;
		}

		// console.warn(string);

		return string;

		// return string;

		// return "`" + string.replace(/^`|`$/g, "").replace(/`/g, "``") + "`";
		// return "`" + string.replace(/^`|`$/g, "").replace(/`/g, "\\`") + "`";
	}

	escapeString (string) {
		return string.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "\\\"");
	}

	escapeLikeString (string) {
		return this.escapeString(string).replace(/%/g, "\\%").replace(/_/g, "\\_");
	}

	parseFormatSymbol (type, param) {
		switch (type) {
			case "b":
				if (typeof param !== "boolean") {
					throw new SupiError({ message: `Expected boolean, got ${param}` });
				}

				return (param ? "1" : "0");

			case "d":
				if (param instanceof Date && !(param instanceof SupiDate)) {
					param = new SupiDate(param);
				}
				if (!(param instanceof SupiDate)) {
					throw new SupiError({ message: `Expected SupiDate, got ${param}` });
				}

				return `'${param.sqlDate()}'`;

			case "dt":
				if (param instanceof Date && !(param instanceof SupiDate)) {
					param = new SupiDate(param);
				}
				if (!(param instanceof SupiDate)) {
					throw new SupiError({ message: `Expected SupiDate, got ${param}` });
				}

				return `'${param.sqlDateTime()}'`;

			case "n":
				if (typeof param !== "number") {
					throw new SupiError({ message: `Expected number, got ${param}` });
				}
				else if (Number.isNaN(param)) {
					throw new SupiError({ message: `Cannot use ${param} as a number in SQL` });
				}

				return String(param);

			case "s":
				if (typeof param !== "string") {
					throw new SupiError({ message: `Expected string, got ${param}` });
				}

				return `'${this.escapeString(param)}'`;

			case "t":
				if (param instanceof Date && !(param instanceof SupiDate)) {
					param = new SupiDate(param);
				}
				if (!(param instanceof SupiDate)) {
					throw new SupiError({ message: `Expected SupiDate, got ${param}` });
				}

				return param.sqlTime();

			case "s+":
				if (!Array.isArray(param)) {
					throw new SupiError({ message: `Expected Array, got ${param}` });
				}
				else if (param.some(i => typeof i !== "string")) {
					throw new SupiError({ message: "Array must contain strings only" });
				}

				return `(${param.map(i => this.escapeString(i)).map(i => `'${i}'`).join(",")})`;

			case "n+":
				if (!Array.isArray(param)) {
					throw new SupiError({ message: `Expected Array, got ${param}` });
				}
				else if (param.some(i => typeof i !== "number" || Number.isNaN(i))) {
					throw new SupiError({ message: "Array must contain proper numbers only" });
				}

				return `(${param.join(",")})`;

			case "like":
			case "*like":
			case "like*":
			case "*like*": {
				if (typeof param !== "string") {
					throw new SupiError({ message: `Expected string, got ${param}` });
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

	setLogThreshold (value) {
		if (typeof value !== "number") {
			throw new SupiError({
				message: "Logging threshold must be a number",
				args: { value }
			});
		}

		this.#loggingThreshold = value;
	}

	disableLogThreshold () {
		this.#loggingThreshold = null;
	}

	static get sqlKeywords () {
		return ["SUM", "COUNT", "AVG"];
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
		};
	}

	get formatSymbolRegex () {
		return formatSymbolRegex;
	}

	destroy () {
		this.invalidateAllDefinitions();
		this.pool = null;
	}
}
