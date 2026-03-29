import dotenv from "dotenv"

dotenv.config()

const required = ["DATABASE_URL", "JWT_SECRET"]

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`)
  }
}

export const env = {
  port: Number(process.env.PORT || 8080),
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5177",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  tables: {
    expenses: process.env.EXPENSES_TABLE || "expenses",
    approvalRules: process.env.APPROVAL_RULES_TABLE || "approval_rules",
    companies: process.env.COMPANIES_TABLE || "companies",
    users: process.env.USERS_TABLE || "users",
  },
}
