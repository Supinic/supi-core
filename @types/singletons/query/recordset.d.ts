import { ColumnDefinition, Database, FormatValue, QuerySingleton as Query, Table } from "./index";

declare type Field = ColumnDefinition["name"];
export declare type Result = FormatValue | {
    [P: Field]: FormatValue
};
export declare type FetchResult = Result | Result[];

declare type CustomConditionJoinDescriptor = {
    alias?: string | null;
    toDatabase?: Database;
    toTable: Table;
    toField?: never;
    fromTable?: never;
    fromField?: never;
    condition?: never;
    on: string;
};
declare type SimpleJoinDescriptor = {
    alias?: string | null;
    toDatabase?: Database;
    toTable: Table;
    toField: Field;
    fromTable?: Table;
    fromField: Field;
    condition?: string | null;
    on?: never;
};
export declare type JoinDescriptor = CustomConditionJoinDescriptor | SimpleJoinDescriptor;

export declare type ReferenceOptions = {
    sourceDatabase?: Database;
    sourceTable?: Table;
    sourceField?: Field;

    targetDatabase?: Database;
    targetTable: Table;
    targetField?: Field;
    targetAlias?: string | null;

    referenceDatabase?: Database;
    referenceTable: Table;
    referenceFieldSource?: Table;
    referenceFieldTarget?: Table;

    condition: string;
    referenceCondition: string;
    targetCondition: string;

    fields: Field[];
    collapseOn: Field;
    left: boolean;
};
export declare type WhereHavingDescriptor = {
    condition?: boolean;
    raw?: string;
};

export declare type UseOptions = {
    bigint?: boolean;
};
export declare type UseProperty = keyof UseOptions;
export declare type UseValue = UseOptions[UseProperty];

/**
 * Represents the result of a SELECT statement with (usually) more than one result row.
 */
export declare class Recordset {
    /**
     * @private
     */
    private static collapseReferencedData (data: Result[], options: ReferenceOptions): void;

    readonly #query: Query;
    #fetchSingle: boolean;
    #raw: boolean;
    #flat: Field | null;
    #options: UseOptions;

    /**
     * Sets a HAVING/WHERE condition, avoids duplicate code
     * @private
     */
    #conditionWrapper: (type: "where" | "having", ...args: string[]) => Recordset;

    constructor (query: Query);

    /**
     * Sets a flag so the recordset will return the first result directly instead of returning an array.
     */
    single (): Recordset;

    /**
     * Sets for the query result to be an array of primitives, instead of an array of objects.
     * The object will be flattened, and only the field values will be preserved.
     */
    flat (field: Field): Recordset;

    /**
     * Sets an option to be used when constructing the SQL query.
     */
    use (option: UseProperty, value: UseValue): Recordset;

    /**
     * Sets the LIMIT.
     * @throws {sb.Error} If number is not a finite number
     */
    limit (number: number): Recordset;

    /**
     * Sets the OFFSET.
     * @throws {sb.Error} If number is not a finite number
     */
    offset (number: number): Recordset

    /**
     * Sets SELECT fields.
     */
    select (...args: Field[]): Recordset;

    /**
     * Sets the FROM table.
     */
    from (database: Database, table: Table): Recordset;

    /**
     * Sets a GROUP BY statement.
     */
    groupBy (...args: Field[]): Recordset;

    /**
     * Sets an ORDER BY statement.
     */
    orderBy (...args: string[]): Recordset;

    /**
     * Sets a WHERE condition.
     * Multiple formatting symbols {@link FormatSymbol} can be used
     */
    where (...args: [string, ...any[]]): Recordset;

    /**
     * Sets a WHERE condition.
     * First parameter is the option argument {@link WhereHavingDescriptor}
     */
    where (...args: [WhereHavingDescriptor, ...any[]]): Recordset;

    /**
     * Sets a HAVING condition.
     * First parameter can be an option argument {@link WhereHavingParams}
     * Multiple formatting symbols {@link FormatSymbol} can be used
     */
    having (...args: [string, ...any[]]): Recordset;

    /**
     Sets a HAVING condition.
     * First parameter is the option argument {@link WhereHavingDescriptor}
     */
    having (...args: [WhereHavingDescriptor, ...any[]]): Recordset;

    /**
     * Sets a table to JOIN.
     * @param database Options object for fully detailed JOIN operation.
     */
    join (database: JoinDescriptor): Recordset;

    /**
     * Sets a table to JOIN.
     * @param database Database name
     * @param target Table name
     * @param customField If provided, assumes the field is the foreign key in the tagret table
     * @param left
     */
    join (database: Database, target: Table, customField?: Field, left?: string): Recordset;

    /**
     * Sets a table to LEFT JOIN.
     * @param database Options object for fully detailed LEFT JOIN operation.
     */
    leftJoin (database: JoinDescriptor): Recordset;

    /**
     * Sets a table to LEFT JOIN.
     * @param database Database name
     * @param target Table name
     * @param customField If provided, assumes the field is the foreign key in the tagret table
     */
    leftJoin (database: Database, target: Table, customField?: Field): Recordset;

    /**
     * Joins tables in a 1:N or M:N relationship, aggregating the joined fields into arrays.
     * @see {@link ./reference.md}
     */
    reference (options: ReferenceOptions): Recordset;

    /**
     * Returns the WHERE condition.
     * @returns {string}
     */
    toCondition (): string;

    /**
     * Translates the Recordset to its SQL representation.
     * @throws {sb.Error} If no SELECT statement has been provided. The entire Recordset makes no sense should this happen
     */
    toSQL (): string[];

    /**
     * Executes the SQL query and converts received values to their JS representation.
     * @returns Returns:
     * - specific primitive value `{sb.Date|boolean|number|string|null|undefined}` if `single()` and `flat()` is used
     * - single `{Object}` if just `single()` is used
     * - otherwise `Object[]`
     */
    fetch (): Promise<FetchResult>;
}

/**
 * @typedef {"%b"|"%d"|"%dt"|"%p"|"%n"|"%s"|"%t"|"%like"|"%*like"|"%like*"|"%*like*"} FormatSymbol
 */
