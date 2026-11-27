import React from "react"
import { Modal, View, Text } from "react-native"
import { Button } from "./ui"
import { makeStyles } from "../theme"

interface ConfirmationModalProps {
  visible: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const styles = useModalStyles()
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
            />
            <Button
              title="Confirm"
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Shared by the app's small dialogs
export const useModalStyles = makeStyles(
  ({ colors, spacing, radius, font }) => ({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xl,
      width: "100%",
      maxWidth: 420,
    },
    title: {
      fontSize: font.heading + 1,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: font.body,
      lineHeight: 22,
      color: colors.textMuted,
      marginBottom: spacing.xl,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
  })
)
