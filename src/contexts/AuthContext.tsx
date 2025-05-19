import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Set up auth state listener
  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setError(new Error('Firebase auth is not initialized'));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setCurrentUser(user);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Enable persistence
  useEffect(() => {
    const enablePersistence = async () => {
      if (!auth) {
        console.error('Firebase auth is not initialized');
        return;
      }

      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('Auth persistence enabled');
      } catch (error) {
        console.error('Error enabling auth persistence:', error);
        setError(error as Error);
      }
    };

    enablePersistence();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase auth is not initialized');
    }

    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      setError(error as Error);
      throw error;
    }
  };

  const register = async (email: string, password: string, username: string) => {
    if (!auth) {
      throw new Error('Firebase auth is not initialized');
    }

    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User registered:', userCredential.user);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error as Error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase auth is not initialized');
    }

    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error as Error);
      throw error;
    }
  };

  const value = {
    currentUser,
    user: currentUser,
    loading,
    error,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 