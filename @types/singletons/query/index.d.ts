import type { Batch, ConstructorOptions as BatchOptions } from "./batch.d.ts";
import type { Row } from "./row.d.ts";
import type { RecordDeleter } from "./record-deleter.d.ts";
import type { Recordset } from "./recordset.d.ts";
import type { RecordUpdater } from "./record-updater.d.ts";
import type { SupiDate } from "../../objects/date.d.ts";
import type { SimpleGenericData } from "../../globals.d.ts";

import { Flags, Pool, PoolConnection, Types as ColumnType } from "mariadb";

export {
    Batch,
    RecordDeleter,
    Recordset,
    RecordUpdater,
    Row
};

declare type BatchUpdateOptions <T> = {
    batchSize: number;
    callback: (ru: RecordUpdater, row: T) => void;
    staggerDelay: number;
};
declare type RecordsetCallback = (rs: Recordset) => Recordset;
declare type RecordDeleterCallback = (rd: RecordDeleter) => RecordDeleter;
declare type Lifetimes = {
    batches: WeakSet<Batch>;
    connectors: WeakSet<PoolConnection>;
    recordDeleters: WeakSet<RecordDeleter>;
    recordsets: WeakSet<Recordset>;
    recordUpdaters: WeakSet<RecordUpdater>;
    rows: WeakSet<Row>;
    transactions: WeakSet<PoolConnection>;
}

export declare type ColumnDefinition = {
    name: string;
    type: ColumnType,
    notNull: boolean;
    primaryKey: boolean;
    unsigned: boolean;
    autoIncrement: boolean;
    zeroFill: boolean;

    /**
     * @property {string} name Column name
     * @property {string} type Column type
     * @property {boolean} notNull If true, column can be set to null
     * @property {boolean} primaryKey If true, column is the primary key or a part of it
     * @property {boolean} unsigned If true, a numeric column is unsigned
     * @property {boolean} autoIncrement If true, the column is an AUTO_INCREMENT primary key
     * @property {boolean} zeroFill If true, the column is a numeric field left-filled with zeroes
     */
};
export declare type TableDefinition = {
    database: string;
    name: string;
    path: string;
    escapedPath: string;
    columns: ColumnDefinition[];

    /**
     * @property {string} database Database of table
     * @property {string} name Name of table
     * @property {string} path {@link TableDefinition#database} . {@link TableDefinition#name}
     * @property {string} escapedPath like `.path`, but escaped with backticks
     * @property {ColumnDefinition[]} columns Column definition
     */
};
export declare type Database = TableDefinition["database"];
export declare type Field = ColumnDefinition["name"];
export declare type Table = TableDefinition["name"];
export declare type FormatSymbol = "b" | "d" | "dt" | "n" | "s" | "t" | "s+" | "n+" | "like" | "like*" | "*like" | "*like*";
export declare type FormatValue = number | string | boolean | SupiDate | SimpleGenericData | bigint | string[] | null;
export declare type WhereHavingObject = {
    condition?: boolean;
    raw?: string;
};
export declare type GenericQueryBuilderOptions = {
    transaction?: PoolConnection
};

declare type CommonConstructorOptions = {
    user: string;
    password: string;
    connectionLimit?: number;
};
declare type PathConstructorOptions = CommonConstructorOptions & {
    path: string;
};
declare type HostConstructorOptions = CommonConstructorOptions & {
    host: string;
    port?: number;
};

export declare type ConstructorOptions = PathConstructorOptions | HostConstructorOptions;

/**
 * Query represents every possible access to the database.
 *
 * Exposes multiple ways to access the database definition:
 * - {@link Batch}: A tool to INSERT multiple rows in one statement, for specified columns
 * - {@link Recordset}: Result of a compound SELECT statement
 * - {@link RecordUpdater}: UPDATEs specified columns with values, with specified condition(s)
 * - {@link Row}: Single table row, select/insert/update/delete
 */
export declare class QuerySingleton {
    static get flagMask (): Flags;
    static get sqlKeywords (): string[];

    #definitionPromises: Map<TableDefinition["path"], Promise<TableDefinition>>;
    #loggingThreshold: number | null;
    private lifetimes: Lifetimes;
    private tableDefinitions: TableDefinition[];
    private pool: Pool | null;

