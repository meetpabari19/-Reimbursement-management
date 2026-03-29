import pg from "pg"

const ref = "mahcfcuiovqcitmelmso"
const user = `postgres.${ref}`
const pass = "Meet%408200788330"
const regions = [
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ca-central-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
]

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`
  const connectionString = `postgresql://${user}:${pass}@${host}:6543/postgres`
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 2500,
    idleTimeoutMillis: 2500,
  })

  try {
    await pool.query("select 1")
    console.log(`${region} => OK`)
  } catch (error) {
    console.log(`${region} => ${error.code || error.message}`)
  } finally {
    await pool.end().catch(() => {})
  }
}

for (const region of regions) {
  await testRegion(region)
}
