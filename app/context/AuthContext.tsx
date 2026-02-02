import React, { createContext, useContext, useState } from "react"
import { AuthenticationService } from "../services/AuthenticationService"
import { SecureStorageService } from "../services/SecureStorageService"

interface AuthContextType {
  isAuthenticated: boolean
  authError: string | null
  showPasscodeModal: boolean
  isNewPasscode: boolean
  handleAuthentication: () => Promise<void>
  handlePasscodeSubmit: (passcode: string) => Promise<boolean>
  setShowPasscodeModal: (visible: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPasscodeModal, setShowPasscodeModal] = useState(false)
  const [isNewPasscode, setIsNewPasscode] = useState(false)
  const [authEnabled, setAuthEnabled] = useState(false)
  const authService = AuthenticationService.getInstance()

  const handlePasscodeSubmit = async (passcode: string): Promise<boolean> => {
    try {
      const success = await authService.authenticateWithPasscode(passcode)
      if (success) {
        setShowPasscodeModal(false)
        setIsAuthenticated(true)
        return true
      } else {
        setAuthError("Incorrect passcode. Please try again.")
        return false
      }
    } catch (error) {
      console.error("Error during passcode authentication:", error)
      setAuthError("Authentication failed. Please try again.")
      return false
    }
  }

  const handleAuthentication = async () => {
    try {
      // Check if Authentication is enabled
      const secureStorage = SecureStorageService.getInstance
      const authEnabled = await authService.isBiometricEnabled()
      setAuthEnabled(authEnabled)
      if (!authEnabled) {
        setIsAuthenticated(true)
        setShowPasscodeModal(false)
        return
      }

      const authenticated = await authService.authenticate()

      if (authenticated) {
        setIsAuthenticated(true)
        setAuthError(null)
      } else {
        // If biometric authentication failed or isn't available, check for passcode
        const hasPasscode = await authService.hasPasscode()
        setIsNewPasscode(!hasPasscode)
        setShowPasscodeModal(true)
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setAuthError("Authentication failed. Please try again.")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authError,
        showPasscodeModal,
        isNewPasscode,
        handleAuthentication,
        handlePasscodeSubmit,
        setShowPasscodeModal,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
