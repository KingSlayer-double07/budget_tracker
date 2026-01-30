import React, { useState } from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native"

interface InputModalProps {
  visible: boolean
  title: string
  message: string
  amount: string
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
    const [newAmount, setNewAmount] = useState(String(amount))
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <TextInput
           style = {styles.input}
           value = {newAmount === "undefined" && "" || newAmount}
           onChangeText={setNewAmount}
           keyboardType="numeric"
           />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => {
                onConfirm(Number(newAmount))
              }}>
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#043927",
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  confirmButton: {
    backgroundColor: "#043927",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
})
