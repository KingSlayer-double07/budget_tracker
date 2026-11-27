import React from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"
import { Category, UNCATEGORIZED } from "../services/database"
import { Button } from "./ui"
import { useModalStyles } from "./ConfirmationModal"
import { makeStyles } from "../theme"

interface CategoryChipsProps {
  categories: Category[]
  selectedId: number | null
  onSelect: (categoryId: number | null) => void
  // Single scrolling row (for forms) or wrapped onto several lines
  layout?: "row" | "wrap"
}

// Tappable category chips, with Uncategorized as the "no category" choice
export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  layout = "row",
}: CategoryChipsProps) {
  const styles = useStyles()
  const options: { id: number | null; name: string }[] = [
    ...categories,
    { id: null, name: UNCATEGORIZED },
  ]

  const chips = options.map((option) => {
    const selected = option.id === selectedId
    return (
      <Pressable
        key={option.id ?? "none"}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.chipSelected,
          pressed && styles.chipPressed,
        ]}
        onPress={() => onSelect(option.id)}
        accessibilityRole="button"
        accessibilityState={{ selected }}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {option.name}
        </Text>
      </Pressable>
    )
  })

  if (layout === "wrap") {
    return <View style={styles.wrap}>{chips}</View>
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled">
      {chips}
    </ScrollView>
  )
}

interface CategoryPickerModalProps {
  visible: boolean
  title: string
  categories: Category[]
  selectedId: number | null
  onSelect: (categoryId: number | null) => void
  onCancel: () => void
}

// Modal for changing the category of an existing expense
export function CategoryPickerModal({
  visible,
  title,
  categories,
  selectedId,
  onSelect,
  onCancel,
}: CategoryPickerModalProps) {
  const modalStyles = useModalStyles()
  const styles = useStyles()
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, styles.modalContent]}>
          <Text style={modalStyles.title}>{title}</Text>
          <ScrollView style={styles.modalScroll}>
            <CategoryChips
              categories={categories}
              selectedId={selectedId}
              onSelect={onSelect}
              layout="wrap"
            />
          </ScrollView>
          <View style={[modalStyles.buttons, styles.modalButtons]}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  row: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: font.label,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  modalContent: {
    maxHeight: "75%",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalButtons: {
    marginTop: spacing.lg,
  },
}))
