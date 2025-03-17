import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

// Create Auth Context
export const AuthContext = createContext(null);

// User session storage key
const USER_SESSION_KEY = 'user_session';

// Custom hook to use the Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Try to get session from storage
        const storedSession = await AsyncStorage.getItem(USER_SESSION_KEY);
        
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          
          // Verify the session with Supabase
          const { data, error } = await supabase.auth.getUser(sessionData.access_token);
          
          if (data?.user && !error) {
            setUser(data.user);
            setSession(sessionData);
          } else {
            // Session is invalid, clear it
            await AsyncStorage.removeItem(USER_SESSION_KEY);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    if (!authInitialized) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          // Save session to storage
          await saveSession(session);
          setUser(session.user);
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          // Clear session from storage
          await AsyncStorage.removeItem(USER_SESSION_KEY);
          setUser(null);
          setSession(null);
        }
      }
    );

    // Clean up subscription
    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, [authInitialized]);

  // Save session to AsyncStorage
  const saveSession = async (session) => {
    try {
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      await saveSession(data.session);
      setUser(data.user);
      setSession(data.session);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, metadata) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      if (data.session) {
        await saveSession(data.session);
        setUser(data.user);
        setSession(data.session);
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      setUser(null);
      setSession(null);
      router.replace('/auth?mode=signin');
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'taskly://reset-password',
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: userData,
      });

      if (error) throw error;
      
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...userData,
        },
      });
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Provide auth context value
  const value = {
    user,
    session,
    isLoading,
    authInitialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};