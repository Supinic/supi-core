import {
    QuerySingleton as Query,
    Database,
    Table,
    WhereHavingObject
} from "./index";

export declare class RecordDeleter {
    readonly #query: Query;
    readonly #deleteFrom: { database: Database, table: Table };
    readonly #where: Array<unknown>;
    #confirmedFullDelete: boolean;

    constructor (query: Query);

    delete (): RecordDeleter;
    from (database: Database, table: Table): RecordDeleter;
    where (...args: Array<string>): RecordDeleter;
    where (options: WhereHavingObject, ...args: Array<string>): RecordDeleter;
    confirm (): RecordDeleter;

    toSQL (): Array<string>;
    fetch (): ReturnType<Query["raw"]>;
}
