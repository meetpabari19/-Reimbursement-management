import { useEffect, useMemo, useState } from "react"

const managerTabs = ["Overview", "Approvals", "Team", "Rules"]

function normalizeStatus(status) {
  const raw = String(status || "pending").toLowerCase().trim()
  return raw === "escalate" ? "escalated" : raw
}

function toAmount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function ManagerDashboard({ user, company, expenses, approvalRules, formatMoney, onManagerAction, onLogout }) {
  const [activeTab, setActiveTab] = useState("Overview")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("age")
  const [sortDir, setSortDir] = useState("desc")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })

  const pageSize = 5

  const enrichedExpenses = useMemo(() => {
    return expenses.map((item) => {
      const submitted = new Date(item.submittedAt)
      const ageDays = Math.max(0, Math.floor((Date.now() - submitted.getTime()) / 86400000))
      const normalizedStatus = normalizeStatus(item.status)
      const amountUsd = toAmount(item.amountUsd)
      const needsEscalation = normalizedStatus === "pending" && ageDays >= approvalRules.escalateAfterDays
      return { ...item, status: normalizedStatus, amountUsd, ageDays, needsEscalation }
    })
  }, [expenses, approvalRules.escalateAfterDays])

  const filteredExpenses = useMemo(() => {
    return enrichedExpenses.filter((item) => {
      const matchesSearch =
        search.trim() === "" ||
        item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      const matchesCategory = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [enrichedExpenses, search, statusFilter, categoryFilter])

  const sortedExpenses = useMemo(() => {
    const items = [...filteredExpenses]
    items.sort((a, b) => {
      let left = a[sortBy]
      let right = b[sortBy]

      if (sortBy === "amountUsd" || sortBy === "ageDays") {
        left = Number(left)
        right = Number(right)
      } else {
        left = String(left).toLowerCase()
        right = String(right).toLowerCase()
      }

      if (left < right) {
        return sortDir === "asc" ? -1 : 1
      }
      if (left > right) {
        return sortDir === "asc" ? 1 : -1
      }
      return 0
    })

    return items
  }, [filteredExpenses, sortBy, sortDir])

  const metrics = useMemo(() => {
    const pending = enrichedExpenses.filter((item) => item.status === "pending").length
    const approved = enrichedExpenses.filter((item) => item.status === "approved").length
    const escalated = enrichedExpenses.filter((item) => item.status === "escalated").length
    const needsEscalation = enrichedExpenses.filter((item) => item.needsEscalation).length
    const total = enrichedExpenses
      .filter((item) => item.status !== "rejected")
      .reduce((sum, item) => sum + item.amountUsd, 0)
    return { pending, approved, escalated, needsEscalation, total }
  }, [enrichedExpenses])

  const teamSummary = useMemo(() => {
    const byEmployee = new Map()

    enrichedExpenses.forEach((item) => {
      const current = byEmployee.get(item.employeeName) || {
        employeeName: item.employeeName,
        totalSpend: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        escalated: 0,
      }

      current.totalSpend += item.amountUsd
      if (item.status === "pending") current.pending += 1
      if (item.status === "approved") current.approved += 1
      if (item.status === "rejected") current.rejected += 1
      if (item.status === "escalated") current.escalated += 1

      byEmployee.set(item.employeeName, current)
    })

    return [...byEmployee.values()].sort((a, b) => b.totalSpend - a.totalSpend)
  }, [enrichedExpenses])

  const escalationQueue = useMemo(
    () => enrichedExpenses.filter((item) => item.needsEscalation),
    [enrichedExpenses],
  )

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedExpenses = sortedExpenses.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, categoryFilter, sortBy, sortDir])

  const allVisibleSelected =
    pagedExpenses.length > 0 && pagedExpenses.every((item) => selectedIds.includes(item.id))

  const logActivity = (message) => {
    const entry = {
      id: Date.now() + Math.random(),
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setActivityLog((prev) => [entry, ...prev].slice(0, 8))
  }

  const toggleRow = (expenseId) => {
    setSelectedIds((prev) =>
      prev.includes(expenseId) ? prev.filter((id) => id !== expenseId) : [...prev, expenseId],
    )
  }

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedExpenses.some((item) => item.id === id)))
      return
    }

    setSelectedIds((prev) => {
      const next = new Set(prev)
      pagedExpenses.forEach((item) => next.add(item.id))
      return [...next]
    })
  }

  const applyAction = (ids, status, sourceLabel) => {
    if (ids.length === 0) {
      return
    }

    ids.forEach((id) => onManagerAction(id, status))
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
    logActivity(`${sourceLabel}: ${ids.length} item${ids.length > 1 ? "s" : ""} marked ${status}`)
  }

  const runBulkAction = (status) => {
    applyAction(selectedIds, status, "Bulk action")
  }

  const escalateOverdueNow = () => {
    applyAction(escalationQueue.map((item) => item.id), "escalated", "Auto escalation")
  }

  return (
    <div className="dash-layout employee-dash">
      <header className="dash-header-v2">
        <div className="header-left">
          <p className="portal-label">REIMBURSEX · MANAGER PORTAL</p>
          <div className="greeting-row">
            <h1>👋 Hello, {user.name}</h1>
            <p className="subtext">{user.email} · Today is {todayLabel}</p>
          </div>
        </div>
        <div className="header-right">
          <button type="button" className="primary-btn" onClick={escalateOverdueNow} disabled={metrics.needsEscalation === 0}>
            + Escalate overdue
          </button>
          <button type="button" className="secondary-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <section className="metric-row">
        <article className="metric-card">
          <h3>PENDING APPROVALS</h3>
          <p className="metric-value">{metrics.pending}</p>
          <div className="metric-bar"></div>
        </article>
        <article className="metric-card">
          <h3>APPROVED</h3>
          <p className="metric-value">{metrics.approved}</p>
          <div className="metric-bar"></div>
        </article>
        <article className="metric-card">
          <h3>ESCALATED</h3>
          <p className="metric-value">{metrics.escalated}</p>
          <div className="metric-bar"></div>
        </article>
        <article className="metric-card">
          <h3>OVERDUE</h3>
          <p className="metric-value">{metrics.needsEscalation}</p>
          <div className="metric-bar warn-bar"></div>
        </article>
        <article className="metric-card">
          <h3>TEAM SPEND</h3>
          <p className="metric-value">{formatMoney(metrics.total)}</p>
          <div className="metric-bar"></div>
        </article>
      </section>

      {activeTab === "Overview" ? (
        <>
          <div className="tabs-container">
            {managerTabs.map((tab, idx) => (
              <div key={tab} className="tab-indicator">
                <button
                  type="button"
                  className={activeTab === tab ? "tab-link active" : "tab-link"}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
                {idx === 0 && <span className="count-badge">(Overview)</span>}
                {idx === 1 && <span className="count-badge">({metrics.pending})</span>}
              </div>
            ))}
          </div>
          <section className="panel">
            <div className="panel-head-row">
              <h2>Priority escalation queue</h2>
              <button type="button" className="soft-action" onClick={escalateOverdueNow}>
                Escalate all overdue
              </button>
            </div>
            <ul className="manager-list">
              {escalationQueue.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <strong>{item.employeeName}</strong>
                  <span>{item.description}</span>
                  <em>{item.ageDays} days pending</em>
                </li>
              ))}
              {escalationQueue.length === 0 ? <li className="empty-row">No escalation required right now.</li> : null}
            </ul>
          </section>

          <section className="panel">
            <h2>Recent manager activity</h2>
            <ul className="activity-feed">
              {activityLog.map((entry) => (
                <li key={entry.id}>
                  <span>{entry.message}</span>
                  <em>{entry.timestamp}</em>
                </li>
              ))}
              {activityLog.length === 0 ? <li className="empty-row">No actions yet in this session.</li> : null}
            </ul>
          </section>
        </>
      ) : null}

      {activeTab === "Approvals" ? (
        <>
          <div className="tabs-container">
            {managerTabs.map((tab, idx) => (
              <div key={tab} className="tab-indicator">
                <button
                  type="button"
                  className={activeTab === tab ? "tab-link active" : "tab-link"}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
                {idx === 0 && <span className="count-badge">(Overview)</span>}
                {idx === 1 && <span className="count-badge">({metrics.pending})</span>}
              </div>
            ))}
          </div>

          <div className="filter-row">
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>

            <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All Categories</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="misc">Misc</option>
            </select>

            <input
              type="text"
              className="search-input"
              placeholder="Search employee or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <span className="result-count">{sortedExpenses.length} results</span>
          </div>

          <section className="panel">
            <div className="bulk-actions-row">
              <span className="selection-count">{selectedIds.length} selected</span>
              <div className="bulk-btns">
                <button type="button" className="ok" onClick={() => runBulkAction("approved")} disabled={selectedIds.length === 0}>
                  Approve
                </button>
                <button type="button" className="bad" onClick={() => runBulkAction("rejected")} disabled={selectedIds.length === 0}>
                  Reject
                </button>
                <button type="button" className="soft" onClick={() => runBulkAction("escalated")} disabled={selectedIds.length === 0}>
                  Escalate
                </button>
              </div>
            </div>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                    </th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>USD Equiv.</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(expense.id)}
                          onChange={() => toggleRow(expense.id)}
                        />
                      </td>
                      <td>{expense.employeeName}</td>
                      <td>{new Date(expense.submittedAt).toLocaleDateString()}</td>
                      <td>{expense.category}</td>
                      <td>{expense.description}</td>
                      <td>{formatMoney(expense.amountUsd)}</td>
                      <td>{formatMoney(expense.amountUsd)}</td>
                      <td><span className={`chip ${expense.status}`}>{expense.status}</span></td>
                      <td className="row-actions">
                        <button type="button" className="ok" onClick={() => applyAction([expense.id], "approved", "Single action")}>Approve</button>
                        <button type="button" className="bad" onClick={() => applyAction([expense.id], "rejected", "Single action")}>Reject</button>
                        <button type="button" className="soft" onClick={() => applyAction([expense.id], "escalated", "Single action")}>Escalate</button>
                      </td>
                    </tr>
                  ))}

                  {pagedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-row">
                        No expenses match current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1}>
                Previous
              </button>
              <span>
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </button>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "Team" ? (
        <>
          <div className="tabs-container">
            {managerTabs.map((tab, idx) => (
              <div key={tab} className="tab-indicator">
                <button
                  type="button"
                  className={activeTab === tab ? "tab-link active" : "tab-link"}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
                {idx === 0 && <span className="count-badge">(Overview)</span>}
                {idx === 1 && <span className="count-badge">({metrics.pending})</span>}
              </div>
            ))}
          </div>

          <section className="panel">
            <h2>Team spend and approval summary</h2>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Total spend</th>
                    <th>Pending</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                    <th>Escalated</th>
                  </tr>
                </thead>
                <tbody>
                  {teamSummary.map((person) => (
                    <tr key={person.employeeName}>
                      <td>{person.employeeName}</td>
                      <td>{formatMoney(person.totalSpend)}</td>
                      <td>{person.pending}</td>
                      <td>{person.approved}</td>
                      <td>{person.rejected}</td>
                      <td>{person.escalated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "Rules" ? (
        <>
          <div className="tabs-container">
            {managerTabs.map((tab, idx) => (
              <div key={tab} className="tab-indicator">
                <button
                  type="button"
                  className={activeTab === tab ? "tab-link active" : "tab-link"}
                  onClick={() => setActiveTab(tab)}
                >
                   {tab}
                </button>
                {idx === 0 && <span className="count-badge">(Overview)</span>}
                {idx === 1 && <span className="count-badge">({metrics.pending})</span>}
              </div>
            ))}
          </div>

          <section className="panel">
            <h2>Approval rule guidance</h2>
            <div className="rule-grid">
              <label>
                Current escalation threshold
                <input type="text" value={`${approvalRules.escalateAfterDays} days`} readOnly />
              </label>
              <label>
                Minimum approvals
                <input type="text" value={`${approvalRules.minApprovals}`} readOnly />
              </label>
            </div>
            <ul className="manager-list inline-list">
              <li>
                <strong>Escalation ready now:</strong>
                <span>{escalationQueue.length} request(s)</span>
              </li>
              <li>
                <strong>Manager authority:</strong>
                <span>Approve, reject, escalate requests for your team.</span>
              </li>
              <li>
                <strong>Company currency:</strong>
                <span>{company.currencyCode}</span>
              </li>
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}

export default ManagerDashboard
