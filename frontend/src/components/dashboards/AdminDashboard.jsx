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
  return (
    <div className="dash-layout admin-dash">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Welcome, {user.name}</h1>
          <p className="meta">{company.name} • default currency {company.currencyCode}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section className="metric-row">
        <article className="metric-card">
          <h3>Total users</h3>
          <p>{users.length}</p>
        </article>
        <article className="metric-card">
          <h3>Total expenses</h3>
          <p>{expenses.length}</p>
        </article>
        <article className="metric-card">
          <h3>Approved amount</h3>
          <p>{formatMoney(expenses.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amountUsd, 0))}</p>
        </article>
      </section>

      <section className="panel">
        <h2>Manage users and roles</h2>
        <div className="table-shell">
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

      <section className="panel">
        <h2>Approval rules</h2>
        <div className="rule-grid">
          <label>
            Auto escalate after
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

      <section className="panel">
        <h2>All expenses with override</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Category</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Override</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.employeeName}</td>
                  <td>{expense.category}</td>
                  <td className={`chip ${expense.status}`}>{expense.status}</td>
                  <td>{formatMoney(expense.amountUsd)}</td>
                  <td className="row-actions">
                    <button type="button" className="ok" onClick={() => onOverrideStatus(expense.id, "approved")}>Approve</button>
                    <button type="button" className="bad" onClick={() => onOverrideStatus(expense.id, "rejected")}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
