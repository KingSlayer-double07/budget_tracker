// Format an amount in naira, e.g. 12500 -> "₦12,500" and -800.5 -> "-₦800.50"
export const formatNaira = (amount: number): string => {
  const hasKobo = Math.round(Math.abs(amount) * 100) % 100 !== 0
  const formatted = Math.abs(amount).toLocaleString("en-NG", {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return `${amount < 0 ? "-" : ""}₦${formatted}`
}

// Format a stored YYYY-MM-DD date (or older ISO timestamp) for display,
// e.g. "2026-11-26" -> "26 Nov 2026"; parsed as a local calendar date
export const formatDate = (date: string): string => {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return date
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Short amounts for chart axes, e.g. 950 -> "₦950", 12500 -> "₦12.5k",
// 1250000 -> "₦1.25m"
export const formatCompactNaira = (amount: number): string => {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? "-" : ""
  const trim = (value: number) => String(Number(value.toFixed(2)))
  if (abs >= 1_000_000) return `${sign}₦${trim(abs / 1_000_000)}m`
  if (abs >= 1_000) return `${sign}₦${trim(abs / 1_000)}k`
  return `${sign}₦${Math.round(abs)}`
}
