// Small themed building blocks shared by the screens
import React from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native"
import { makeStyles, useTheme } from "../theme"

export function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const styles = useStyles()
  return <View style={[styles.card, style]}>{children}</View>
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}>
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>
        {title}
      </Text>
    </Pressable>
  )
}

// Labelled text input
export function Field({
  label,
  hint,
  style,
  ...inputProps
}: TextInputProps & { label?: string; hint?: string }) {
  const styles = useStyles()
  const theme = useTheme()
  return (
    <View style={styles.field}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        placeholderTextColor={theme.colors.textSubtle}
        style={[styles.input, style]}
        {...inputProps}
      />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  )
}

export function SectionTitle({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  const styles = useStyles()
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  )
}

export function LoadingState() {
  const styles = useStyles()
  const theme = useTheme()
  return (
    <View style={styles.centered}>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
      />
    </View>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const styles = useStyles()
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message}</Text>
      <Button
        title="Retry"
        onPress={onRetry}
      />
    </View>
  )
}

export function EmptyState({ message }: { message: string }) {
  const styles = useStyles()
  return <Text style={styles.empty}>{message}</Text>
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft },
  button_danger: { backgroundColor: colors.dangerSolid },
  button_ghost: { backgroundColor: "transparent", paddingVertical: 8 },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: font.body, fontWeight: "600" },
  buttonText_primary: { color: colors.onPrimary },
  buttonText_secondary: { color: colors.onPrimarySoft },
  buttonText_danger: { color: "#FFFFFF" },
  buttonText_ghost: { color: colors.primary },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: font.label,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: font.caption,
    color: colors.textSubtle,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.text,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: font.heading,
    fontWeight: "700",
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.body,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: colors.textSubtle,
    fontSize: font.body,
    paddingVertical: spacing.xl,
  },
}))
