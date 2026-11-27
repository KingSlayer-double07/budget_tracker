// Shared design tokens for the app, in light and dark variants. Screens read
// the active theme with useTheme() or build their styles with makeStyles().
import { useMemo } from "react"
import {
  ImageStyle,
  StyleSheet,
  TextStyle,
  useColorScheme,
  ViewStyle,
} from "react-native"

export interface ThemeColors {
  background: string
  surface: string
  surfaceMuted: string
  border: string
  text: string
  textMuted: string
  textSubtle: string
  // Brand green: buttons, selected states, headers
  primary: string
  onPrimary: string
  primarySoft: string
  onPrimarySoft: string
  income: string
  expense: string
  // Text-coloured red, and the solid red behind white text
  danger: string
  dangerSolid: string
  dangerSoft: string
  warning: string
  warningSoft: string
  overlay: string
  headerBackground: string
  headerText: string
  tabActive: string
  tabInactive: string
  // Chart line and points
  chart: string
  chartGrid: string
}

export interface Theme {
  dark: boolean
  colors: ThemeColors
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number }
  radius: { sm: number; md: number; lg: number; pill: number }
  font: {
    title: number
    heading: number
    body: number
    label: number
    caption: number
  }
}

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
const radius = { sm: 8, md: 12, lg: 16, pill: 999 }
const font = { title: 24, heading: 17, body: 16, label: 14, caption: 12 }

const BRAND_GREEN = "#043927"

export const lightTheme: Theme = {
  dark: false,
  spacing,
  radius,
  font,
  colors: {
    background: "#F3F5F4",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF2F0",
    border: "#DFE5E2",
    text: "#15211C",
    textMuted: "#56635D",
    textSubtle: "#84918B",
    primary: BRAND_GREEN,
    onPrimary: "#FFFFFF",
    primarySoft: "#DCEBE3",
    onPrimarySoft: BRAND_GREEN,
    income: "#1B7A4B",
    expense: "#B3261E",
    danger: "#B3261E",
    dangerSolid: "#B3261E",
    dangerSoft: "#F9DEDC",
    warning: "#8A5A00",
    warningSoft: "#FFF1C2",
    overlay: "rgba(0, 0, 0, 0.45)",
    headerBackground: BRAND_GREEN,
    headerText: "#FFFFFF",
    tabActive: BRAND_GREEN,
    tabInactive: "#84918B",
    chart: "#0B6B47",
    chartGrid: "#E4E9E6",
  },
}

export const darkTheme: Theme = {
  dark: true,
  spacing,
  radius,
  font,
  colors: {
    background: "#0D1311",
    surface: "#161E1B",
    surfaceMuted: "#1E2824",
    border: "#2A3531",
    text: "#E6ECE9",
    textMuted: "#A6B3AD",
    textSubtle: "#77857F",
    // The deep green is too dark to read on a dark background
    primary: "#5CC290",
    onPrimary: "#04241A",
    primarySoft: "#1C3A2D",
    onPrimarySoft: "#A3E2C2",
    income: "#6FD3A0",
    expense: "#FF8A80",
    danger: "#FF8A80",
    dangerSolid: "#C8423A",
    dangerSoft: "#3A1D1B",
    warning: "#F2C14E",
    warningSoft: "#3A2F12",
    overlay: "rgba(0, 0, 0, 0.6)",
    headerBackground: "#121A17",
    headerText: "#E6ECE9",
    tabActive: "#5CC290",
    tabInactive: "#77857F",
    chart: "#5CC290",
    chartGrid: "#26302C",
  },
}

// The theme matching the phone's light/dark setting
export const useTheme = (): Theme =>
  useColorScheme() === "dark" ? darkTheme : lightTheme

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

// Build a styles hook from the theme: const useStyles = makeStyles((t) => ({...}))
// (the "| NamedStyles<T>" gives style literals like "row" their proper types)
export const makeStyles =
  <T extends NamedStyles<T>>(factory: (theme: Theme) => T | NamedStyles<T>) =>
  (): T => {
    const theme = useTheme()
    return useMemo(
      () => StyleSheet.create(factory(theme) as T & NamedStyles<T>),
      [theme]
    )
  }

export { formatNaira, formatDate, formatCompactNaira } from "./format"
