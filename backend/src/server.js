import cors from "cors"
import dns from "node:dns"
import express from "express"
import { env } from "./config/env.js"
import { requireAuth, requireRole } from "./middleware/auth.js"
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js"
import { authRouter } from "./routes/authRoutes.js"
import { expenseRouter } from "./routes/expenseRoutes.js"
import { managerRouter } from "./routes/managerRoutes.js"

dns.setDefaultResultOrder("verbatim")

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      const isConfiguredOrigin = origin === env.allowedOrigin
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

      if (isConfiguredOrigin || isLocalhost) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS blocked for origin: ${origin}`))
    },
  }),
)
app.use(express.json())

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "reimbursex-backend",
    message: "Manager API is running",
  })
})

app.use("/api/auth", authRouter)
app.use("/api/expenses", requireAuth, expenseRouter)
app.use("/api/manager", requireAuth, requireRole("manager", "admin"), managerRouter)

app.use(notFoundHandler)
app.use(errorHandler)

function startServer(preferredPort, attemptsLeft = 5) {
  const server = app.listen(preferredPort, () => {
    const address = server.address()
    const actualPort = typeof address === "object" && address ? address.port : preferredPort
    console.log(`Backend running at http://localhost:${actualPort}`)
  })

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = preferredPort + 1
      console.warn(`Port ${preferredPort} in use, retrying on ${nextPort}...`)
      startServer(nextPort, attemptsLeft - 1)
      return
    }

    if (error.code === "EADDRINUSE" && attemptsLeft <= 0) {
      console.warn("Common local ports are busy, switching to any free port...")
      startServer(0, -1)
      return
    }

    throw error
  })
}

startServer(env.port)