    constructor (options: ConstructorOptions);

    /**
     * Executes a raw SQL query.
     */
    raw (...args: string[]): ReturnType<PoolConnection["query"]>;

    /**
     * Alias of {@link Query.raw}
     */
    send (...args: string[]): ReturnType<QuerySingleton["raw"]>;

    /**
     * Allows a transaction-based query, or a regular one if none is provided.
     */
    transactionQuery (sqlString: string, transaction: PoolConnection | null): ReturnType<QuerySingleton["raw"]>;

    /**
     * Prepares a transaction for next use.
     * Transaction must be committed/rolled back manually afterwards.
     */
    getTransaction (): Promise<PoolConnection>;
    getRecordset (callback: RecordsetCallback, options?: GenericQueryBuilderOptions): ReturnType<Recordset["fetch"]>;
    getRecordDeleter (callback: RecordDeleterCallback, options?: GenericQueryBuilderOptions): ReturnType<RecordDeleter["fetch"]>;
    getRow (database: Database, table: Table, options?: GenericQueryBuilderOptions): Promise<Row>;

    /**
     * Returns a new Batch instance.
     * @param database Database of the table
     * @param table Name of the table
     * @param columns Column names to insert into given table
     * @param options
     */
    getBatch (database: Database, table: Table, columns: string[], options: BatchOptions): Promise<Row>;

    isRecordset (input: any): input is Recordset;
    isRecordDeleter (input: any): input is RecordDeleter;
    isRecordUpdater (input: any): input is RecordUpdater;
    isRow (input: any): input is Row;
    isBatch (input: any): input is Batch;

    getDefinition (database: Database, table: Table): Promise<TableDefinition>;
    isDatabasePresent (database: Database): Promise<boolean>;
    isTablePresent (database: Database, table: Table): Promise<boolean>;
    isTableColumnPresent (database: Database, table: Table, column: ColumnDefinition["name"]): Promise<boolean>;

    /**
     * Performs a configurable batched update.
     * Supports staggering, grouping statements into transactions, and more.
     * @param data List of rows to update
     * @param options Configurable options object
     * @param options.callback Callback that gets passed into the RecordUpdater instances
     */
    batchUpdate <T extends SimpleGenericData> (data: T[], options: BatchUpdateOptions<T>): Promise<void>;
    getCondition (callback: RecordsetCallback): ReturnType<Recordset["toCondition"]>;

    /**
     * Invalidates a specific table definition.
     * The next time it is accessed, it will be refreshed.
     */
    invalidateDefinition (database: Database, table: Table): void;

    /**
     * Invalidates all table definitions.
     * The next time they're accessed, they will be refreshed.
     */
    invalidateAllDefinitions (): void;

    /**
     * Converts a SQL value and type to a Javascript value
     * SQL TINYINT(1) -> JS boolean
     * SQL DATE/DATETIME/TIMESTAMP -> JS sb.Date
     * SQL JSON -> JS Object
     * SQL *INT/*TEXT/*CHAR -> JS number/string
     */
    convertToJS (value: string, type: ColumnType): FormatValue;

    /**
     * Converts a Javascript value to its SQL counterpart
     * JS null -> SQL NULL
     * JS boolean -> SQL TINYINT(1)
     * JS Date/sb.Date -> SQL TIME/DATE/DATETIME/TIMESTAMP
     * JS string -> escaped SQL VARCHAR/*TEXT
     * JS number -> SQL *INT
     */
    convertToSQL (value: FormatValue, targetType: ColumnType): string;
    escapeIdentifier (string: string): string;
    escapeString (string: string): string;

    /**
     * Escapes a LIKE string to be SQL-compliant - makes sure to keep % characters in correct places
     */
    escapeLikeString (string: string): string;

    /**
     * Replaces format symbols used in WHERE/HAVING with their provided values and escapes/parses them.
     */
    parseFormatSymbol (type: FormatSymbol, param: FormatValue): string;
    setLogThreshold (value: number): void;
    disableLogThreshold (): void;

    destroy (): void;
}
