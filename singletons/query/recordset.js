import SupiError from "../../objects/error.js";

const ROW_COLLAPSED = Symbol("row-collapsed");

export default class Recordset {
	#query;
	#transaction;
	#fetchSingle = false;
	#raw = null;
	#options = {};
	#flat = null;

	#select = [];
	#from = { database: null, table: null };
	#where = [];
	#having = [];
	#orderBy = [];
	#groupBy = [];
	#join = [];
	#limit = null;
	#offset = null;
	#reference = [];

	constructor (query, options = {}) {
		this.#query = query;
		this.#transaction = options.transaction ?? null;
	}

	single () {
		this.#fetchSingle = true;
		return this;
	}

	flat (field) {
		this.#flat = field;
		return this;
	}

	use (option, value) {
		this.#options[option] = value;
		return this;
	}

	limit (number) {
		this.#limit = Number(number);

		if (!Number.isFinite(this.#limit)) {
			throw new SupiError({
				message: "Limit must be a finite number",
				args: number
			});
		}

		return this;
	}

	offset (number) {
		this.#offset = Number(number);

		if (!Number.isFinite(this.#offset)) {
			throw new SupiError({
				message: "Offset must be a finite number",
				args: number
			});
		}

		return this;
	}

	select (...args) {
		this.#select = this.#select.concat(args);
		return this;
	}

	from (database, table) {
		if (!database || !table) {
			throw new SupiError({
				message: "Recordset: database and table must be provided",
				args: {
					db: database,
					table
				}
			});
		}

		this.#from.database = database;
		this.#from.table = table;
		return this;
	}

	groupBy (...args) {
		this.#groupBy = this.#groupBy.concat(args);
		return this;
	}

	orderBy (...args) {
		this.#orderBy = this.#orderBy.concat(args);
		return this;
	}

	where (...args) {
		return this.#conditionWrapper("where", ...args);
	}

	having (...args) {
		return this.#conditionWrapper("having", ...args);
	}

	#conditionWrapper (type, ...args) {
		let options = {};
		if (args[0] && args[0].constructor === Object) {
			options = args[0];
			args.shift();
		}

		if (typeof options.condition !== "undefined" && !options.condition) {
			return this;
		}

		if (typeof options.raw !== "undefined") {
			this.#where.push(options.raw);
			return this;
		}

		let format = "";
		if (typeof args[0] === "string") {
			format = args.shift();
		}

		let index = 0;
		format = format.replace(this.#query.formatSymbolRegex, (fullMatch, param) => (
			this.#query.parseFormatSymbol(param, args[index++])
		));

		if (type === "where") {
			this.#where = this.#where.concat(format);
		}
		else if (type === "having") {
			this.#having = this.#having.concat(format);
		}
		else {
			throw new SupiError({
				message: "Recordset: Unrecognized condition wrapper option",
				args: { type, args }
			});
		}

		return this;
	}

	join (database, target, customField, left = "") {
		if (typeof target === "string") {
			const dot = (database) ? (`${database}.\`${target}\``) : (`\`${target}\``);
			this.#join.push(`${left}JOIN ${dot} ON \`${this.#from.table}\`.\`${customField || target}\` = ${dot}.ID`);
		}
		else if (database && database.constructor === Object) {
			const {
				toDatabase = this.#from.database,
				toTable,
				toField,

				fromTable = this.#from.table,
				fromField,

				alias,
				condition,
				on
			} = database;

			if (!toTable || !toDatabase) {
				throw new SupiError({
					message: "Missing compulsory arguments for join",
					args: target
				});
			}

			let result = `${left}JOIN \`${toDatabase}\`.\`${toTable}\``;
			if (alias) {
				result += ` AS \`${alias}\` `;
			}

			if (on) {
				result += `ON ${on}`;
			}
			else {
				result += ` ON \`${fromTable}\`.\`${fromField}\` = \`${alias ?? toTable}\`.\`${toField}\``;
				if (condition) {
					result += ` AND ${condition}`;
				}
			}

			this.#join.push(result);
		}
		else if (target && target.constructor === Object && typeof target.raw === "string") {
			this.#join.push(`${left}JOIN ${target.raw}`);
		}

		return this;
	}

	leftJoin (database, target, customField) {
		return this.join(database, target, customField, "LEFT ");
	}

