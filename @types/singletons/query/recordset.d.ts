import {
    QuerySingleton as Query,
    ColumnDefinition,
    Database,
    FormatValue,
    Table
} from "./index";

declare type Field = ColumnDefinition["name"];
export declare type Result = FormatValue | {
    [P: Field]: FormatValue
};
export declare type FetchResult = Result | Result[];
export declare type JoinDescriptor = {
    toDatabase?: Database;
    toTable: Table;
    toField: Field;
    fromTable?: Table;
    fromField: Field;
    alias?: string | null;
    condition?: string | null;
    on?: string | null;
};
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

export declare type UseOptions = {
    bigint?: boolean;
};
export declare type UseProperty = keyof UseOptions;
export declare type UseValue = UseOptions[UseProperty];

export declare class Recordset {
    private static collapseReferencedData (data: Result[], options: ReferenceOptions): void;

    readonly #query: Query;
    #fetchSingle: boolean;
    #raw: boolean;
    #flat: Field | null;
    #options: UseOptions;
    #conditionWrapper: (type: "where" | "having", ...args: string[]) => Recordset;

    constructor (query: Query);

    single (): Recordset;
    flat (field: Field): Recordset;
    use (option: UseProperty, value: UseValue): Recordset;
    limit (number: number): Recordset;
    select (...args: Field[]): Recordset;
    from (database: Database, table: Table): Recordset;
    groupBy (...args: Field[]): Recordset;
    orderBy (...args: string[]): Recordset;
    where (...args: string[]): Recordset;
    having (...args: string[]): Recordset;
    join (database: JoinDescriptor): Recordset;
    join (database: Database, target: Table, customField?: Field, left?: string): Recordset;
    leftJoin (database: JoinDescriptor): Recordset;
    leftJoin (database: Database, target: Table, customField?: Field): Recordset;
    reference (options: ReferenceOptions): Recordset;

    toCondition (): string;
    toSQL (): string[];
    fetch (): Promise<FetchResult>;
}
