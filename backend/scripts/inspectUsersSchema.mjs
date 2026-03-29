import { db } from "../src/config/db.js"

const constraints = await db.query(
  "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.users'::regclass",
)

const columns = await db.query(
  "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='users' order by ordinal_position",
)

console.log("CONSTRAINTS")
console.log(constraints.rows)
console.log("COLUMNS")
console.log(columns.rows)

await db.end()
