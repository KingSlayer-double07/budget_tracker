import React, { useState } from "react"
import { Platform, Pressable, Text, View } from "react-native"
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { toLocalDateString } from "../services/database"
import { formatDate, makeStyles, useTheme } from "../theme"

interface DateFieldProps {
  label: string
  // YYYY-MM-DD, or null when no date is set
  value: string | null
  onChange: (value: string | null) => void
  minimumDate?: Date
  maximumDate?: Date
  // Can be left empty: shows the placeholder and a clear button
  optional?: boolean
  placeholder?: string
  hint?: string
}

// Parse YYYY-MM-DD as a local date
const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// A tappable field that opens the system date picker
export default function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  optional,
  placeholder = "Choose a date",
  hint,
}: DateFieldProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  // iOS shows the picker inline instead of as a dialog
  const [showInline, setShowInline] = useState(false)

  const current = value ? parseDate(value) : minimumDate ?? new Date()

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowInline(false)
    if (event.type === "set" && selected) {
      onChange(toLocalDateString(selected))
    }
  }

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: handleChange,
      })
    } else {
      setShowInline((shown) => !shown)
    }
  }

  const isToday = value === toLocalDateString(new Date())
  const text = value
    ? `${isToday ? "Today, " : ""}${formatDate(value)}`
    : placeholder

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${text}`}
          style={({ pressed }) => [styles.input, pressed && styles.pressed]}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={colors.textMuted}
          />
          <Text style={[styles.value, !value && styles.placeholder]}>
            {text}
          </Text>
        </Pressable>
        {optional && value && (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            style={styles.clear}>
            <Ionicons
              name="close-circle"
              size={22}
              color={colors.textSubtle}
            />
          </Pressable>
        )}
      </View>
      {showInline && (
        <DateTimePicker
          value={current}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: font.label,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  value: {
    fontSize: font.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSubtle,
  },
  clear: {
    padding: 2,
  },
  hint: {
    fontSize: font.caption,
    color: colors.textSubtle,
    marginTop: 4,
  },
}))
