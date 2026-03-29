import { useMemo, useState } from "react"

function CompanyRegistrationCard({ countries, countriesLoading, onSignup, onSwitchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
  })

  const selectedCountry = useMemo(
    () => countries.find((item) => item.country === form.country),
    [countries, form.country],
  )

  const onChangeField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const submitSignup = (event) => {
    event.preventDefault()

    if (!form.email || !form.password || !selectedCountry) {
      return
    }

    onSignup({
      name: form.name || "User",
      email: form.email,
      country: selectedCountry.country,
      currencyCode: selectedCountry.currencyCode,
      currencySymbol: selectedCountry.currencySymbol,
    })
  }

  return (
    <article className="panel auth-card">
      <div className="panel-header">
        <h2>Create account</h2>
        <p>Signup and map your workspace currency from country.</p>
      </div>

      <form className="grid-form" onSubmit={submitSignup}>
        <label>
          Name
          <input type="text" placeholder="Arihant" value={form.name} onChange={onChangeField("name")} />
        </label>
        <label>
          Email
          <input type="email" placeholder="name@company.com" value={form.email} onChange={onChangeField("email")} />
        </label>
        <label>
          Password
          <input
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={onChangeField("password")}
          />
        </label>
        <label>
          Confirm Password
          <input
            type="password"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={onChangeField("confirmPassword")}
          />
        </label>
        <label className="span-2">
          Country
          <select value={form.country} onChange={onChangeField("country")} disabled={countriesLoading}>
            <option value="" disabled>
              {countriesLoading ? "Loading countries..." : "Select country"}
            </option>
            {countries.map((country) => (
              <option key={`${country.country}-${country.currencyCode}`} value={country.country}>
                {country.country} ({country.currencyCode} {country.currencySymbol})
              </option>
            ))}
          </select>
        </label>

        {selectedCountry ? (
          <p className="currency-preview span-2">
            Currency selected: {selectedCountry.currencyCode} ({selectedCountry.currencySymbol})
          </p>
        ) : null}

        <button type="submit" className="btn primary span-2">
          Signup
        </button>

        <button type="button" className="btn span-2" onClick={onSwitchToLogin}>
          Already have an account? Login
        </button>
      </form>
    </article>
  )
}

export default CompanyRegistrationCard
