import React from "react"
import { Pressable } from "react-native"
import { Tabs, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../theme"

type IconName = React.ComponentProps<typeof Ionicons>["name"]

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  addExpenseScreen: ["arrow-up-circle-outline", "arrow-up-circle"],
  addIncomeScreen: ["arrow-down-circle-outline", "arrow-down-circle"],
  plannedPurchasesScreen: ["cart-outline", "cart"],
  statsScreen: ["stats-chart-outline", "stats-chart"],
}

function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName
  label: string
  onPress: () => void
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Ionicons
        name={icon}
        size={24}
        color={colors.headerText}
      />
    </Pressable>
  )
}

export default function TabsLayout() {
  const router = useRouter()
  const { colors } = useTheme()

  const settingsButton = () => (
    <HeaderButton
      icon="settings-outline"
      label="Settings"
      onPress={() => router.push("/settingsScreen")}
    />
  )

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.headerBackground },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        headerRight: settingsButton,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarIcon: ({ focused, color, size }) => {
          const [outline, filled] = TAB_ICONS[route.name] ?? [
            "ellipse-outline",
            "ellipse",
          ]
          return (
            <Ionicons
              name={focused ? filled : outline}
              size={size}
              color={color as string}
            />
          )
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", headerTitle: "Budget Tracker" }}
      />
      <Tabs.Screen
        name="addExpenseScreen"
        options={{ title: "Expenses" }}
      />
      <Tabs.Screen
        name="addIncomeScreen"
        options={{ title: "Income" }}
      />
      <Tabs.Screen
        name="plannedPurchasesScreen"
        options={{
          title: "Planned",
          headerTitle: "Planned Purchases",
          headerRight: () => (
            <HeaderButton
              icon="add"
              label="Add planned purchase"
              onPress={() => router.push("/addPurchaseScreen")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="statsScreen"
        options={{ title: "Stats", headerTitle: "Statistics" }}
      />
    </Tabs>
  )
}
