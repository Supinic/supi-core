import SupiError from "../../objects/error.js";
import type { PoolConnection } from "mariadb";
import QuerySingleton, {
	Database,
	Table,
	Field,
	MariaRowMeta,
	ExtendedColumnType,
	Value
} from "./index.js";

const ROW_COLLAPSED = "#row_collapsed";

type ConstructorOptions = {
	transaction?: PoolConnection;
};
type FromObject = {
	database: Database | null;
	table: Table | null;
};
type WhereHavingArgument = string;
export type WhereHavingOptions = {
	raw?: string;
	condition?: string;
};
export type MixedWhereHavingArgument = WhereHavingOptions | WhereHavingArgument;

type UseOptions = {
	bigint?: boolean;
};

type JoinInput = string | {
	toDatabase?: Database;
	toTable: Table;
	toField?: Field;
	fromTable?: Table;
	fromField?: Field;
	alias?: string;
	condition?: string;
	on?: string;
};
type JoinTarget = string | {
	raw: string;
};

type ReferenceOptions = {
	sourceDatabase?: Database;
	sourceTable?: Table;
	sourceField?: Field;

	targetDatabase?: Database;
	targetTable: Table;
	targetField?: Field;
	targetAlias?: string;

	referenceDatabase?: Database;
	referenceTable: Table;
	referenceFieldSource?: Table;
	referenceFieldTarget?: Table;

	condition: string;
	referenceCondition: string;
	targetCondition: string;

	fields: Field[];
	collapseOn: Field;
	left: boolean;
};
type ReferenceDescriptor = {
	collapseOn: string;
	columns: string[];
	target: string;
};

export type ResultObject = Record<string, Value>;
type QueryResultObject = Record<string, Value>;
type MetaResultObject = QueryResultObject[] & {
	meta: MariaRowMeta[]
};

export default class Recordset {
	#query: QuerySingleton;
	#transaction?: PoolConnection;
	#fetchSingle = false;
	#raw = null;
	#options: UseOptions = {};
	#flat: string | null = null;

	#select: string[] = [];
	#from: FromObject = { database: null, table: null };
	#where: string[] = [];
	#having: string[] = [];
	#orderBy: string[] = [];
	#groupBy: string[] = [];
	#join: string[] = [];

	#limit: number | null = null;
	#offset: number | null = null;
	#reference: ReferenceDescriptor[] = [];

	constructor (query: QuerySingleton, options: ConstructorOptions = {}) {
		this.#query = query;
		this.#transaction = options.transaction;
	}

	single (): this {
		this.#fetchSingle = true;
		return this;
	}

	flat (expression: string): this {
		this.#flat = expression;
		return this;
	}

	use (option: "bigint", value: boolean): this;
	use (option: keyof UseOptions, value: boolean): this {
		this.#options[option] = value;
		return this;
	}

