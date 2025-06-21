import { useState, useEffect, createContext, useContext } from 'react';
import { tokenManager } from '../lib/supabase';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        if (tokenManager.isTokenExpired()) {
          tokenManager.removeToken();
          setUser(null);
        } else {
          const userData = tokenManager.getUserFromToken();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        tokenManager.removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (token: string, userData: User) => {
    tokenManager.setToken(token);
    setUser(userData);
  };

  const logout = () => {
    tokenManager.removeToken();
    setUser(null);
  };

  return {
    user,
    isLoading,
    login,
    logout,
  };
}

export { AuthContext };