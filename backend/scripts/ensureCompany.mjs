import { db } from "../src/config/db.js"

await db.query(
  "insert into public.companies (id, name, currency_code) values (1, 'ReimburseX Labs', 'INR') on conflict (id) do nothing",
)

const result = await db.query("select id, name, currency_code from public.companies where id = 1")
console.log(result.rows[0])

await db.end()
