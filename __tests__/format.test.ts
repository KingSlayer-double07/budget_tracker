import { formatNaira } from "../theme/format"

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
