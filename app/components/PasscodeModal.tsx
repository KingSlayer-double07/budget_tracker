import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface PasscodeModalProps {
  visible: boolean;
  isNewPasscode: boolean;
  onCancel: () => void;
  onSubmit: (passcode: string) => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  visible,
  isNewPasscode,
  onCancel,
  onSubmit,
}) => {
  const [passcode, setPasscode] = useState('');
  const [isWrong, setIsWrong] = useState(false);

  const handleSubmit = () => {
    if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
      return;
    }
    onSubmit(passcode);
    setPasscode('');
    setIsWrong(true);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {isNewPasscode ? 'Set Passcode' : 'Enter Passcode'}
          </Text>
            {isWrong && (
              <Text style = {styles.wrong}>
                You entered a wrong passcode. Give it another try
                </Text>
              )
            }
          <TextInput
            style={styles.input}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            value={passcode}
            onChangeText={(text) => {
              setPasscode(text);
              if (text.length === 4) {
                handleSubmit();
              }
            }}
            placeholder="Enter 4-digit passcode"
          />
          <View style={styles.buttonContainer}>
            {/*<TouchableOpacity
              style={styles.button}
              onPress={onCancel}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>*/}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  title: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    padding: 10,
    marginLeft: 10,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  wrong: {
    color: '#007AFF',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5
  }
}); 