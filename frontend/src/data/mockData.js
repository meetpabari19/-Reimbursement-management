export const initialCompany = {
  created: true,
  name: "ReimburseX Labs",
  country: "India",
  currencyCode: "INR",
  currencySymbol: "Rs",
}

export const initialUsers = [
  {
    id: "USR-001",
    name: "Nisha Admin",
    email: "admin@reimbursex.com",
    password: "admin123",
    role: "admin",
    department: "admin",
  },
  {
    id: "USR-002",
    name: "Rohit Manager",
    email: "manager@reimbursex.com",
    password: "manager123",
    role: "manager",
    department: "manager",
  },
  {
    id: "USR-003",
    name: "Anu Employee",
    email: "employee@reimbursex.com",
    password: "employee123",
    role: "employee",
    department: "employee",
  },
]

export const initialExpenses = [
  {
    id: "EXP-001",
    employeeId: "USR-003",
    employeeName: "Anu Employee",
    managerId: "USR-002",
    category: "Travel",
    description: "Client site taxi",
    amountUsd: 45,
    status: "pending",
    submittedAt: "2026-03-28",
  },
  {
    id: "EXP-002",
    employeeId: "USR-003",
    employeeName: "Anu Employee",
    managerId: "USR-002",
    category: "Food",
    description: "Team lunch",
    amountUsd: 22,
    status: "approved",
    submittedAt: "2026-03-27",
  },
  {
    id: "EXP-003",
    employeeId: "USR-003",
    employeeName: "Anu Employee",
    managerId: "USR-002",
    category: "Misc",
    description: "Stationery",
    amountUsd: 12,
    status: "rejected",
    submittedAt: "2026-03-25",
  },
]

export const initialApprovalRules = {
  escalateAfterDays: 3,
  minApprovals: 1,
}
