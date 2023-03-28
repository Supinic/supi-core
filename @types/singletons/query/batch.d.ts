import {
    ColumnDefinition,
    Database,
    Field,
    FormatValue,
    GenericQueryBuilderOptions,
    QuerySingleton as Query,
    Table
} from "./index";
import { PoolConnection } from "mariadb";

declare type ConstructorOptions = GenericQueryBuilderOptions & {
    database: Database;
    table: Table;
    threshold?: number;
};
declare type DuplicateOption = {
    duplicate: (data: string[][], stringColumns: Field[]) => string;
};
declare type IgnoreOption = {
    ignore: boolean;
};
declare type InsertOptions = DuplicateOption | IgnoreOption;

export declare type BatchRecord = Record<Field, FormatValue>;

export declare class Batch {
    readonly #query: Query;
    readonly #transaction: PoolConnection | null;

    readonly database: Database;
    readonly table: Table;
    readonly records: BatchRecord[];
    readonly columns: ColumnDefinition[];
    threshold: number;
    ready: boolean;

    constructor (query: Query, options: ConstructorOptions);

    initialize (columns: Field[]): Promise<Batch>;

    /**
     * Adds a data record, based on the Batch's columns definition
     * @param data
     * @returns The index of added data record
     */
    add (data: BatchRecord): number;

    /**
     * Deletes a record based on its index
     */
    delete (index: number): void;

    /**
     * Attempts to find a record based on a callback function
     */
    find (callback: typeof Array.prototype.find): BatchRecord | undefined;

    /**
     * Executes the INSERT statement for bound database, table and columns.
     * Automatically clears itself after the statement is executed.
     * @param options Additional options
     * @param options.ignore If true, batch will use `INSERT IGNORE INTO`.
     * @param options.duplicate If set, will use the result of this callback to create ON DUPLICATE KEY clausule.
     */
    insert (options?: InsertOptions): Promise<void>;

    /**
     * Clears all records from the instance.
     */
    clear (): void;
    destroy (): void;
}
