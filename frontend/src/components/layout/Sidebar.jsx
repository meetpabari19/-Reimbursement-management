const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "pending", label: "Pending Approvals" },
  { id: "expenses", label: "All Expenses" },
  { id: "users", label: "User Management" },
  { id: "rules", label: "Approval Rules" },
]

function Sidebar({ activeView, onChangeView }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">$</div>
        <div>
          <p className="brand-name">ReimburseX</p>
          <p className="brand-sub">Admin console</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeView === item.id ? "nav-item active" : "nav-item"}
            onClick={() => onChangeView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
