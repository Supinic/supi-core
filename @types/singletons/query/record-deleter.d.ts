import {
    Database,
    GenericQueryBuilderOptions,
    QuerySingleton as Query,
    Table,
    WhereHavingObject
} from "./index";

import { PoolConnection } from "mariadb";

export declare class RecordDeleter {
    readonly #query: Query;
    readonly #transaction: PoolConnection | null;
    readonly #deleteFrom: { database: Database, table: Table };
    readonly #where: unknown[];
    #confirmedFullDelete: boolean;

    constructor (query: Query, options?: GenericQueryBuilderOptions);

    /**
     * Placeholder for the "correct" SQL syntax
     */
    delete (): RecordDeleter;

    /**
     * Creates a FROM statement for DELETE
     */
    from (database: Database, table: Table): RecordDeleter;

    /**
     * Sets a WHERE condition.
     * Multiple formatting symbols {@link FormatSymbol} can be used
     */
    where (...args: string[]): RecordDeleter;

    /**
     * Sets a WHERE condition, where the first parameter is an option argument
     * Multiple formatting symbols {@link FormatSymbol} can be used
     */
    where (options: WhereHavingObject, ...args: string[]): RecordDeleter;

    /**
     * If there is a need to delete without WHERE, this flag must be set.
     * Otherwise, a no-condition DELETE will not be performed, and ends with an exception.
     */
    confirm (): RecordDeleter;

    toSQL (): string[];
    fetch (): ReturnType<Query["raw"]>;
}
