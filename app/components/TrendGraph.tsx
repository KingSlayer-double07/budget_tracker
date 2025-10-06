import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { Polyline, Line, Circle, Svg, Text as SVGText } from "react-native-svg"

export interface Transaction {
  amount: number
  date: string
}

interface SpendingTrendsChartProps {
  transactions: Transaction[]
}

interface GroupedData {
  name: string
  total: number
}

const TrendGraph: React.FC<SpendingTrendsChartProps> = ({ transactions }) => {
  const [timeframe, setTimeframe] = useState("weekly")
  const [chartData, setChartData] = useState<GroupedData[]>([])

  useEffect(() => {
    const groupedData = groupDataByTimeframe(transactions, timeframe)
    setChartData(transactions.length ? groupedData : [])
  }, [transactions, timeframe])

  const groupDataByTimeframe = (
    transactions: Transaction[],
    timeframe: string
  ): GroupedData[] => {
    const dataMap: Record<string, number> = {}
    transactions.forEach(({ amount, date }: Transaction) => {
      const transactionDate = new Date(date)
      let key: string
      if (timeframe === "weekly") {
        key = `Week ${Math.ceil(transactionDate.getDate() / 7)} - ${
          transactionDate.getMonth() + 1
        }`
      } else if (timeframe === "monthly") {
        key = `${
          transactionDate.getMonth() + 1
        }/${transactionDate.getFullYear()}`
      } else {
        key = transactionDate.getFullYear().toString()
      }
      dataMap[key] = (dataMap[key] || 0) + amount
    })
    return Object.entries(dataMap).map(([name, total]) => ({ name, total }))
  }

  const LineGraph: React.FC<{ chartData: GroupedData[] }> = ({ chartData }) => {
    // Add margins for labels
    const marginLeft = 16 // space for Y-axis labels
    const marginBottom = 12 // space for X-axis labels
    const graphWidth = 100
    const graphHeight = 100
    const svgWidth = graphWidth + marginLeft
    const svgHeight = graphHeight + marginBottom
    const yTicks = 5

    if (chartData.length === 0) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            height: 300,
          }}>
          <Text style={{ color: "#888" }}>No data to display.</Text>
        </View>
      )
    }

    if (chartData.length === 1) {
      return (
        <View style={{ alignItems: "center", height: 300, justifyContent: "center" }}>
          <Svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* Y-axis label */}
            <SVGText
              x={marginLeft - 2}
              y={graphHeight / 2 + 3}
              fontSize="4"
              fill="#888"
              textAnchor="end">
              {chartData[0].total}
            </SVGText>
            <Circle
              cx={marginLeft + graphWidth / 2}
              cy={graphHeight / 2}
              r={4}
              fill="#4f46e5"
            />
          </Svg>
          <Text style={{ textAlign: "center", marginTop: 8 }}>
            {chartData[0].name}
          </Text>
        </View>
      )
    }

    const maxTotal = Math.max(...chartData.map((d) => d.total)) || 1
    const minTotal = Math.min(...chartData.map((d) => d.total)) || 0
    // When calculating x and y, offset by marginLeft and marginBottom
    const points = chartData
      .map((data, index) => {
        const x = marginLeft + (index / (chartData.length - 1)) * graphWidth
        const y = ((data.total - minTotal) / (maxTotal - minTotal || 1))
        const yPos = graphHeight - y * graphHeight
        return `${x},${yPos}`
      })
      .join(" ")

    const yAxisTicks = Array.from({ length: yTicks + 1 }, (_, i) => {
      const value = maxTotal - ((maxTotal - minTotal) / yTicks) * i
      const y = (graphHeight / yTicks) * i
      return { value: Math.round(value), y }
    })

    return (
      <View style={{ width: "100%", height: 300 }}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Y-axis lines and labels */}
          {yAxisTicks.map((tick, i) => (
            <React.Fragment key={i}>
              <Line
                x1={marginLeft}
                y1={tick.y}
                x2={svgWidth}
                y2={tick.y}
                stroke="#eee"
                strokeWidth="0.5"
              />
              <SVGText
                x={marginLeft - 2}
                y={tick.y + 3}
                fontSize="4"
                fill="#888"
                textAnchor="end">
                {tick.value}
              </SVGText>
            </React.Fragment>
          ))}
          {/* X-axis line */}
          <Line
            x1={marginLeft}
            y1={graphHeight}
            x2={svgWidth}
            y2={graphHeight}
            stroke="#aaa"
            strokeWidth="0.5"
          />
          {/* Polyline and points */}
          <Polyline
            points={points}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2"
          />
          {chartData.map((data: GroupedData, index: number) => {
            const x = marginLeft + (index / (chartData.length - 1)) * graphWidth
            const y = ((data.total - minTotal) / (maxTotal - minTotal || 1))
            const yPos = graphHeight - y * graphHeight
            return (
              <Circle
                key={index}
                cx={x}
                cy={yPos}
                r={3}
                fill="#4f46e5"
              />
            )
          })}
        </Svg>
        {/* X-axis labels */}
        <View
          style={{
            flexDirection: "row",
            position: "absolute",
            bottom: 0,
            left: marginLeft,
            width: "100%",
          }}>
          {chartData.map((data, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                left: `${(index / (chartData.length - 1)) * 100}%`,
                width: 40,
                marginLeft: -20,
                alignItems: "center",
              }}>
              <Text
                style={{ fontSize: 10, color: "#555" }}
                numberOfLines={1}
                ellipsizeMode="tail">
                {data.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
      }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 16,
          color: "#333",
        }}>
        Spending Trends
      </Text>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        {["weekly", "monthly", "all-time"].map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setTimeframe(option)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              marginRight: 8,
              borderRadius: 8,
              backgroundColor: timeframe === option ? "#4f46e5" : "#f0f0f0",
            }}>
            <Text
              style={{
                color: timeframe === option ? "#ffffff" : "#555",
                fontWeight: "600",
              }}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ width: "100%", height: 300 }}>
        <LineGraph chartData={chartData} />
      </View>
    </View>
  )
}

export default TrendGraph