	limit (number: number): this {
		this.#limit = Number(number);

		if (!Number.isFinite(this.#limit)) {
			throw new SupiError({
				message: "Limit must be a finite number",
				args: number
			});
		}

		return this;
	}

	offset (number: number): this {
		this.#offset = Number(number);

		if (!Number.isFinite(this.#offset)) {
			throw new SupiError({
				message: "Offset must be a finite number",
				args: number
			});
		}

		return this;
	}

	select (...args: string[]): this {
		this.#select.push(...args);
		return this;
	}

	from (database: string, table: string): this {
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

	groupBy (...args: string[]): this {
		this.#groupBy.push(...args);
		return this;
	}

	orderBy (...args: string[]): this {
		this.#orderBy.push(...args);
		return this;
	}

	where (...args: MixedWhereHavingArgument[]): this {
		return this.#conditionWrapper("where", ...args);
	}

	having (...args: MixedWhereHavingArgument[]): this {
		return this.#conditionWrapper("having", ...args);
	}

	#conditionWrapper (type: "where" | "having", ...args: MixedWhereHavingArgument[]): this {
		let options: WhereHavingOptions = {};
		if (args[0] && typeof args[0] === "object") {
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

		// At this point, the remaining arguments are guaranteed to be WhereHavingArgument only,
		// since the options type has been extracted out.
		const restArgs = args as WhereHavingArgument[];
		let format = "";
		if (typeof restArgs[0] === "string") {
			format = restArgs.shift() as string;
		}

		let index = 0;
		format = format.replace(this.#query.formatSymbolRegex, (fullMatch, param) => (
			this.#query.parseFormatSymbol(param, restArgs[index++])
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

	join (input: JoinInput, target?: JoinTarget, customField?: string, left: string = "") {
		if (typeof target === "string") {
			const dot = (input) ? (`${input}.\`${target}\``) : (`\`${target}\``);
			this.#join.push(`${left}JOIN ${dot} ON \`${this.#from.table}\`.\`${customField || target}\` = ${dot}.ID`);
		}
		else if (input && typeof input === "object") {
			const {
				toDatabase = this.#from.database,
				toTable,
				toField,

				fromTable = this.#from.table,
				fromField,

				alias,
				condition,
				on
			} = input;

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
		else if (target && typeof target === "object") {
			this.#join.push(`${left}JOIN ${target.raw}`);
		}

		return this;
	}

	leftJoin (input: JoinInput, target?: string, customField?: string): this {
		return this.join(input, target, customField, "LEFT ");
	}

	reference (options: ReferenceOptions): this {
		if (!this.#from.database || !this.#from.table) {
			throw new SupiError({
				message: "Cannot call `reference()` before calling `from()`"
			});
		}

		const {
			sourceDatabase = this.#from.database,
			sourceTable = this.#from.table,
			sourceField = "ID",

			targetDatabase = this.#from.database,
			targetTable,
			targetField = "ID",
			targetAlias,

			referenceDatabase = this.#from.database,
			referenceTable,
			referenceFieldSource = sourceTable,
			referenceFieldTarget = targetTable,

			// condition,
			referenceCondition,
			targetCondition,

			fields = [],
			collapseOn,
			left = true
		} = options;

		if (referenceTable && targetTable) {
			const firstOptions = {
				fromDatabase: sourceDatabase,
				fromTable: sourceTable,
				fromField: sourceField,
				toDatabase: referenceDatabase,
				toTable: referenceTable,
				toField: referenceFieldSource,
				condition: referenceCondition
			};
			const secondOptions = {
				fromDatabase: referenceDatabase,
				fromTable: referenceTable,
				fromField: referenceFieldTarget,
				toDatabase: targetDatabase,
				toTable: targetTable,
				toField: targetField,
				alias: targetAlias,
				condition: targetCondition
			};

			if (left) {
				this.leftJoin(firstOptions);
				this.leftJoin(secondOptions);
			}
			else {
				this.join(firstOptions);
				this.join(secondOptions);
			}

			this.#reference.push({
				collapseOn,
				columns: fields,
				target: targetAlias ?? targetTable
			});
		}
		else if (targetTable && !referenceTable) {
			const options = {
				fromDatabase: sourceDatabase,
				fromTable: sourceTable,
				fromField: sourceField,
				toDatabase: referenceDatabase,
				toTable: referenceTable,
				toField: referenceFieldSource,
				condition: referenceCondition
			};

			if (left) {
				this.leftJoin(options);
			}
			else {
				this.join(options);
			}

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

	toCondition (): string {
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

	async fetch (): Promise<Value | ResultObject | ResultObject[]> {
		const sql = this.toSQL();
		const sqlString = sql.join("\n");
		let rows = null;

		try {
			rows = await this.#query.transactionQuery(sqlString, this.#transaction) as MetaResultObject;
		}
		catch (e) {
			console.error(e);
			throw e;
		}

		const definition: Record<string, ExtendedColumnType> = {};
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
					Recordset.collapseReferencedData(result as ResultObject[], reference);
				}
			}

			result = (<ResultObject[]>result).filter(i => !i[ROW_COLLAPSED]);
		}

		// result.sql = sql;
		// @ts-expect-error @todo
		return (this.#fetchSingle)
			? result[0]
			: result;
	}

	static collapseReferencedData (data: ResultObject[], options: ReferenceDescriptor) {
		const keyMap = new Map();
		const { collapseOn: collapser, target, columns } = options;
		const regex = new RegExp(`^${target}_`);

		for (let i = data.length - 1; i >= 0; i--) {
			const row = data[i];
			if (!keyMap.has(row[collapser])) {
				keyMap.set(row[collapser], []);
			}
			else {
				// @ts-expect-error @todo
				data[i][ROW_COLLAPSED] = true;
			}

			const copiedProperties: Record<string, Value> = {};
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

			if (Array.isArray(row[target]) && row[target].length === 1) {
				const allNull = !Object.values(row[target][0]).some(Boolean);
				if (allNull) {
					// @ts-expect-error @todo
					row[target] = [];
				}
			}
		}
	}
}
