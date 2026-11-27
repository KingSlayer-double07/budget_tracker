import React, { useState } from "react"
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useBudget } from "../context/BudgetContext"
import { Category } from "../database"
import { Button, Card } from "./ui"
import { makeStyles, useTheme } from "../../theme"

// Settings section for adding, renaming and removing expense categories
export default function CategoryManager() {
  const { categories, addNewCategory, renameExistingCategory, removeCategory } =
    useBudget()
  const [newName, setNewName] = useState("")
  const [editing, setEditing] = useState<Category | null>(null)
  const [editName, setEditName] = useState("")
  const styles = useStyles()
  const { colors } = useTheme()

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
    <Card style={styles.card}>
      <Text style={styles.hint}>Hold a category to rename or remove it.</Text>

      {categories.map((category) =>
        editing?.id === category.id ? (
          <View
            key={category.id}
            style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              maxLength={40}
              onSubmitEditing={handleRename}
              placeholderTextColor={colors.textSubtle}
            />
            <Button
              title="Save"
              onPress={handleRename}
              style={styles.smallButton}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setEditing(null)}
              style={styles.smallButton}
            />
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
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="New category"
          placeholderTextColor={colors.textSubtle}
          maxLength={40}
          onSubmitEditing={handleAdd}
        />
        <Button
          title="Add"
          onPress={handleAdd}
          disabled={!newName.trim()}
          style={styles.smallButton}
        />
      </View>
    </Card>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  card: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  hint: {
    fontSize: font.caption + 1,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowText: {
    fontSize: font.body,
    color: colors.text,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.body,
    color: colors.text,
  },
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
}))
