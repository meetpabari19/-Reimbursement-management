import { Router } from "express"
import { asyncHandler } from "../middleware/asyncHandler.js"
import {
  escalateOverdueExpenses,
  getExpenseById,
  getExpenses,
  getOverview,
  getRules,
  getTeamSummary,
  updateBulkExpenseStatus,
  updateExpenseStatus,
} from "../services/managerService.js"

export const managerRouter = Router()

function resolveManagerId(req) {
  if (req.user?.role === "admin") {
    return req.query.managerId || req.body.managerId || null
  }

  return null
}

function resolveCompanyId(req) {
  if (req.user?.role === "admin") {
    return req.query.companyId || req.body.companyId || req.user?.companyId || null
  }

  return req.user?.companyId
}

managerRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const data = await getOverview({
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
    })
    res.json(data)
  }),
)

managerRouter.get(
  "/expenses/:expenseId",
  asyncHandler(async (req, res) => {
    const data = await getExpenseById({
      expenseId: req.params.expenseId,
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
    })
    res.json(data)
  }),
)

managerRouter.get(
  "/expenses",
  asyncHandler(async (req, res) => {
    const data = await getExpenses({
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
      status: req.query.status,
      category: req.query.category,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
    })

    res.json(data)
  }),
)

managerRouter.patch(
  "/expenses/:expenseId/status",
  asyncHandler(async (req, res) => {
    const updated = await updateExpenseStatus({
      expenseId: req.params.expenseId,
      status: req.body.status,
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
    })

    res.json(updated)
  }),
)

managerRouter.post(
  "/expenses/bulk-status",
  asyncHandler(async (req, res) => {
    const updated = await updateBulkExpenseStatus({
      expenseIds: req.body.expenseIds,
      status: req.body.status,
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
    })

    res.json({
      updatedCount: updated.length,
      data: updated,
    })
  }),
)

managerRouter.post(
  "/expenses/escalate-overdue",
  asyncHandler(async (req, res) => {
    const updated = await escalateOverdueExpenses({
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
    })

    res.json({
      updatedCount: updated.length,
      data: updated,
    })
  }),
)

managerRouter.get(
  "/team-summary",
  asyncHandler(async (req, res) => {
    const data = await getTeamSummary({
      managerId: resolveManagerId(req),
      companyId: resolveCompanyId(req),
    })
    res.json(data)
  }),
)

managerRouter.get(
  "/rules",
  asyncHandler(async (req, res) => {
    const data = await getRules({ companyId: resolveCompanyId(req) })
    res.json(data)
  }),
)
