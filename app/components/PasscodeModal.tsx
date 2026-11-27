import React, { useState } from "react"
import { Modal, View, Text, TextInput } from "react-native"
import { Button } from "./ui"
import { useModalStyles } from "./ConfirmationModal"
import { makeStyles, useTheme } from "../../theme"

interface PasscodeModalProps {
  visible: boolean
  isNewPasscode: boolean
  isWrongPasscode?: boolean
  onCancel: () => void
  onSubmit: (passcode: string) => void
  onInputChange?: () => void
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  visible,
  isNewPasscode,
  isWrongPasscode,
  onCancel,
  onSubmit,
  onInputChange,
}) => {
  const [passcode, setPasscode] = useState("")
  const modalStyles = useModalStyles()
  const styles = useStyles()
  const { colors } = useTheme()

  const handleSubmit = async (submittedPasscode?: string) => {
    const passcodeToSubmit = submittedPasscode ?? passcode
    // Ignore incomplete input, e.g. tapping OK after the auto-submit cleared it
    if (!/^\d{4}$/.test(passcodeToSubmit)) return
    onSubmit(passcodeToSubmit)
    setPasscode("")
  }

  // Reset input when the modal visibility changes
  React.useEffect(() => {
    if (visible === false) {
      setPasscode("")
    }
  }, [visible])

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <Text style={[modalStyles.title, styles.centered]}>
            {isNewPasscode ? "Set a Passcode" : "Enter Passcode"}
          </Text>
          <Text style={[styles.subtitle, isWrongPasscode && styles.wrong]}>
            {isWrongPasscode
              ? "That passcode didn't match. Try again."
              : isNewPasscode
                ? "Choose 4 digits to unlock the app"
                : "Enter your 4-digit passcode"}
          </Text>
          <TextInput
            style={[styles.input, isWrongPasscode && styles.inputWrong]}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            value={passcode}
            autoFocus
            onChangeText={(text) => {
              if (onInputChange) onInputChange()
              setPasscode(text)
              if (text.length === 4) {
                handleSubmit(text)
              }
            }}
            placeholder="••••"
            placeholderTextColor={colors.textSubtle}
          />
          <Button
            title="OK"
            onPress={() => handleSubmit()}
          />
        </View>
      </View>
    </Modal>
  )
}

const useStyles = makeStyles(({ colors, spacing, radius, font }) => ({
  centered: {
    textAlign: "center",
  },
  subtitle: {
    fontSize: font.label,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  wrong: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 12,
    color: colors.text,
  },
  inputWrong: {
    borderColor: colors.danger,
  },
}))
