import { groupDataByTimeframe } from "../components/TrendGraph"

const expenses = [
  { amount: 500, date: "2026-11-20" },
  { amount: 200, date: "2026-11-03" },
  { amount: 100, date: "2026-11-05" },
  { amount: 300, date: "2025-11-04" },
  { amount: 50, date: "2026-10-31" },
]

describe("groupDataByTimeframe", () => {
  it("groups weekly totals oldest first, keeping years apart", () => {
    expect(groupDataByTimeframe(expenses, "weekly")).toEqual([
      { name: "W1 11/25", total: 300 },
      { name: "W5 10/26", total: 50 },
      { name: "W1 11/26", total: 300 },
      { name: "W3 11/26", total: 500 },
    ])
  })

  it("groups monthly totals oldest first", () => {
    expect(groupDataByTimeframe(expenses, "monthly")).toEqual([
      { name: "11/25", total: 300 },
      { name: "10/26", total: 50 },
      { name: "11/26", total: 800 },
    ])
  })

  it("groups all-time totals by year", () => {
    expect(groupDataByTimeframe(expenses, "all-time")).toEqual([
      { name: "2025", total: 300 },
      { name: "2026", total: 850 },
    ])
  })

  it("uses the stored calendar date, not UTC, for older ISO timestamps", () => {
    expect(
      groupDataByTimeframe(
        [{ amount: 10, date: "2026-01-01T00:30:00.000Z" }],
        "monthly"
      )
    ).toEqual([{ name: "1/26", total: 10 }])
  })

  it("returns nothing for no transactions", () => {
    expect(groupDataByTimeframe([], "weekly")).toEqual([])
  })
})
