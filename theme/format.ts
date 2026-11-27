// Format an amount in naira, e.g. 12500 -> "₦12,500" and -800.5 -> "-₦800.50"
export const formatNaira = (amount: number): string => {
  const hasKobo = Math.round(Math.abs(amount) * 100) % 100 !== 0
  const formatted = Math.abs(amount).toLocaleString("en-NG", {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return `${amount < 0 ? "-" : ""}₦${formatted}`
}
