import SupiError from "../../objects/error.js";
import QuerySingleton, {
	ColumnDefinition, JavascriptValue,
	PrimaryKeyValue,
	TableDefinition,
	Value as QueryValue
} from "./index.js";
import { PoolConnection, UpsertResult } from "mariadb";

const UNSET_VALUE: unique symbol = Symbol.for("UNSET");

type Value = JavascriptValue | typeof UNSET_VALUE;
type Values = Record<string, Value>;
type PrimaryKeyObject = Record<string, PrimaryKeyValue>;
type ConstructorOptions = {
	transaction?: PoolConnection;
};
type SaveOptions = {
	ignore?: boolean;
	skipLoad?: boolean;
};

const isPrimaryKeyObject = (input: unknown): input is PrimaryKeyObject => {
	if (!input || typeof input !== "object") {
		return false;
	}

	return (input.constructor === Object);
};

/**
 * Represents one row of a SQL database table.
 */
export default class Row {
	#definition: TableDefinition | null = null;
	#query: QuerySingleton;
	#transaction;

	#values: Values = {};
	#originalValues: Values = {};
	#primaryKeyFields: ColumnDefinition[] = [];
	#valueProxy: Values = new Proxy(this.#values, {
		get: (target, name: string) => {
			if (!this.#initialized) {
				throw new SupiError({
					message: "Cannot get row value - row not initialized",
					args: this._getErrorInfo()
				});
			}
			else if (typeof target[name] === "undefined") {
				throw new SupiError({
					message: `Cannot get row value - column "${name}" does not exist`,
					args: this._getErrorInfo()
				});
			}

			return target[name];
		},
		set: (target, name: string, value: Value) => {
			if (!this.#initialized) {
				throw new SupiError({
					message: "Cannot set row value - row not initialized",
					args: this._getErrorInfo()
				});
			}
			else if (typeof target[name] === "undefined") {
				throw new SupiError({
					message: `Cannot set row value - column "${name}" does not exist`,
					args: this._getErrorInfo()
				});
			}

			target[name] = value;
			return true;
		}
	});

	#initialized = false;
	#loaded = false;
	#deleted = false;

	constructor (query: QuerySingleton, options: ConstructorOptions = {}) {
		this.#query = query;
		this.#transaction = options.transaction;
	}

	async initialize (database: string, table: string) {
		if (!database || !table) {
			throw new SupiError({
				message: "Cannot initialize row - missing database/table",
				args: { database, table }
			});
		}

		this.#definition = await this.#query.getDefinition(database, table);
		for (const column of this.#definition.columns) {
			this.#values[column.name] = UNSET_VALUE;
			this.#originalValues[column.name] = UNSET_VALUE;

			if (column.primaryKey) {
				this.#primaryKeyFields.push(column);
			}
		}

		this.#initialized = true;
		return this;
	}

	async load (primaryKey: PrimaryKeyValue | PrimaryKeyObject, ignoreError: boolean = false) {
		if (!this.#definition) {
			throw new SupiError({
				message: "Cannot load row - not initialized",
				args: this._getErrorInfo()
			});
		}

		if (primaryKey === null || typeof primaryKey === "undefined") {
			throw new SupiError({
				message: "Cannot load Row - no primary key provided",
				args: this._getErrorInfo()
			});
		}
		else if (this.#primaryKeyFields.length === 0) {
			throw new SupiError({
				message: "Cannot load Row - table has no primary keys",
				args: this._getErrorInfo()
			});
		}

		this.reset();

		const conditions = [];
		if (isPrimaryKeyObject(primaryKey)) {
			for (const [key, value] of Object.entries(primaryKey)) {
				const column = this.#definition.columns.find(i => i.name === key);
				if (!column) {
					throw new SupiError({
						message: `Cannot load Row - unrecognized column "${key}"`,
						args: {
							...this._getErrorInfo(),
							column: key
						}
					});
				}
				else if (!column.primaryKey) {
					throw new SupiError({
						message: `Cannot load Row - column "${key}" is not primary`,
						args: {
							...this._getErrorInfo(),
							column: key
						}
					});
				}

				const parsedValue = this.#query.convertToSQL(value, column.type);
				const identifier = this.#query.escapeIdentifier(key);

				conditions.push(`${identifier} = ${parsedValue}`);
			}
		}
		else {
			if (this.#primaryKeyFields.length > 1) {
				const pks = this.#primaryKeyFields.map(i => i.name);
				throw new SupiError({
					message: "Cannot use implied PK - table has multiple PKs",
					args: {
						...this._getErrorInfo(),
						primaryKeys: pks
					}
				});
			}

			const [column] = this.#primaryKeyFields;
			const parsedValue = this.#query.convertToSQL(primaryKey, column.type);
			const identifier = this.#query.escapeIdentifier(column.name);

			conditions.push(`${identifier} = ${parsedValue}`);
		}

		const sqlString = `SELECT * FROM ${this.#definition.escapedPath} WHERE ${conditions.join(" AND ")}`;
		const data = await this.#query.transactionQuery(sqlString, this.#transaction) as Record<string, string | number | null>[];

		if (!data[0]) {
			if (ignoreError) {
				return this;
			}
			else {
				throw new SupiError({
					message: "No row data found for provided primary key(s)",
					args: {
						...this._getErrorInfo(),
						loadedKey: primaryKey
					}
				});
			}
		}

		for (const column of this.#definition.columns) {
			const value = this.#query.convertToJS(data[0][column.name], column.type);
			this.#values[column.name] = value;
			this.#originalValues[column.name] = value;
		}

		this.#loaded = true;
		return this;
	}

	async save (options: SaveOptions = {}) {
		if (!this.#definition) {
			throw new SupiError({
				message: "Cannot save row - not initialized",
				args: this._getErrorInfo()
			});
		}

		let outputData: UpsertResult;
		if (this.#loaded) { // UPDATE
			const setColumns = [];
			for (const column of this.#definition.columns) {
				if (this.#originalValues[column.name] === this.#values[column.name]) {
					continue;
				}
				else if (this.#values[column.name] === UNSET_VALUE) {
					continue;
				}

				// Now guaranteed to not include the UNSET_VALUE symbol
				const rowValue = this.#values[column.name] as QueryValue;

				const identifier = this.#query.escapeIdentifier(column.name);
				const value = this.#query.convertToSQL(rowValue, column.type);
				setColumns.push(`${identifier} = ${value}`);
			}

			// no update necessary, skip
			if (setColumns.length === 0) {
				return false;
			}

			const conditions = this._getPrimaryKeyConditions();
			const sqlString = `UPDATE ${this.#definition.escapedPath} SET ${setColumns.join(", ")} WHERE ${conditions.join(" AND ")}`;

			outputData = await this.#query.transactionQuery(sqlString, this.#transaction) as UpsertResult;
		}
		else { // INSERT
			const columns = [];
			const values = [];
			for (const column of this.#definition.columns) {
				if (this.#values[column.name] === UNSET_VALUE) {
					continue;
				}

				// Now guaranteed to not include the UNSET_VALUE symbol
				const rowValue = this.#values[column.name] as QueryValue;

				columns.push(this.#query.escapeIdentifier(column.name));
				values.push(this.#query.convertToSQL(rowValue, column.type));
			}

			const ignore = (options.ignore === true) ? "IGNORE " : "";

			const sqlString = `INSERT ${ignore}INTO ${this.#definition.escapedPath} (${columns.join(",")}) VALUES (${values.join(",")})`;
			outputData = await this.#query.transactionQuery(sqlString, this.#transaction) as UpsertResult;

			if (outputData.insertId !== 0) {
				const autoIncrementPK = this.#primaryKeyFields.find(i => i.autoIncrement);
				if (!autoIncrementPK) {
					throw new SupiError({
						message: "No AUTOINCREMENT column found"
					});
				}

				this.#values[autoIncrementPK.name] = outputData.insertId;
			}

			if (!options.skipLoad) {
				// @todo with MariaDB 10.5+, use INSERT RETURNING to fetch inserted data immediately insted of having to re-load the Row
				await this.load(this.PK);
			}
		}

		return outputData;
	}

	async delete () {
		if (!this.#definition) {
			throw new SupiError({
				message: "Cannot delete row - not initialized",
				args: this._getErrorInfo()
			});
		}

		if (this.#loaded) {
			const conditions = this._getPrimaryKeyConditions();
			const sqlString = `DELETE FROM ${this.#definition.escapedPath} WHERE ${conditions.join(" AND ")}`;

			await this.#query.transactionQuery(sqlString, this.#transaction);

			this.#loaded = false;
			this.#deleted = true;
		}
		else {
			throw new SupiError({
				message: "Row is not loaded - cannot delete",
				args: this._getErrorInfo()
			});
		}
	}

	reset () {
		if (!this.#definition) {
			throw new SupiError({
				message: "Cannot reset row - not initialized",
				args: this._getErrorInfo()
			});
		}

		this.#loaded = false;
		for (const column of this.#definition.columns) {
			this.#values[column.name] = UNSET_VALUE;
			this.#originalValues[column.name] = UNSET_VALUE;
		}
	}

	setValues (data: Record<string, Value>) {
		if (!this.#initialized) {
			throw new SupiError({
				message: "Cannot set column values - row not initialized",
				args: this._getErrorInfo()
			});
		}

		for (const [key, value] of Object.entries(data)) {
			// This should stay as the .values getter, because this method a simple wrapper around multiple values setting at once
			this.values[key] = value;
		}

		return this;
	}

	hasProperty (property: string) {
		if (!this.#definition) {
			throw new SupiError({
				message: "Cannot check property - row not initialized",
				args: this._getErrorInfo()
			});
		}

		return (typeof this.#values[property] !== "undefined");
	}

	_getErrorInfo () {
		return {
			database: this.#definition?.database ?? null,
			table: this.#definition?.name ?? null,
			primaryKeys: this.#primaryKeyFields.map(i => i.name),
			deleted: this.#deleted,
			loaded: this.#loaded
		};
	}

	_getPrimaryKeyConditions () {
		const conditions = [];
		for (const column of this.#primaryKeyFields) {
			// Guaranteed to not include the UNSET_VALUE symbol
			const pkValue = this.#values[column.name] as QueryValue;

			const parsedValue = this.#query.convertToSQL(pkValue, column.type);
			const identifier = this.#query.escapeIdentifier(column.name);

			conditions.push(`(${identifier} = ${parsedValue})`);
		}

		return conditions;
	}

	get valuesObject () { return { ...this.#values }; }

	get values () { return this.#valueProxy; }
	get originalValues () { return this.#originalValues; }

	get PK (): PrimaryKeyObject {
		const obj: PrimaryKeyObject = {};
		for (const column of this.#primaryKeyFields) {
			// Guaranteed to not include the UNSET_VALUE symbol
			obj[column.name] = this.#values[column.name] as QueryValue;
		}

		return obj;
	}

	get definition () { return this.#definition || null; }
	get deleted () { return this.#deleted; }
	get initialized () { return this.#initialized; }
	get loaded () { return this.#loaded; }

	hasDefinition (): this is Row & { definition: object } {
		return this.#initialized;
	}
}
