import React, { useMemo, useState } from "react"
import { LayoutChangeEvent, Pressable, Text, View } from "react-native"
import { Circle, Line, Polyline, Svg, Text as SVGText } from "react-native-svg"
import { Card } from "./ui"
import { formatCompactNaira, makeStyles, useTheme } from "../theme"

export interface Transaction {
  amount: number
  date: string
}

interface SpendingTrendsChartProps {
  transactions: Transaction[]
}

export interface GroupedData {
  name: string
  total: number
}

// Group expenses into weekly, monthly or yearly totals, oldest first
export const groupDataByTimeframe = (
  transactions: Transaction[],
  timeframe: string
): GroupedData[] => {
  // Keyed by a sortable YYYY-MM-W string so periods from different years
  // stay separate and the graph reads oldest to newest
  const dataMap: Record<string, GroupedData> = {}
  transactions.forEach(({ amount, date }: Transaction) => {
    // Stored dates are local YYYY-MM-DD; parse the parts so they aren't
    // treated as UTC midnight
    const [year, month, day] = date.slice(0, 10).split("-").map(Number)
    const shortYear = String(year).slice(2)
    let key: string
    let name: string
    if (timeframe === "weekly") {
      const week = Math.ceil(day / 7)
      key = `${year}-${String(month).padStart(2, "0")}-${week}`
      name = `W${week} ${month}/${shortYear}`
    } else if (timeframe === "monthly") {
      key = `${year}-${String(month).padStart(2, "0")}`
      name = `${month}/${shortYear}`
    } else {
      key = String(year)
      name = key
    }
    if (!dataMap[key]) dataMap[key] = { name, total: 0 }
    dataMap[key].total += amount
  })
  return Object.keys(dataMap)
    .sort()
    .map((key) => dataMap[key])
}

const TIMEFRAMES = [
  { key: "weekly", label: "Weekly", unit: "weeks" },
  { key: "monthly", label: "Monthly", unit: "months" },
  { key: "all-time", label: "Yearly", unit: "years" },
]

// Most recent periods shown, so points and labels stay readable
const MAX_POINTS = 12
const CHART_HEIGHT = 220
const PAD = { top: 12, right: 12, bottom: 28, left: 52 }
const Y_TICKS = 4

function LineChart({ data, width }: { data: GroupedData[]; width: number }) {
  const { colors } = useTheme()
  const plotWidth = width - PAD.left - PAD.right
  const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom

  // Scale from zero so differences between periods aren't exaggerated
  const maxTotal = Math.max(...data.map((d) => d.total), 1)
  const xFor = (index: number) =>
    PAD.left +
    (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth)
  const yFor = (value: number) =>
    PAD.top + plotHeight - (value / maxTotal) * plotHeight

  const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => {
    const value = (maxTotal / Y_TICKS) * i
    return { value, y: yFor(value) }
  })

  // Label every n-th period when they would otherwise overlap
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(plotWidth / 56)))
  const points = data.map((d, i) => `${xFor(i)},${yFor(d.total)}`).join(" ")

  return (
    <Svg
      width={width}
      height={CHART_HEIGHT}>
      {ticks.map((tick, i) => (
        <React.Fragment key={i}>
          <Line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={tick.y}
            y2={tick.y}
            stroke={colors.chartGrid}
            strokeWidth={1}
          />
          <SVGText
            x={PAD.left - 8}
            y={tick.y + 4}
            fontSize={11}
            fill={colors.textSubtle}
            textAnchor="end">
            {formatCompactNaira(tick.value)}
          </SVGText>
        </React.Fragment>
      ))}

      {data.length > 1 && (
        <Polyline
          points={points}
          fill="none"
          stroke={colors.chart}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {data.map((d, i) => (
        <Circle
          key={`point-${i}`}
          cx={xFor(i)}
          cy={yFor(d.total)}
          r={i === data.length - 1 ? 5 : 3.5}
          fill={i === data.length - 1 ? colors.chart : colors.surface}
          stroke={colors.chart}
          strokeWidth={2}
        />
      ))}

      {data.map((d, i) =>
        // Always label the latest period
        (data.length - 1 - i) % labelEvery === 0 ? (
          <SVGText
            key={`label-${i}`}
            x={xFor(i)}
            y={CHART_HEIGHT - 8}
            fontSize={11}
            fill={colors.textMuted}
            textAnchor="middle">
            {d.name}
          </SVGText>
        ) : null
      )}
    </Svg>
  )
}

const TrendGraph: React.FC<SpendingTrendsChartProps> = ({ transactions }) => {
  const [timeframe, setTimeframe] = useState("monthly")
  const [width, setWidth] = useState(0)
  const styles = useStyles()

  const allData = useMemo(
    () => groupDataByTimeframe(transactions, timeframe),
    [transactions, timeframe]
  )
  const data = allData.slice(-MAX_POINTS)
  const unit = TIMEFRAMES.find((t) => t.key === timeframe)?.unit ?? ""

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Spending trend</Text>
      <Text style={styles.subtitle}>
        {allData.length > MAX_POINTS
          ? `Last ${MAX_POINTS} ${unit}`
          : `All recorded ${unit}`}
      </Text>

      <View style={styles.segmented}>
        {TIMEFRAMES.map((option) => {
          const selected = timeframe === option.key
          return (
            <Pressable
              key={option.key}
              onPress={() => setTimeframe(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && styles.segmentSelected]}>
              <Text
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextSelected,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View
        style={styles.chart}
        onLayout={(e: LayoutChangeEvent) =>
          setWidth(Math.floor(e.nativeEvent.layout.width))
        }>
        {data.length === 0 ? (
          <Text style={styles.empty}>No data to display.</Text>
        ) : (
          width > 0 && (
            <LineChart
              data={data}
              width={width}
            />
          )
        )}
      </View>
    </Card>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  card: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: font.heading,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: font.label,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    fontSize: font.label,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentTextSelected: {
    color: colors.text,
  },
  chart: {
    height: CHART_HEIGHT,
    justifyContent: "center",
  },
  empty: {
    textAlign: "center",
    color: colors.textSubtle,
  },
}))

export default TrendGraph
