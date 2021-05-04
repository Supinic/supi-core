/* global sb */
/**
 * Represents one row of a SQL database table.
 * @type Row
 */
module.exports = class Row {
	/** @type {TableDefinition} */
	#definition;
	/** @type {Query} */
	#query;

	#values = {};
	#originalValues = {};
	#primaryKeyFields = [];
	#valueProxy = new Proxy(this.#values, {
		get: (target, name) => {
			if (!this.#initialized) {
				throw new sb.Error({
					message: "Cannot get row value - row not initialized",
					args: this._getErrorInfo()
				});
			}
			else if (typeof target[name] === "undefined") {
				throw new sb.Error({
					message: `Cannot get row value - column "${name}" does not exist`,
					args: this._getErrorInfo()
				});
			}

			return target[name];
		},
		set: (target, name, value) => {
			if (!this.#initialized) {
				throw new sb.Error({
					message: "Cannot set row value - row not initialized",
					args: this._getErrorInfo()
				});
			}
			else if (typeof target[name] === "undefined") {
				throw new sb.Error({
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

	/**
	 * Creates a new Row instance.
	 * Binds the current instance of Query to the row for internal use
	 * @param {Query} query
	 * @returns {Row}
	 */
	constructor (query) {
		this.#query = query;
	}

	/**
	 * Initializes the row with database + table definitions
	 * @param {string} database
	 * @param {string} table
	 * @returns {Promise<Row>} returns self
	 */
	async initialize (database, table) {
		if (!database || !table) {
			throw new sb.Error({
				message: "Cannot initialize row - missing database/table",
				args: { database, table }
			});
		}
		
		this.#definition = await this.#query.getDefinition(database, table);
		for (const column of this.#definition.columns) {
			this.#values[column.name] = Symbol.for("unset");
			this.#originalValues[column.name] = Symbol.for("unset");

			if (column.primaryKey) {
				this.#primaryKeyFields.push(column);
			}
		}

		this.#initialized = true;
		return this;
	}

	/**
	 * Loads a row based on its primary key.
	 * @param {*} primaryKey Single primitive value for implied PK, or an Object of primitives for multi-column PKs
	 * @param {boolean} ignoreError = false If true, the method will not throw on non-existing row; rather returns an unloaded row
	 * @returns {Promise<Row>}
	 */
	async load (primaryKey, ignoreError = false) {
		if (!this.#initialized) {
			throw new sb.Error({
				message: "Cannot load row - not initialized",
				args: this._getErrorInfo()
			});
		}

		if (primaryKey === null || typeof primaryKey === "undefined") {
			throw new sb.Error({
				message: "Cannot load Row - no primary key provided",
				args: this._getErrorInfo()
			});
		}
		else if (this.#primaryKeyFields.length === 0) {
			throw new sb.Error({
				message: "Cannot load Row - table has no primary keys",
				args: this._getErrorInfo()
			});
		}

		this.reset();

		let conditions = [];
		if (primaryKey.constructor === Object) {
			for (const [key, value] of Object.entries(primaryKey)) {
				const column = this.#definition.columns.find(i => i.name === key);
				if (!column) {
					throw new sb.Error({
						message: `Cannot load Row - unrecognized column "${key}"`,
						args: {
							...this._getErrorInfo(),
							column: key
						}
					});
				}
				else if (!column.primaryKey) {
					throw new sb.Error({
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
				throw new sb.Error({
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

		const data = await this.#query.raw([
			"SELECT * FROM " + this.#definition.escapedPath,
			"WHERE " + conditions.join(" AND ")
		].join(" "));

		if (!data[0]) {
			if (ignoreError) {
				return this;
			}
			else {
				throw new sb.Error({
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

	/**
	 * Saves the row.
	 * If a primary key is present, saves the row as new (INSERT).
	 * If not, saves an existing row (UPDATE).
	 * @param {Object} options
	 * @param {boolean} [options.ignore] If true, INSERT will be executed as INSERT IGNORE (ignores duplicate keys)
	 * @returns {Promise<Object>}
	 */
	async save (options = {}) {
		if (!this.#initialized) {
			throw new sb.Error({
				message: "Cannot save row - not initialized",
				args: this._getErrorInfo()
			});
		}

		let outputData;
		if (this.#loaded) { // UPDATE
			const setColumns = [];
			for (const column of this.#definition.columns) {
				if (this.#originalValues[column.name] === this.#values[column.name]) continue;

				const identifier = this.#query.escapeIdentifier(column.name);
				const value = this.#query.convertToSQL(this.#values[column.name], column.type);
				setColumns.push(`${identifier} = ${value}`);
			}

			// no update necessary, skip
			if (setColumns.length === 0) {
				return false;
			}

			const conditions = this._getPrimaryKeyConditions();
			outputData = await this.#query.raw([
				"UPDATE " + this.#definition.escapedPath,
				"SET " + setColumns.join(", "),
				"WHERE " + conditions.join(" AND ")
			].join(" "));
		}
		else { // INSERT
			let columns = [];
			let values = [];
			for (const column of this.#definition.columns) {
				if (this.#values[column.name] === Symbol.for("unset")) {
					continue;
				}

				columns.push(this.#query.escapeIdentifier(column.name));
				values.push(this.#query.convertToSQL(this.#values[column.name], column.type));
			}

			const ignore = (options.ignore === true) ? "IGNORE " : "";

			outputData = await this.#query.send([
				"INSERT " + ignore + "INTO " + this.#definition.escapedPath,
				"(" + columns.join(",") + ")",
				"VALUES (" + values.join(",") + ")"
			].join(" "));

			if (outputData.insertId !== 0) {
				const autoIncrementPK = this.#primaryKeyFields.find(i => i.autoIncrement);
				this.#values[autoIncrementPK.name] = outputData.insertId;
			}

			await this.load(this.PK);
		}

		return outputData;
	}

	/**
	 * Performs a DELETE operation on the currently loaded row.
	 * @returns {Promise<void>}
	 */
	async delete () {
		if (!this.#initialized) {
			throw new sb.Error({
				message: "Cannot delete row - not initialized",
				args: this._getErrorInfo()
			});
		}

		if (this.#loaded) {
			const conditions = this._getPrimaryKeyConditions();

			await this.#query.send([
				"DELETE FROM " + this.#definition.escapedPath,
				"WHERE " + conditions.join(" AND ")
			].join(" "));

			this.#loaded = false;
			this.#deleted = true;
		}
		else {
			throw new sb.Error({
				message: "Row is not loaded - cannot delete",
				args: this._getErrorInfo()
			});
		}
	}

	/**
	 * @private
	 * Resets the data of the currently loaded row.
	 */
	reset () {
		if (!this.#initialized) {
			throw new sb.Error({
				message: "Cannot reset row - not initialized",
				args: this._getErrorInfo()
			});
		}

		this.#loaded = false;
		for (const column of this.#definition.columns) {
			this.#values[column.name] = Symbol.for("unset");
			this.#originalValues[column.name] = Symbol.for("unset");
		}
	}

	/**
	 * Syntax sugar to set multiple values at once.
	 * @param {Object} data
	 * @returns {Row}
	 */
	setValues (data) {
		if (!this.#initialized) {
			throw new sb.Error({
				message: "Cannot set column values - row not initialized",
				args: this._getErrorInfo()
			});
		}

		for (const [key, value] of Object.entries(data)) {
			this.values[key] = value;
		}

		return this;
	}

	/**
	 * Determines if a property exists on the row instance.
	 * @param {string} property
	 * @returns {boolean}
	 */
	hasProperty (property) {
		if (!this.#initialized) {
			throw new sb.Error({
				message: "Cannot check property - row not initialized",
				args: this._getErrorInfo()
			});
		}

		return (typeof this.#values[property] !== "undefined");
	}

	/**
	 * Creates and returns a simple Object with the Row's identifiers
	 * @returns {RowErrorIdentifier}
	 * @private
	 */
	_getErrorInfo () {
		return {
			database: this.#definition.database,
			table: this.#definition.name,
			primaryKeys: this.#primaryKeyFields.map(i => i.name),
			deleted: this.#deleted,
			initialized: this.#initialized,
			loaded: this.#loaded
		};
	}

	/**
	 * Returns a list of conditions based on the Row's primary keys and values
	 * @returns {string[]}
	 * @private
	 */
	_getPrimaryKeyConditions () {
		const conditions = [];
		for (const column of Object.entries(this.#primaryKeyFields)) {
			const parsedValue = this.#query.convertToSQL(this.#values[column.name], column.type);
			const identifier = this.#query.escapeIdentifier(column.name);

			conditions.push(`(${identifier} = ${parsedValue})`);
		}

		return conditions;
	}

	/** @type {Object} */
	get valuesObject () { return Object.assign({}, this.#values); }

	get values () { return this.#valueProxy; }
	get originalValues () { return this.#originalValues; }

	get PK () {
		const obj = {};
		for (const column of this.#primaryKeyFields) {
			obj[column.name] = this.#values[column.name];
		}

		return obj;
	}

	get definition () { return this.#definition || null; }
	get deleted () { return this.#deleted; }
	get initialized () { return this.#initialized; }
	get loaded () { return this.#loaded; }
};

/**
 * @typedef {Object} RowErrorIdentifier
 * @property {string} database
 * @property {string} table
 * @property {ColumnDefinition[]} primaryKeys
 * @property {boolean} deleted
 * @property {boolean} initialized
 * @property {boolean} loaded
 */
