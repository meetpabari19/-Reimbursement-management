const COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=name,currencies"
const RATES_URL = "https://api.exchangerate-api.com/v4/latest"

export async function fetchCountriesWithCurrencies() {
  const response = await fetch(COUNTRIES_URL)
  if (!response.ok) {
    throw new Error("Unable to fetch countries")
  }

  const payload = await response.json()

  return payload
    .map((item) => {
      const currencies = item.currencies ? Object.entries(item.currencies) : []
      const [code, details] = currencies[0] || []

      if (!item?.name?.common || !code) {
        return null
      }

      return {
        country: item.name.common,
        currencyCode: code,
        currencySymbol: details?.symbol || code,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.country.localeCompare(b.country))
}

export async function fetchCurrencyRates(baseCurrency = "USD") {
  const response = await fetch(`${RATES_URL}/${baseCurrency}`)
  if (!response.ok) {
    throw new Error("Unable to fetch currency rates")
  }

  const payload = await response.json()
  return payload?.rates || {}
}

export function parseUsdAmount(rawValue) {
  if (typeof rawValue === "number") {
    return rawValue
  }

  const cleaned = String(rawValue).replace(/[^\d.-]/g, "")
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatAmount(amountUsd, currencyCode, currencySymbol, rates) {
  const rate = rates?.[currencyCode] || 1
  const converted = amountUsd * rate

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(converted)
  } catch {
    return `${currencySymbol} ${converted.toFixed(2)}`
  }
}
