import {
    QuerySingleton as Query,
    ColumnDefinition,
    Database,
    Field,
    FormatValue,
    Table
} from "./index";

declare type ConstructorOptions = {
    database: Database;
    table: Table;
    threshold?: number;
};
declare type DuplicateOption = {
    duplicate: (data: Array<Array<string>>, stringColumns: Array<Field>) => string;
};
declare type IgnoreOption = {
    ignore: boolean;
};
declare type InsertOptions = DuplicateOption | IgnoreOption;

export declare type BatchRecord = Record<Field, FormatValue>;

export declare class Batch {
    private readonly query: Query;
    readonly database: Database;
    readonly table: Table;
    readonly records: Array<BatchRecord>;
    readonly columns: Array<ColumnDefinition>;
    threshold: number;
    ready: boolean;

    constructor (query: Query, options: ConstructorOptions);

    initialize (columns: Array<Field>): Promise<Batch>;
    add (data: BatchRecord): number;
    delete (index: number): void;
    find (callback: typeof Array.prototype.find): BatchRecord | undefined;
    insert (options?: InsertOptions): Promise<void>;
    clear (): void;
    destroy (): void;
}