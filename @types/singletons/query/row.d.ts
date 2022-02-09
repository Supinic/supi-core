import { QuerySingleton as Query, ColumnDefinition, TableDefinition } from "./index";
import { CustomDate as Date } from "../../objects/date";
import { UpsertResult, TypeCastResult } from "mariadb";
import { SimpleGenericData } from "../../globals";

declare const unsetSymbol: symbol;

declare type PrimaryKey = string | number | Date; // @todo double check these
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

export declare class Row {
    #definition: TableDefinition;
    #query: Query;
    #values: object; // @todo proper values
    #originalValues: object; // @todo proper values
    #primaryKeyFields: string[];
    // #valueProxy: Proxy<T>;
    #initialized: boolean;
    #loaded: boolean;
    #deleted: boolean;

    constructor (query: Query);

    initialize (database: string, table: string): Promise<Row>;
    load (primaryKey: PrimaryKey | CompoundPrimaryKey, ignoreError?: boolean): Promise<Row>;
    save (options: SaveOptions): Promise<UpsertResult>;
    delete (): Promise<void>;
    setValues (data: SimpleGenericData): Row;
    hasProperty (property: string): boolean;
    private reset (): void;
    private _getErrorInfo (): ErrorInfo;
    private _getPrimaryKeyConditions (): string[];

    get valuesObject (): ValueObject;
    get originalValues (): ValueObject;

    get PK (): CompoundPrimaryKey;
    get definition (): TableDefinition;
    get deleted (): boolean;
    get initialized (): boolean;
    get loaded (): boolean;
}
