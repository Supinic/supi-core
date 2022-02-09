import {
    QuerySingleton as Query,
    Database,
    Field,
    FormatValue,
    Table,
    WhereHavingObject
} from "./index";

export declare type Priority = "normal" | "low";

export declare class RecordUpdater {
    readonly #query: Query;
    #update: { database: Database, table: Table };
    #set: string[];
    #where: string[];
    #priority: Priority;
    #ignoreDuplicates: boolean;

    constructor (query: Query);

    priority (value: Priority): RecordUpdater;
    ignoreDuplicates (): RecordUpdater;
    update (database: Database, table: Table): RecordUpdater;
    set (column: Field, value: FormatValue): RecordUpdater;
    where (...args: string[]): RecordUpdater;
    where (options: WhereHavingObject, ...args: string[]): RecordUpdater;
    toSQL (): Promise<string[]>;
    fetch (): ReturnType<Query["raw"]>;
}
