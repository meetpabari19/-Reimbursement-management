function AuthPage({
  mode,
  form,
  countries,
  loadingCountries,
  onModeChange,
  onFieldChange,
  onSubmit,
  message,
  companyReady,
}) {
  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">Expense Management</p>
        <h1>Role based access</h1>
        <p>
          One portal for three departments. Admin creates company and rules, manager approves team
          expenses, employee submits and tracks requests.
        </p>
        <ul>
          <li>Admin: users, roles, approval rules, full expense control.</li>
          <li>Manager: approve, reject, escalate with company currency.</li>
          <li>Employee: submit expenses and check status.</li>
        </ul>
      </section>

      <section className="auth-card">
        <div className="auth-switch">
          <button
            type="button"
            className={mode === "login" ? "switch-btn active" : "switch-btn"}
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "switch-btn active" : "switch-btn"}
            onClick={() => onModeChange("signup")}
          >
            Signup
          </button>
        </div>

        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <p className="hint">
          {mode === "login"
            ? "Use your department role account to continue."
            : "Admin signup auto-creates company profile and default currency."}
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          {mode === "signup" ? (
            <label>
              Name
              <input
                type="text"
                placeholder="Arihant"
                value={form.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => onFieldChange("password", event.target.value)}
            />
          </label>

          {mode === "signup" ? (
            <>
              <label>
                Department
                <select
                  value={form.role}
                  onChange={(event) => onFieldChange("role", event.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </label>

              <label>
                Country
                <select
                  value={form.country}
                  onChange={(event) => onFieldChange("country", event.target.value)}
                  disabled={loadingCountries}
                >
                  <option value="">{loadingCountries ? "Loading countries..." : "Select country"}</option>
                  {countries.map((country) => (
                    <option key={`${country.country}-${country.currencyCode}`} value={country.country}>
                      {country.country} ({country.currencyCode})
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <button type="submit" className="primary-btn span-2">
            {mode === "login" ? "Login" : "Signup"}
          </button>
        </form>

        {message ? <p className="message">{message}</p> : null}
        {companyReady ? <p className="status">Company profile is active.</p> : <p className="status warn">Company not created yet. Admin signup required.</p>}
      </section>
    </div>
  )
}

export default AuthPage
