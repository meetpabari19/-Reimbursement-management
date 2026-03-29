import { Router } from "express"
import { asyncHandler } from "../middleware/asyncHandler.js"
import { login, signup } from "../services/authService.js"

export const authRouter = Router()

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const data = await signup({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      companyId: req.body.companyId,
      managerId: req.body.managerId,
    })

    res.status(201).json(data)
  }),
)

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = await login({
      email: req.body.email,
      password: req.body.password,
    })

    res.json(data)
  }),
)
