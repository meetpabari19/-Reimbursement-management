function ViewTabs({ views, activeView, onViewChange }) {
  return (
    <nav className="view-tabs" aria-label="View selector">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          className={activeView === view.id ? "tab active" : "tab"}
          onClick={() => onViewChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </nav>
  )
}

export default ViewTabs
