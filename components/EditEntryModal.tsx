import React, { useEffect, useState } from "react"
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native"
import { Category, EditScope } from "../services/database"
import { CategoryChips } from "./CategoryPicker"
import DateField from "./DateField"
import { Button, Field } from "./ui"
import { useModalStyles } from "./ConfirmationModal"
import { makeStyles } from "../theme"

export interface EntryValues {
  name: string
  amount: number
  categoryId: number | null
  // YYYY-MM-DD; only the entry itself has one, not its future months
  date?: string
}

interface EditEntryModalProps {
  visible: boolean
  title: string
  nameLabel: string
  // The entry's own values
  initial: EntryValues
  // For a repeating entry, what later months will record (often the same as
  // `initial`); shows the choice between editing the entry or future months
  future?: EntryValues
  // Shows the category chips (expenses only)
  categories?: Category[]
  onSave: (values: EntryValues, scope: EditScope) => void
  onCancel: () => void
}

const SCOPES: { key: EditScope; label: string; note: string }[] = [
  {
    key: "future",
    label: "Future months",
    note: "Changes what later months record. This entry and months already recorded keep their values, so past totals stay accurate.",
  },
  {
    key: "entry",
    label: "This entry too",
    note: "Changes this entry, and later months follow it. Use this to fix a mistake. Months already recorded aren't changed.",
  },
]

// Edit the name, amount and (for expenses) category of a recorded entry
export default function EditEntryModal({
  visible,
  title,
  nameLabel,
  initial,
  future,
  categories,
  onSave,
  onCancel,
}: EditEntryModalProps) {
  const [scope, setScope] = useState<EditScope>("entry")
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const modalStyles = useModalStyles()
  const styles = useStyles()

  // Show the values the chosen scope currently has
  const fill = (values: EntryValues) => {
    setName(values.name)
    setAmount(String(values.amount))
    setCategoryId(values.categoryId)
    setDate(values.date ?? null)
  }

  // The modal stays mounted, so reset the form each time it opens. Repeating
  // entries start on future months, the usual reason to edit one.
  useEffect(() => {
    if (visible) {
      const startScope: EditScope = future ? "future" : "entry"
      setScope(startScope)
      fill(startScope === "future" && future ? future : initial)
    }
    // Only when it opens, so typing isn't overwritten by a refresh
  }, [visible])

  const changeScope = (next: EditScope) => {
    if (next === scope) return
    setScope(next)
    fill(next === "future" && future ? future : initial)
  }

  const handleSave = () => {
    const numAmount = parseFloat(amount)
    if (!name.trim()) {
      Alert.alert("Error", `${nameLabel} can't be empty`)
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount")
      return
    }
    onSave(
      {
        name: name.trim(),
        amount: numAmount,
        categoryId,
        date: scope === "entry" ? date ?? undefined : undefined,
      },
      scope
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, styles.content]}>
          <Text style={modalStyles.title}>{title}</Text>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled">
            {future && (
              <>
                <View style={styles.segmented}>
                  {SCOPES.map((option) => {
                    const selected = scope === option.key
                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => changeScope(option.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[
                          styles.segment,
                          selected && styles.segmentSelected,
                        ]}>
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
                <Text style={styles.note}>
                  {SCOPES.find((option) => option.key === scope)?.note}
                </Text>
              </>
            )}
            <Field
              label={nameLabel}
              value={name}
              onChangeText={setName}
            />
            <Field
              label="Amount (₦)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              selectTextOnFocus
            />
            {scope === "entry" && date && (
              <DateField
                label="Date"
                value={date}
                onChange={(value) => value && setDate(value)}
                maximumDate={new Date()}
              />
            )}
            {categories && (
              <>
                <Text style={styles.label}>Category</Text>
                <CategoryChips
                  categories={categories}
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                  layout="wrap"
                />
              </>
            )}
          </ScrollView>
          <View style={[modalStyles.buttons, styles.buttons]}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
            />
            <Button
              title="Save"
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  content: {
    maxHeight: "85%",
  },
  scroll: {
    flexGrow: 0,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.sm,
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
  note: {
    fontSize: font.caption,
    lineHeight: 18,
    color: colors.textSubtle,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: font.label,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: 6,
  },
  buttons: {
    marginTop: spacing.lg,
  },
}))
