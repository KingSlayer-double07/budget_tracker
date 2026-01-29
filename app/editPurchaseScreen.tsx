import React, { useState } from "react"
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { useBudget } from "./context/BudgetContext"

export default function EditPurchaseScreen() {
    const [item, setItem] = useState("")
    const [newAmount, setNewAmount] = useState("")
    const router = useRouter()
    const { isLoading, error, editPlannedPurchaseAmount, plannedPurchases, refreshData } = useBudget()

    const handleEditPurchaseAmount = async () => {
        if (!newAmount) {
            Alert.alert("Error", "Please enter a new amount")
            return
        }

        const numericNewAmount = parseFloat(newAmount)
        if (isNaN(numericNewAmount) || numericNewAmount <= 0) {
            Alert.alert("Error", "Please enter a valid amount.")
            return
        }

        try {
            const success = await editPlannedPurchaseAmount(id, amount, numericNewAmount, item)
            if (success) {
                Alert.alert("Success", "Purchase successfully edited!")
            }
            else {
                Alert.alert(
                    "Error",
                    "Failed to edit purchase amount. Please try again."
                )
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred. Please try again")
        }
    }


    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator
                    size="large"
                    color="#ffc107"
                />
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={refreshData}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Edit Planned Purchase</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Item Name</Text>
                <TextInput
                    style={styles.input}
                    value={item}
                    onChangeText={() => {}}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>New Amount (NGN)</Text>
                <TextInput
                    style={styles.input}
                    value={newAmount}
                    onChangeText={setNewAmount}
                    placeholder="Enter new amount"
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                />
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleEditPurchaseAmount}>
                    <Text style={styles.addButtonText}>Add Planned Purchase</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push("/plannedPurchasesScreen")}>
                    <Text style={styles.viewButtonText}>View Purchases</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f4f4f4",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f4f4",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f4f4",
        padding: 20,
    },
    errorText: {
        color: "red",
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: "#007bff",
        padding: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    heading: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffc107",
        marginBottom: 30,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: "#333",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    buttonContainer: {
        marginTop: 20,
        gap: 10,
    },
    addButton: {
        backgroundColor: "#ffc107",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    addButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "bold",
    },
    viewButton: {
        backgroundColor: "#6c757d",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    viewButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
})
