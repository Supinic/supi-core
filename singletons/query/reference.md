# Using Recordset.reference

Suppose these three tables.
```sql
Table_From
    ID: PRIMARY KEY
    Name: VARCHAR

Table_To
    ID: PRIMARY KEY
    Name: VARCHAR
    Data: INT

Table_From_To
    From: INT
    To: INT
```
	
In order to fetch all From's with To's collapsed in each line, use this reference:

```js
sb.Query.getRecordset(rs => rs
    // It is important to manually select everything required for the reference!
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
        targetTable: "Table_From", // No implicit value (!).
        targetField: "ID", // Implicitly "ID".

        // Reference table that connects both Source and Target tables.
        referenceDatabase: "test", // Implicitly the same as the database in from().
        referenceTable: "Table_From", // No implicit value (!).
        referenceFieldSource: "From", // Implicitly the name of the Source table.
        referenceFieldTarget: "To", // Implicitly the name of the Target table.

        // Unique identifier that determines which rows will be collapsed together.
        // e.g. two rows with From_ID: 1, but different To_Name values will be collapsed into a single one. 
        collapseOn: "From_ID",
		
        // These columns will be represented in the collapsed array of values of the Target table.
        fields: ["To_Name", "Data"] 
    })
)
```