import React, { createContext, useContext, useState } from 'react';
import { AuthenticationService } from '../services/AuthenticationService';

interface AuthContextType {
  isAuthenticated: boolean;
  authError: string | null;
  showPasscodeModal: boolean;
  isNewPasscode: boolean;
  handleAuthentication: () => Promise<void>;
  handlePasscodeSubmit: (passcode: string) => Promise<void>;
  setShowPasscodeModal: (visible: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [isNewPasscode, setIsNewPasscode] = useState(false);
  const authService = AuthenticationService.getInstance();

  const handlePasscodeSubmit = async (passcode: string) => {
    try {
      const success = await authService.authenticateWithPasscode(passcode);
      if (success) {
        setShowPasscodeModal(false);
        setIsAuthenticated(true);
      } else {
        setAuthError('Incorrect passcode. Please try again.');
      }
    } catch (error) {
      console.error('Error during passcode authentication:', error);
      setAuthError('Authentication failed. Please try again.');
    }
  };

  const handleAuthentication = async () => {
    try {
      console.log("Authenticating....");
      const authenticated = await authService.authenticate();
      
      if (authenticated) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        // If biometric authentication failed or isn't available, check for passcode
        const hasPasscode = await authService.hasPasscode();
        setIsNewPasscode(!hasPasscode);
        setShowPasscodeModal(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Authentication failed. Please try again.');
    }
  };

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 