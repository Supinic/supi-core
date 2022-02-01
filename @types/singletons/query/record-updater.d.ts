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
    #set: Array<string>;
    #where: Array<string>;
    #priority: Priority;
    #ignoreDuplicates: boolean;

    constructor (query: Query);

    priority (value: Priority): RecordUpdater;
    ignoreDuplicates (): RecordUpdater;
    update (database: Database, table: Table): RecordUpdater;
    set (column: Field, value: FormatValue): RecordUpdater;
    where (...args: Array<string>): RecordUpdater;
    where (options: WhereHavingObject, ...args: Array<string>): RecordUpdater;
    toSQL (): Promise<Array<string>>;
    fetch (): ReturnType<Query["raw"]>;
}
