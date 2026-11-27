import { formatCompactNaira, formatDate, formatNaira } from "../theme/format"

describe("formatNaira", () => {
  it("formats whole amounts with thousands separators", () => {
    expect(formatNaira(0)).toBe("₦0")
    expect(formatNaira(12500)).toBe("₦12,500")
    expect(formatNaira(1250000)).toBe("₦1,250,000")
  })

  it("shows kobo only when there are any", () => {
    expect(formatNaira(800.5)).toBe("₦800.50")
    expect(formatNaira(99.999)).toBe("₦100")
  })

  it("puts the minus sign before the naira sign", () => {
    expect(formatNaira(-800.5)).toBe("-₦800.50")
    expect(formatNaira(-45000)).toBe("-₦45,000")
  })
})

describe("formatDate", () => {
  it("shows stored dates as day, short month and year", () => {
    expect(formatDate("2026-11-26")).toBe("26 Nov 2026")
    expect(formatDate("2027-02-01")).toBe("1 Feb 2027")
  })

  it("uses the calendar date of older ISO timestamps", () => {
    expect(formatDate("2026-01-01T00:30:00.000Z")).toBe("1 Jan 2026")
  })

  it("returns unrecognised values unchanged", () => {
    expect(formatDate("")).toBe("")
  })
})

describe("formatCompactNaira", () => {
  it("shortens thousands and millions", () => {
    expect(formatCompactNaira(950)).toBe("₦950")
    expect(formatCompactNaira(12500)).toBe("₦12.5k")
    expect(formatCompactNaira(40000)).toBe("₦40k")
    expect(formatCompactNaira(1250000)).toBe("₦1.25m")
    expect(formatCompactNaira(0)).toBe("₦0")
  })
})
