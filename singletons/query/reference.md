# Using Recordset.reference

## M:N reference usage

Suppose these three tables.
```sql
Table_From
    ID: PRIMARY KEY
    Name: VARCHAR

Table_To
    ID: PRIMARY KEY
    Name: VARCHAR
    Data: INT

Connector
    From: INT (FK => Table_From)
    To: INT (FK => Table_To)
```

In order to fetch all rows of `Table_From` with all their corresponding `Table_To` rows, collapsed in each result row, consider this reference;

```js
sb.Query.getRecordset(rs => rs
    // It is important to manually SELECT everything required for the reference!
    .select("Table_From.ID AS From_ID")
    .select("Table_From.Name AS From_Name")
    .select("Table_To.Name AS To_Name")
    .select("Table_To.Data AS To_Data")

    .from("test", "Table_From")

    .reference({
        // Source table, from where the reference is initiated.
        sourceDatabase: "test", // Implicitly the same as the database in from().
        sourceTable: "Table_From", // Implicitly the same as the table in from().
        sourceField: "ID", // Implicitly "ID".

        // Target table, where the reference is aimed.
        targetDatabase: "test", // Implicitly the same as the database in from().
        targetTable: "Table_To", // No implicit value (!).
        targetField: "ID", // Implicitly "ID".

        // Reference table that connects both Source and Target tables.
        referenceDatabase: "test", // Implicitly the same as the database in from().
        referenceTable: "Connector", // No implicit value (!).
        referenceFieldSource: "From", // Implicitly the name of the Source table.
        referenceFieldTarget: "To", // Implicitly the name of the Target table.

        // Unique identifier that determines which rows will be collapsed together.
        // e.g. two rows with From_ID: 1, but different To_Name values will be collapsed into a single one. 
        collapseOn: "From_ID",
		
        // These columns will be represented in the collapsed array of values of the Target table.
        fields: ["To_Name", "Data"],
	    
        // Should an alias for the target table be required, it can be supplied here
	    // NOTE - all  fields and references to the table must use the alias, if it is used
        targetAlias: null,
        
        // Conditions for reference- and target-tables can be defined:
        referenceConddition: null,
        targetCondition: null
    })
)
```

Sample result:
```js
[
    { From_ID: 1, From_Name: "abc", Table_To: [{ Name: "foo", Data: null }] },
    { From_ID: 2, From_Name: "bcd", Table_To: [] },
    { From_ID: 3, From_Name: "cde", Table_To: [{ Name: "bar", Data: null }, { Name: "baz", Data: null }] }
]
```


## 1:N reference usage

Suppose these two tables.
```sql
Foo
    ID: PRIMARY KEY
    Name: VARCHAR

Alias
    Foo_Field: ID (FK => Foo)
    Name: VARCHAR
```

In order to fetch all alias names for each Foo, consider the following:

```js
sb.Query.getRecordset(rs => rs
    // It is important to manually SELECT everything required for the reference!
    .select("Foo.ID AS Foo_ID")
    .select("Alias.Name AS Alias_Name")

    .from("test", "Foo")

    .reference({
        sourceDatabase: "test", // Implicitly the same as the database in from().
        sourceTable: "Table_From", // Implicitly the same as the table in from().
        sourceField: "ID", // Implicitly "ID".

        targetDatabase: "test", // Implicitly the same as the database in from().
        targetTable: "Table_To", // No implicit value (!).
        targetField: "ID", // Implicitly "ID".
        
        collapseOn: "From_ID",
        fields: ["Alias_Name"],	    
        
        // If needed, an alias can be defined.
        // NOTE - all fields and references to the table must use the alias, if it is used
        targetAlias: null,
        
        // Conditions for target-table (only) can be defined:
        condition: null,
    })
)
```

Sample result:
```js
[
    { Foo_ID: 1, Table_To: [{ Name: "foo" }] },
    { Foo_ID: 2, Table_To: [] },
    { Foo_ID: 3, Table_To: [{ Name: "bar" }, { Name: "baz" }] }	
]
```