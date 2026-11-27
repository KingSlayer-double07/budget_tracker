import React, { useEffect, useState } from "react"
import { Modal, View, Text } from "react-native"
import { Button, Field } from "./ui"
import { useModalStyles } from "./ConfirmationModal"

interface InputModalProps {
  visible: boolean
  title: string
  message: string
  amount?: number
  onConfirm: (newAmount: number) => void
  onCancel: () => void
}

export default function InputModal({
  visible,
  title,
  message,
  amount,
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [newAmount, setNewAmount] = useState("")
  const styles = useModalStyles()

  // The modal stays mounted, so prefill the current amount each time it opens
  useEffect(() => {
    if (visible) {
      setNewAmount(amount != null ? String(amount) : "")
    }
  }, [visible, amount])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Field
            label={message}
            value={newAmount}
            onChangeText={setNewAmount}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
          />
          <View style={styles.buttons}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
            />
            <Button
              title="Save"
              onPress={() => onConfirm(Number(newAmount))}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
