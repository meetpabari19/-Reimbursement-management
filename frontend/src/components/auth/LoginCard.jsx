import { useState } from "react"

function LoginCard({ onLogin, onSwitchToSignup }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const submitLogin = (event) => {
    event.preventDefault()
    onLogin({ email: email || "demo@company.com", password })
  }

  return (
    <article className="panel auth-card">
      <div className="panel-header">
        <h2>Welcome back</h2>
        <p>Sign in and continue to dashboard.</p>
      </div>

      <form className="grid-form compact" onSubmit={submitLogin}>
        <label>
          Email
          <input
            type="email"
            placeholder="mail@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" className="btn primary">
          Login
        </button>

        <button type="button" className="btn" onClick={onSwitchToSignup}>
          Create new account
        </button>
      </form>
    </article>
  )
}

export default LoginCard
