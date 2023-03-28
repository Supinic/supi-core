/**
 * Represents the SQL INSERT statement for multiple rows.
 * One instance is always locked to one table and some of its columns based on constructor.
 */
module.exports = class Batch {
	/** @type {QuerySingleton} */
	#query;
	#transaction;

	/** @type {string} */
	database;
	/** @type {string} */
	table;
	/** @type {Object[]} */
	records = [];
	/** @type {ColumnDefinition[]} */
	columns = [];

	threshold = 1;
	ready = false;

	constructor (query, options) {
		this.#query = query;
		this.#transaction = options.transaction ?? null;
		this.database = options.database;
		this.table = options.table;

		if (typeof options.threshold === "number") {
			this.threshold = options.threshold;
		}
	}

	async initialize (columns) {
		const definition = await this.#query.getDefinition(this.database, this.table);
		for (const column of columns) {
			if (definition.columns.every(col => column !== col.name)) {
				throw new sb.Error({
					message: "Unrecognized Batch column",
					args: {
						database: this.database,
						table: this.table,
						unrecognizedColumn: column,
						tableColumns: definition.columns.join(", ")
					}
				});
			}
		}

		this.columns = definition.columns.filter(column => columns.includes(column.name));
		this.ready = true;

		return this;
	}

	add (data) {
		for (const key of Object.keys(data)) {
			const column = this.columns.find(i => i.name === key);
			if (!column) {
				throw new sb.Error({
					message: "Invalid batch column provided",
					args: {
						column: key,
						allowedColumns: this.columns.map(i => i.name)
					}
				});
			}
		}

		return (this.records.push(data) - 1);
	}

	delete (index) {
		this.records.splice(index, 1);
	}

	find (callback) {
		return this.records.find(callback);
	}

	async insert (options = {}) {
		if (this.records.length < this.threshold) {
			return;
		}

		const stringColumns = [];
		let data = this.records.map(() => []);
		for (const column of this.columns) {
			const name = column.name;
			const type = column.type;
			stringColumns.push(this.#query.escapeIdentifier(name));

			for (let i = 0; i < this.records.length; i++) {
				data[i].push(this.#query.convertToSQL(this.records[i][name], type));
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
			const sqlString = [
				`INSERT ${ignore ? "IGNORE" : ""} INTO`,
				`\`${this.database}\`.\`${this.table}\``,
				`(${stringColumns.join(", ")})`,
				`VALUES (${data.map(row => row.join(", ")).join("), (")})`,
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

	destroy () {
		this.clear();
		this.columns = null;
		this.records = null;
		this.#query = null;
		this.table = null;
		this.database = null;
	}
};
