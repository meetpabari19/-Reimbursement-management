import { db } from "../src/config/db.js"

const tables = ["expenses", "approval_rules", "companies", "users"]

for (const table of tables) {
  const cols = await db.query(
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
    [table],
  )
  console.log(`TABLE ${table}`)
  console.log(cols.rows)
}

await db.end()
