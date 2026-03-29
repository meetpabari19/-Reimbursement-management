import { useState } from "react"
import CompanyRegistrationCard from "./CompanyRegistrationCard"
import LoginCard from "./LoginCard"

function AuthGateway({ countries, countriesLoading, onLogin, onSignup }) {
  const [mode, setMode] = useState("signup")

  return (
    <div className="auth-shell">
      <section className="auth-intro">
        <p className="auth-kicker">Expense Reimbursement Platform</p>
        <h1>ReimburseX</h1>
        <p className="auth-copy">
          Create your company account, pick your country, and we will apply the correct currency symbol
          across all dashboard amounts.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
        </div>
      </section>

      <section className="auth-card-wrap">
        {mode === "signup" ? (
          <CompanyRegistrationCard
            countries={countries}
            countriesLoading={countriesLoading}
            onSignup={onSignup}
            onSwitchToLogin={() => setMode("login")}
          />
        ) : (
          <LoginCard onLogin={onLogin} onSwitchToSignup={() => setMode("signup")} />
        )}
      </section>
    </div>
  )
}

export default AuthGateway
