/* global sb */
/**
 * Represents the SQL INSERT statement for multiple rows.
 * One instance is always locked to one table and some of its columns based on constructor.
 */
module.exports = class Batch {
	/**
	 * Creates a new Batch instance. Constructor must be await-ed.
	 * @param {Query} query
	 * @param {string} db
	 * @param {string} table
	 * @param {string[]} columns
	 * @returns {Promise<Batch>}
	 * @throws sb.Error If a nonexistent column has been provided
	 */
	constructor (query, db, table, columns) {
		/** @type {Query} */
		this.query = query;
		/** @type {string} */
		this.database = db;
		/** @type {string} */
		this.table = table;
		/** @type {Object[]} */
		this.records = [];
		/** @type {ColumnDefinition[]} */
		this.columns = [];
		/** @type {boolean} */
		this.ready = false;

		return (async () => {
			const definition = await this.query.getDefinition(db, table);
			for (const column of columns) {
				if (definition.columns.every(col => column !== col.name)) {
					throw new sb.Error({
						message: "Unrecognized Batch column",
						args: {
							database: db,
							table,
							unrecognizedColumn: column,
							tableColumns: definition.columns.join(", ")
						}
					});
				}
			}

			this.columns = definition.columns.filter(column => columns.includes(column.name));
			this.ready = true;
			return this;
		})();
	}

	/**
	 * Adds a data record, based on the Batch's columns definition
	 * @param {Object} data
	 * @returns {number} The index of added data record
	 */
	add (data) {
		return (this.records.push(data) - 1);
	}

	/**
	 * Deletes a record based on its index
	 * @param index
	 */
	delete (index) {
		this.records.splice(index, 1);
	}

	/**
	 * Attempts to find a record based on a callback function
	 * @param {Function} callback
	 * @returns {Object|null} record
	 */
	find (callback) {
		return this.records.find(callback);
	}

	/**
	 * Executes the INSERT statement for bound database, table and columns.
	 * Automatically clears itself after the statement is executed.
	 * @param {Object} options Additional options
	 * @param {boolean} options.ignore If true, batch will use `INSERT IGNORE INTO`.
	 * @param {Function} options.duplicate If set, will use the result of this callback to create ON DUPLICATE KEY clausule.
	 * @returns {Promise<void>}
	 */
	async insert (options = {}) {
		if (this.records.length === 0) {
			return;
		}

		let stringColumns = [];
		let data = this.records.map(() => []);
		for (const column of this.columns) {
			const name = column.name;
			const type = column.type;
			stringColumns.push(this.query.escapeIdentifier(name));

			for (let i = 0; i < this.records.length; i++) {
				data[i].push(this.query.convertToSQL(this.records[i][name], type));
			}
		}

		const { duplicate, ignore } = options;
		if (duplicate && ignore) {
			throw new sb.Error({
				message: "Cannot set ignore and duplicate at the same time"
			});
		}

		data = data.filter(i => i.length !== 0);
		if (data.length !== 0) {
			try {
				await this.query.raw([
					`INSERT ${ignore ? "IGNORE" : ""} INTO`,
					"`" + this.database + "`.`" + this.table + "`",
					"(" + stringColumns.join(", ") + ")",
					"VALUES ("  + data.map(row => row.join(", ")).join("), (") + ")",
					(duplicate ? duplicate(data, stringColumns) : "")
				].join(" "));
			}
			catch (e) {
				console.error("Batch SQL failed", e);
			}
		}

		this.clear();
	}

	/**
	 * Clears all records from the instance.
	 */
	clear () {
		this.records = [];
	}

	/**
	 * Destroys the instance, freeing up memory and making it unusable.
	 */
	destroy () {
		this.clear();
		this.columns = null;
		this.records = null;
		this.query = null;
		this.table = null;
		this.database = null;
	}
};