	reference (options = {}) {
		const {
			sourceDatabase = this.#from.database,
			sourceTable = this.#from.table,
			sourceField = "ID",

			targetDatabase = this.#from.database,
			targetTable,
			targetField = "ID",
			targetAlias = null,

			referenceDatabase = this.#from.database,
			referenceTable,
			referenceFieldSource = sourceTable,
			referenceFieldTarget = targetTable,

			condition,
			referenceCondition,
			targetCondition,

			fields = [],
			collapseOn,
			left = true
		} = options;

		const joinType = (left) ? "leftJoin" : "join";

		if (referenceTable && targetTable) {
			this[joinType]({
				fromDatabase: sourceDatabase,
				fromTable: sourceTable,
				fromField: sourceField,
				toDatabase: referenceDatabase,
				toTable: referenceTable,
				toField: referenceFieldSource,
				condition: referenceCondition
			});

			this[joinType]({
				fromDatabase: referenceDatabase,
				fromTable: referenceTable,
				fromField: referenceFieldTarget,
				toDatabase: targetDatabase,
				toTable: targetTable,
				toField: targetField,
				alias: targetAlias,
				condition: targetCondition
			});

			this.#reference.push({
				collapseOn: collapseOn ?? null,
				columns: fields,
				target: targetAlias ?? targetTable
			});
		}
		else if (targetTable && !referenceTable) {
			this[joinType]({
				fromDatabase: sourceDatabase,
				fromTable: sourceTable,
				fromField: sourceField,
				toDatabase: targetDatabase,
				toTable: targetTable,
				toField: targetField,
				alias: targetAlias,
				condition
			});

			this.#reference.push({
				collapseOn: collapseOn ?? null,
				columns: fields,
				target: targetAlias ?? targetTable
			});
		}
		else {
			throw new SupiError({
				message: "Too many missing table specifications"
			});
		}

		return this;
	}

	toCondition () {
		if (this.#where.length !== 0) {
			return `(${this.#where.join(") AND (")})`;
		}
		else {
			return "";
		}
	}

	toSQL () {
		if (this.#raw) {
			return this.#raw;
		}

		if (this.#select.length === 0) {
			throw new SupiError({
				message: "No SELECT in Recordset - invalid definition"
			});
		}

		const sql = [];
		sql.push(`SELECT ${this.#select.map(select => this.#query.escapeIdentifier(select)).join(", ")}`);

		if (this.#from) {
			sql.push(`FROM \`${this.#from.database}\`.\`${this.#from.table}\``);
		}
		if (this.#join.length !== 0) {
			sql.push(this.#join.join(" "));
		}
		if (this.#where.length !== 0) {
			sql.push(`WHERE (${this.#where.join(") AND (")})`);
		}
		if (this.#groupBy.length !== 0) {
			sql.push(`GROUP BY ${this.#groupBy.join(", ")}`);
		}
		if (this.#having.length !== 0) {
			sql.push(`HAVING ${this.#having.join(", ")}`);
		}
		if (this.#orderBy.length !== 0) {
			sql.push(`ORDER BY ${this.#orderBy.join(", ")}`);
		}
		if (this.#limit !== null) {
			sql.push(`LIMIT ${this.#limit}`);
		}
		if (this.#offset !== null) {
			sql.push(`OFFSET ${this.#offset}`);
		}

		return sql;
	}

	async fetch () {
		const sql = this.toSQL();
		const sqlString = sql.join("\n");
		let rows = null;

		try {
			rows = await this.#query.transactionQuery(sqlString, this.#transaction);
		}
		catch (e) {
			console.error(e);
			throw e;
		}

		const definition = {};
		for (const column of rows.meta) {
			definition[column.name()] = column.type;
		}

		let result = [];
		for (const row of rows) {
			if (this.#flat && typeof row[this.#flat] === "undefined") {
				throw new SupiError({
					message: `Column ${this.#flat} is not included in the result`,
					args: {
						column: this.#flat,
						resultColuns: Object.keys(row)
					}
				});
			}

			for (const [name, value] of Object.entries(row)) {
				let type = definition[name];
				if (definition[name] === "LONGLONG" && !this.#options.bigint) {
					type = "LONG";
				}

				row[name] = this.#query.convertToJS(value, type);
			}

			if (this.#flat) {
				result.push(row[this.#flat]);
			}
			else {
				result.push(row);
			}
		}

		if (this.#reference.length > 0) {
			for (const reference of this.#reference) {
				if (reference.collapseOn) {
					Recordset.collapseReferencedData(result, reference);
				}
			}

			result = result.filter(i => !i[ROW_COLLAPSED]);
		}

		// result.sql = sql;
		return (this.#fetchSingle)
			? result[0]
			: result;
	}

	static collapseReferencedData (data, options) {
		const keyMap = new Map();
		const { collapseOn: collapser, target, columns } = options;
		const regex = new RegExp(`^${target}_`);

		for (let i = data.length - 1; i >= 0; i--) {
			const row = data[i];
			if (!keyMap.has(row[collapser])) {
				keyMap.set(row[collapser], []);
			}
			else {
				data[i][ROW_COLLAPSED] = true;
			}

			const copiedProperties = {};
			for (const column of columns) {
				copiedProperties[column.replace(regex, "")] = row[column];
				delete row[column];
			}

			let addProperties = true;
			for (const value of keyMap.get(row[collapser])) {
				const skip = Object.keys(value).every(i => value[i] === copiedProperties[i]);
				if (skip) {
					addProperties = false;
					break;
				}
			}

			if (addProperties) {
				keyMap.get(row[collapser]).push(copiedProperties);
			}
		}

		for (const row of data) {
			row[target] = keyMap.get(row[collapser]);

			if (row[target].length === 1) {
				const allNull = !Object.values(row[target][0]).some(Boolean);
				if (allNull) {
					row[target] = [];
				}
			}
		}
	}
}
