import type {
    Database,
    Field,
    FormatValue,
    GenericQueryBuilderOptions,
    QuerySingleton as Query,
    Table,
    WhereHavingObject
} from "./index.d.ts";

import { PoolConnection } from "mariadb";

export declare type Priority = "normal" | "low";

export declare class RecordUpdater {
    readonly #query: Query;
    readonly #transaction: PoolConnection | null;
    #update: { database: Database, table: Table };
    #set: string[];
    #where: string[];
    #priority: Priority;
    #ignoreDuplicates: boolean;

    constructor (query: Query, options?: GenericQueryBuilderOptions);

    priority (value: Priority): RecordUpdater;
    ignoreDuplicates (): RecordUpdater;

    /**
     * Sets the UPDATE database + table.
     */
    update (database: Database, table: Table): RecordUpdater;

    /**
     * Sets the SET statement for a specific column.
     */
    set (column: Field, value: FormatValue): RecordUpdater;

    /**
     * Sets a WHERE condition.
     * Multiple formatting symbols {@link FormatSymbol} can be used
     */
    where (...args: string[]): RecordUpdater;

    /**
     * Sets a WHERE condition, where the first parameter is an option argument
     * Multiple formatting symbols {@link FormatSymbol} can be used
     */
    where (options: WhereHavingObject, ...args: string[]): RecordUpdater;

    toSQL (): Promise<string[]>;
    fetch (): ReturnType<Query["raw"]>;
}
