import React from "react"
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Category, UNCATEGORIZED } from "../database"

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
  const options: { id: number | null; name: string }[] = [
    ...categories,
    { id: null, name: UNCATEGORIZED },
  ]

  const chips = options.map((option) => {
    const selected = option.id === selectedId
    return (
      <TouchableOpacity
        key={option.id ?? "none"}
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={() => onSelect(option.id)}
        accessibilityRole="button"
        accessibilityState={{ selected }}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {option.name}
        </Text>
      </TouchableOpacity>
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalScroll}>
            <CategoryChips
              categories={categories}
              selectedId={selectedId}
              onSelect={onSelect}
              layout="wrap"
            />
          </ScrollView>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  chipSelected: {
    backgroundColor: "#043927",
    borderColor: "#043927",
  },
  chipText: {
    fontSize: 14,
    color: "#333",
  },
  chipTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "85%",
    maxWidth: 420,
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#043927",
  },
  modalScroll: {
    flexGrow: 0,
  },
  cancelButton: {
    marginTop: 20,
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: "#ccc",
  },
  cancelText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
})
