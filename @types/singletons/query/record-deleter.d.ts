import { Database, QuerySingleton as Query, Table, WhereHavingObject } from "./index";

export declare class RecordDeleter {
    readonly #query: Query;
    readonly #deleteFrom: { database: Database, table: Table };
    readonly #where: unknown[];
    #confirmedFullDelete: boolean;

    constructor (query: Query);

    delete (): RecordDeleter;
    from (database: Database, table: Table): RecordDeleter;
    where (...args: string[]): RecordDeleter;
    where (options: WhereHavingObject, ...args: string[]): RecordDeleter;
    confirm (): RecordDeleter;

    toSQL (): string[];
    fetch (): ReturnType<Query["raw"]>;
}
