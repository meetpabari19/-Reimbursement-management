function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      {children}
    </section>
  )
}

export default Panel
