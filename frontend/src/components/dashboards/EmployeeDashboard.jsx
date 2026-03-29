import { useState } from "react"

function EmployeeDashboard({ user, company, expenses, formatMoney, onSubmitExpense, onLogout }) {
  const [form, setForm] = useState({ description: "", category: "Food", amountUsd: "" })

  const handleSubmit = (event) => {
    event.preventDefault()
    const amount = Number(form.amountUsd)
    if (!form.description || !Number.isFinite(amount) || amount <= 0) {
      return
    }

    onSubmitExpense({
      description: form.description,
      category: form.category,
      amountUsd: amount,
    })

    setForm({ description: "", category: "Food", amountUsd: "" })
  }

  return (
    <div className="dash-layout employee-dash">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Employee Dashboard</p>
          <h1>{user.name}</h1>
          <p className="meta">Submit expenses and track approvals in {company.currencyCode}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section className="panel">
        <h2>Submit expense</h2>
        <form className="rule-grid" onSubmit={handleSubmit}>
          <label>
            Description
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Misc">Misc</option>
            </select>
          </label>
          <label>
            Amount (USD base)
            <input
              type="number"
              min="1"
              value={form.amountUsd}
              onChange={(event) => setForm((prev) => ({ ...prev, amountUsd: event.target.value }))}
            />
          </label>
          <button type="submit" className="primary-btn span-2">Submit</button>
        </form>
      </section>

      <section className="panel">
        <h2>My expenses</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td className={`chip ${expense.status}`}>{expense.status}</td>
                  <td>{formatMoney(expense.amountUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default EmployeeDashboard
