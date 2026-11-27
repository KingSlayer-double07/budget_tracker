import { monthKey, shiftMonth } from "../components/MonthSwitcher"

describe("month helpers", () => {
  it("steps to the first day of neighbouring months across years", () => {
    const lastDayOfDecember = new Date(2026, 11, 31, 18)
    expect(shiftMonth(lastDayOfDecember, 1)).toEqual(new Date(2027, 0, 1))
    expect(shiftMonth(lastDayOfDecember, -1)).toEqual(new Date(2026, 10, 1))
    expect(shiftMonth(new Date(2026, 0, 15), -1)).toEqual(new Date(2025, 11, 1))
  })

  it("gives sortable YYYY-MM keys", () => {
    expect(monthKey(new Date(2026, 8, 30))).toBe("2026-09")
    expect(monthKey(new Date(2026, 10, 1)) > monthKey(new Date(2026, 8, 1))).toBe(
      true
    )
  })
})
