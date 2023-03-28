import { ColumnDefinition, GenericQueryBuilderOptions, QuerySingleton as Query, TableDefinition } from "./index";
import { CustomDate } from "../../objects/date";
import { PoolConnection, TypeCastResult, UpsertResult } from "mariadb";

declare const unsetSymbol: symbol;

declare type PrimaryKey = string | number | bigint | CustomDate | Buffer;
declare type CompoundPrimaryKey = {
    [P: string]: PrimaryKey;
};
declare type SaveOptions = {
    ignore?: boolean;
    skipLoad?: boolean;
};
declare type ColumnValue = TypeCastResult | typeof unsetSymbol;
declare type ValueObject = Record<ColumnDefinition["name"], ColumnValue>;
declare type ErrorInfo = {
    database: TableDefinition["database"];
    table: TableDefinition["name"];
    primaryKeys: ColumnDefinition["name"][];
    deleted: boolean;
    initialized: boolean;
    loaded: boolean;
};

declare type RowValue = string | boolean | number | null | CustomDate | Date | { [p: string]: RowValue } | RowValue[];
declare type RowValueWrapper = Record<string, RowValue>;

// @todo possibly declare a row of a specific (object) type imported from elsewhere - via type params?
export declare class Row {
    #query: Query;
    #transaction: PoolConnection | null;
    #definition: TableDefinition;
    #values: ValueObject;
    #originalValues: ValueObject;
    #primaryKeyFields: string[];
    // #valueProxy: Proxy<T>;
    #initialized: boolean;
    #loaded: boolean;
    #deleted: boolean;

    constructor (query: Query, options?: GenericQueryBuilderOptions);

    /**
     * Initializes the row with database + table definitions
     */
    initialize (database: string, table: string): Promise<Row>;

    /**
     * Loads a row based on its primary key.
     * @param primaryKey Single primitive value for implied PK, or an Object of primitives for multi-column PKs
     * @param ignoreError If true, the method will not throw on non-existing row; rather returns an unloaded row
     */
    load (primaryKey: PrimaryKey | CompoundPrimaryKey, ignoreError?: boolean): Promise<Row>;

    /**
     * Saves the row.
     * If a primary key is present, saves the row as new (INSERT).
     * If not, saves an existing row (UPDATE).
     * @param options
     * @param [options.ignore] If true, INSERT will be executed as INSERT IGNORE (ignores duplicate keys)
     * @param [options.skipLoad] If true, the row will not re-load itself after saving
     */
    save (options?: SaveOptions): Promise<UpsertResult>;

    /**
     * Performs a DELETE operation on the currently loaded row.
     */
    delete (): Promise<void>;

    /**
     * Syntax sugar to set multiple values at once.
     */
    setValues (data: RowValueWrapper): Row;

    /**
     * Determines if a property exists on the row instance.
     */
    hasProperty (property: string): boolean;

    /**
     * Resets the data of the currently loaded row.
     */
    private reset (): void;

    /**
     * Creates and returns a simple Object with the Row's identifiers
     */
    private _getErrorInfo (): ErrorInfo;

    /**
     * Returns a list of conditions based on the Row's primary keys and values
     */
    private _getPrimaryKeyConditions (): string[];

    get valuesObject (): ValueObject;
    get originalValues (): ValueObject;

    get PK (): CompoundPrimaryKey;
    get definition (): TableDefinition;
    get deleted (): boolean;
    get initialized (): boolean;
    get loaded (): boolean;
}
