import { useMemo, useState } from "react"
import {
  LuClipboardList,
  LuLogOut,
  LuMoon,
  LuScrollText,
  LuSun,
  LuUserCog,
  LuUserRound,
  LuView,
} from "react-icons/lu"

function AdminDashboard({
  user,
  company,
  users,
  expenses,
  approvalRules,
  formatMoney,
  onRoleChange,
  onRuleChange,
  onOverrideStatus,
  onLogout,
}) {
  const [activeSection, setActiveSection] = useState("overview")
  const [theme, setTheme] = useState("light")

  const stats = useMemo(() => {
    const approved = expenses.filter((item) => item.status === "approved")
    const rejected = expenses.filter((item) => item.status === "rejected")

    return {
      totalUsers: users.length,
      totalExpenses: expenses.length,
      approvedAmount: approved.reduce((sum, item) => sum + item.amountUsd, 0),
      rejectedCount: rejected.length,
    }
  }, [users, expenses])

  const navItems = [
    { id: "overview", label: "Overview", icon: LuView },
    { id: "users", label: "Manage Users", icon: LuUserCog },
    { id: "rules", label: "Approval Rules", icon: LuClipboardList },
    { id: "expenses", label: "All Expenses", icon: LuScrollText },
  ]

  return (
    <div className={`admin-shell theme-${theme}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">RM</span>
          <div>
            <p className="admin-brand-name">ReimburseX</p>
            <p className="admin-brand-meta">Admin Console</p>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="admin-nav-icon" aria-hidden="true"><item.icon /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-theme-toggle">
          <span>Theme</span>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            aria-label="Toggle theme"
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-toggle-label">
              {theme === "light" ? <LuSun aria-hidden="true" /> : <LuMoon aria-hidden="true" />}
              {theme === "light" ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-content-container">
          <header className="admin-topbar">
            <div className="admin-topbar-title">
              <h1 className="text-primary">Admin Dashboard</h1>
              <p className="text-muted">{company.name}</p>
            </div>
            <div className="admin-user-actions">
              <span className="admin-username text-secondary"><LuUserRound aria-hidden="true" /> {user.name}</span>
              <button type="button" className="admin-logout-btn" onClick={onLogout}>
                <LuLogOut aria-hidden="true" /> Logout
              </button>
            </div>
          </header>

          <div className="admin-main-scroll">
            <section className="admin-stats-grid">
              <article className="admin-stat-card">
                <p className="admin-stat-label text-secondary">Total Users</p>
                <h3 className="admin-stat-value text-primary">{stats.totalUsers}</h3>
              </article>
              <article className="admin-stat-card">
                <p className="admin-stat-label text-secondary">Total Expenses</p>
                <h3 className="admin-stat-value text-primary">{stats.totalExpenses}</h3>
              </article>
              <article className="admin-stat-card">
                <p className="admin-stat-label text-secondary">Approved Amount</p>
                <h3 className="admin-stat-value text-primary">{formatMoney(stats.approvedAmount)}</h3>
              </article>
              <article className="admin-stat-card">
                <p className="admin-stat-label text-secondary">Rejected</p>
                <h3 className="admin-stat-value text-primary">{stats.rejectedCount}</h3>
              </article>
            </section>

            <section className="admin-section-tabs" aria-label="Section shortcuts">
              {navItems.map((item) => (
                <button
                  key={`${item.id}-tab`}
                  type="button"
                  className={`admin-tab-btn ${activeSection === item.id ? "active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </section>

            {activeSection === "overview" && (
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2 className="text-primary">Overview</h2>
                  <p className="text-muted">{company.name} · Currency {company.currencyCode}</p>
                </div>
                <div className="admin-overview-grid">
                  <article className="admin-overview-card">
                    <h3 className="text-primary">Users</h3>
                    <p className="text-secondary">Manage user accounts and role assignments from one place.</p>
                  </article>
                  <article className="admin-overview-card">
                    <h3 className="text-primary">Approvals</h3>
                    <p className="text-secondary">Control escalation timing and minimum approvals for policy compliance.</p>
                  </article>
                  <article className="admin-overview-card">
                    <h3 className="text-primary">Expenses</h3>
                    <p className="text-secondary">Review all submissions and override status when exceptional action is required.</p>
                  </article>
                </div>
              </section>
            )}

            {activeSection === "users" && (
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2 className="text-primary">Manage Users</h2>
                  <p className="text-muted">Assign roles for admins, managers, and employees.</p>
                </div>
                <div className="admin-table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((person) => (
                        <tr key={person.id}>
                          <td>{person.name}</td>
                          <td>{person.email}</td>
                          <td>
                            <select value={person.role} onChange={(event) => onRoleChange(person.id, event.target.value)}>
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="employee">Employee</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection === "rules" && (
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2 className="text-primary">Approval Rules</h2>
                  <p className="text-muted">Configure review flow and escalation behavior.</p>
                </div>
                <div className="admin-rules-grid">
                  <label>
                    Auto escalate after (days)
                    <input
                      type="number"
                      min="1"
                      value={approvalRules.escalateAfterDays}
                      onChange={(event) => onRuleChange("escalateAfterDays", Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Minimum approvals
                    <input
                      type="number"
                      min="1"
                      value={approvalRules.minApprovals}
                      onChange={(event) => onRuleChange("minApprovals", Number(event.target.value))}
                    />
                  </label>
                </div>
              </section>
            )}

            {activeSection === "expenses" && (
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2 className="text-primary">All Expenses</h2>
                  <p className="text-muted">Approve, reject, or apply override actions.</p>
                </div>
                <div className="admin-table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Manager Review</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.employeeName}</td>
                          <td>{expense.category}</td>
                          <td className="text-muted">{expense.description}</td>
                          <td>
                            {expense.managerDecision ? (
                              <span className={`chip ${expense.managerDecision}`}>{expense.managerDecision}</span>
                            ) : (
                              <span className="text-muted">Not reviewed</span>
                            )}
                          </td>
                          <td>{formatMoney(expense.amountUsd)}</td>
                          <td>
                            <span className={`chip ${expense.status}`}>{expense.status}</span>
                          </td>
                          <td className="admin-actions-cell">
                            <button type="button" className="admin-action-btn approve" onClick={() => onOverrideStatus(expense.id, "approved")}>
                              Approve
                            </button>
                            <button type="button" className="admin-action-btn reject" onClick={() => onOverrideStatus(expense.id, "rejected")}>
                              Reject
                            </button>
                            <button type="button" className="admin-action-btn override" onClick={() => onOverrideStatus(expense.id, "escalated")}>
                              Override
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
