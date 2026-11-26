import React, { useState } from "react"
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useBudget } from "../context/BudgetContext"
import { Category } from "../database"

// Settings section for adding, renaming and removing expense categories
export default function CategoryManager() {
  const { categories, addNewCategory, renameExistingCategory, removeCategory } =
    useBudget()
  const [newName, setNewName] = useState("")
  const [editing, setEditing] = useState<Category | null>(null)
  const [editName, setEditName] = useState("")

  const handleAdd = async () => {
    if (await addNewCategory(newName)) {
      setNewName("")
    }
  }

  const startRename = (category: Category) => {
    setEditing(category)
    setEditName(category.name)
  }

  const handleRename = async () => {
    if (!editing) return
    if (editName.trim() === editing.name) {
      setEditing(null)
      return
    }
    if (await renameExistingCategory(editing.id, editName)) {
      setEditing(null)
    }
  }

  const confirmRemove = (category: Category) => {
    Alert.alert(
      "Remove Category",
      `Remove "${category.name}"? Its expenses will become Uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!(await removeCategory(category.id))) {
              Alert.alert("Error", "Failed to remove the category")
            }
          },
        },
      ]
    )
  }

  const showOptions = (category: Category) => {
    Alert.alert(category.name, undefined, [
      { text: "Rename", onPress: () => startRename(category) },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => confirmRemove(category),
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Expense Categories</Text>
      <Text style={styles.hint}>Long-press a category to rename or remove it.</Text>

      {categories.map((category) =>
        editing?.id === category.id ? (
          <View
            key={category.id}
            style={styles.editRow}>
            <TextInput
              style={[styles.input, styles.editInput]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              maxLength={40}
              onSubmitEditing={handleRename}
            />
            <TouchableOpacity
              style={styles.smallButton}
              onPress={handleRename}>
              <Text style={styles.smallButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.cancelButton]}
              onPress={() => setEditing(null)}>
              <Text style={styles.smallButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Pressable
            key={category.id}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onLongPress={() => showOptions(category)}
            delayLongPress={400}>
            <Text style={styles.rowText}>{category.name}</Text>
          </Pressable>
        )
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.editInput]}
          value={newName}
          onChangeText={setNewName}
          placeholder="New category"
          maxLength={40}
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.smallButton, !newName.trim() && styles.disabled]}
          onPress={handleAdd}
          disabled={!newName.trim()}>
          <Text style={styles.smallButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  hint: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 10,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  rowPressed: {
    backgroundColor: "#f0f4f2",
  },
  rowText: {
    fontSize: 16,
    color: "#333",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  editInput: {
    flex: 1,
  },
  smallButton: {
    backgroundColor: "#043927",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  disabled: {
    opacity: 0.5,
  },
  smallButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
})
