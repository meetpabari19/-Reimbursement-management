import { db } from "../src/config/db.js"

const constraints = await db.query(
  "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.expenses'::regclass",
)

const columns = await db.query(
  "select column_name, is_nullable, data_type from information_schema.columns where table_schema='public' and table_name='expenses' order by ordinal_position",
)

console.log("CONSTRAINTS")
console.log(constraints.rows)
console.log("COLUMNS")
console.log(columns.rows)

await db.end()
