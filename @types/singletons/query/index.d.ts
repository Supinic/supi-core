import { SingletonTemplate as Template } from "../template";
import { Batch, BatchRecord } from "./batch";
import { Row } from "./row";
import { RecordDeleter } from "./record-deleter";
import { Recordset } from "./recordset";
import { RecordUpdater } from "./record-updater";
import { CustomDate as Date } from "../../objects/date";
import { Flags, Pool, PoolConnection, Types as ColumnType } from "mariadb";

export {
    Batch,
    RecordDeleter,
    Recordset,
    RecordUpdater,
    Row
};

declare type BatchUpdateOptions = {
    batchSize: number;
    callback: (ru: RecordUpdater, row: BatchRecord) => void;
    staggerDelay: number;
};
declare type RecordsetCallback = (rs: Recordset) => Recordset;
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
    columns: Array<ColumnDefinition>;

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
export declare type FormatValue = number | string | boolean | Date | object | bigint | Array<string> | null;
export declare type WhereHavingObject = {
    condition?: boolean;
    raw?: string;
};

export declare class QuerySingleton implements Template {
    static module: QuerySingleton;
    static singleton (): QuerySingleton;
    static get flagMask (): Flags;
    static get sqlKeywords (): Array<string>;

    #definitionPromises: Map<TableDefinition["path"], Promise<TableDefinition>>;
    #loggingThreshold: number | null;
    private lifetimes: Lifetimes;
    private tableDefinitions: Array<TableDefinition>;
    private pool: Pool | null;

    constructor ();

    raw (...args: Array<string>): ReturnType<PoolConnection["query"]>;
    send (...args: Array<string>): ReturnType<QuerySingleton["raw"]>;
    getTransaction (): Promise<PoolConnection>;
    getRecordset (callback: RecordsetCallback): ReturnType<Recordset["fetch"]>;

    isRecordset (input: any): input is Recordset;
    isRecordDeleter (input: any): input is RecordDeleter;
    isRecordUpdater (input: any): input is RecordUpdater;
    isRow (input: any): input is Row;
    isBatch (input: any): input is Batch;

    getDefinition (database: Database, table: Table): Promise<TableDefinition>;
    isDatabasePresent (database: Database): Promise<boolean>;
    isTablePresent (database: Database, table: Table): Promise<boolean>;
    batchUpdate (data: Array<object>, options: BatchUpdateOptions): Promise<void>;
    getCondition (callback: RecordsetCallback): ReturnType<Recordset["toCondition"]>;
    invalidateDefinition (database: Database, table: Table): void;
    invalidateAllDefinitions (): void;

    convertToJS (value: string, type: ColumnType): FormatValue;
    convertToSQL (value: FormatValue, targetType: ColumnType): string;
    escapeIdentifier (string: string): string;
    escapeString (string: string): string;
    escapeLikeString (string: string): string;
    parseFormatSymbol (type: FormatSymbol, param: FormatValue): string;
    setLogThreshold (value: number): void;
    disableLogThreshold (): void;

    destroy (): void;
    get modulePath (): "query";
}
