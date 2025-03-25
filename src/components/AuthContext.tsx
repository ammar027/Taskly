import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';

// Create Auth Context
export const AuthContext = createContext(null);

// User session storage key
const USER_SESSION_KEY = 'user_session';
const OFFLINE_ACTIONS_KEY = 'offline_auth_actions';
const SESSION_EXPIRY_KEY = 'session_expiry_time';

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
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSessionValidation, setPendingSessionValidation] = useState(false);
  const [offlineActions, setOfflineActions] = useState([]);

  // Network connectivity monitoring
  useEffect(() => {
    // Initial network check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected;
      
      setIsOnline(nowOnline);
      
      // If coming back online and we have a pending session validation
      if (wasOffline && nowOnline) {
        if (pendingSessionValidation && session) {
          console.log('Network reconnected - validating session');
          validateSessionWithServer(session);
        }
        
        // Process any offline actions
        processPendingOfflineActions();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline, pendingSessionValidation, session, offlineActions]);

  // Load offline actions from storage
  useEffect(() => {
    const loadOfflineActions = async () => {
      try {
        const storedActions = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
        if (storedActions) {
          setOfflineActions(JSON.parse(storedActions));
        }
      } catch (error) {
        console.error('Error loading offline actions:', error);
      }
    };
    
    loadOfflineActions();
  }, []);

  // Save offline actions to storage
  const saveOfflineActions = async (actions) => {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
      setOfflineActions(actions);
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  };

  // Process pending offline actions when online
  const processPendingOfflineActions = async () => {
    if (!isOnline || offlineActions.length === 0) return;
    
    console.log('Processing pending offline actions:', offlineActions.length);
    
    const newActions = [...offlineActions];
    
    for (let i = 0; i < newActions.length; i++) {
      const action = newActions[i];
      
      try {
        console.log('Processing action:', action.type);
        
        if (action.type === 'update_profile') {
          await supabase.auth.updateUser({
            data: action.data,
          });
        }
        // Add more action types as needed
        
        // Remove this action
        newActions.splice(i, 1);
        i--;
      } catch (error) {
        console.error('Error processing offline action:', error);
      }
    }
    
    // Save the remaining actions
    await saveOfflineActions(newActions);
  };

  // Add an action to be processed when online
  const addOfflineAction = async (action) => {
    const updatedActions = [...offlineActions, action];
    await saveOfflineActions(updatedActions);
  };

  // Check if session should be considered expired
// Check if session should be considered expired
const isSessionExpired = async (sessionData) => {
  try {
    if (!isOnline) {
      // In offline mode, provide a more generous grace period
      const expiryTimeStr = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);
      if (!expiryTimeStr) return false; // If no expiry time, assume not expired
      
      const expiryTime = parseInt(expiryTimeStr);
      const currentTime = new Date().getTime();
      
      // Add a much longer grace period (e.g., 7 days) when offline
      // This allows users to use the app offline for longer periods
      const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      return currentTime > (expiryTime + gracePeriod);
    }
    
    // Original online logic
    const expiryTimeStr = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiryTimeStr) return false;
    
    const expiryTime = parseInt(expiryTimeStr);
    const currentTime = new Date().getTime();
    
    return currentTime > expiryTime;
  } catch (error) {
    console.error('Error checking session expiry:', error);
    return false; // Default to not expired on error
  }
};

  // Update session expiry time
  const updateSessionExpiry = async (sessionData) => {
    try {
      if (!sessionData || !sessionData.expires_at) return;
      
      // Calculate expiry time (subtract 5 minutes for safety buffer)
      const expiryDate = new Date(sessionData.expires_at);
      const expiryTime = expiryDate.getTime() - (5 * 60 * 1000);
      
      // Store expiry time
      await AsyncStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Error updating session expiry:', error);
    }
  };

  // Validate session with server when online
// Validate session with server when online
const validateSessionWithServer = async (sessionData) => {
  if (!isOnline) {
    setPendingSessionValidation(true);
    
    // Check if session is expired based on local time with grace period
    const expired = await isSessionExpired(sessionData);
    if (expired) {
      console.log('Session is expired based on local time check with grace period');
      return { valid: false, offlineMode: true, expired: true };
    }
    
    console.log('Offline mode: Using cached session');
    
    // Always set the user from the cached session when offline
    setUser(sessionData.user);
    setSession(sessionData);
    
    return { valid: true, offlineMode: true };
  }

  try {
    console.log('Validating session with server...');
    const { data, error } = await supabase.auth.getUser(sessionData.access_token);
    
    if (data?.user && !error) {
      // Valid session - update expiry time
      setPendingSessionValidation(false);
      setUser(data.user);
      setSession(sessionData);
      updateSessionExpiry(sessionData);
      return { valid: true };
    } else if (error) {
      console.log('Session validation failed:', error);
      
      // Check if it's a network error
      if (isNetworkError(error)) {
        console.log('Network error detected - switching to offline mode');
        // Set network state to offline
        setIsOnline(false);
        // Mark session for validation when back online
        setPendingSessionValidation(true);
        // Use cached session data
        setUser(sessionData.user);
        setSession(sessionData);
        return { valid: true, offlineMode: true, error };
      } else {
        // It's an actual auth error, clear the session
        await AsyncStorage.removeItem(USER_SESSION_KEY);
        await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
        setUser(null);
        setSession(null);
        setPendingSessionValidation(false);
        return { valid: false, error };
      }
    }
  } catch (error) {
    console.error('Error validating session:', error);
    // Handle any unexpected errors - treat as network error
    console.log('Unexpected error - switching to offline mode');
    // Set network state to offline
    setIsOnline(false);
    // Mark session for validation when back online
    setPendingSessionValidation(true);
    // Use cached session data
    setUser(sessionData.user);
    setSession(sessionData);
    return { valid: true, offlineMode: true, error };
  }
};

  // Check if an error is network-related
  const isNetworkError = (error) => {
    if (!error) return false;
    
    return (
      error.status === 408 || // Request Timeout
      error.status === 429 || // Too Many Requests
      error.status === 502 || // Bad Gateway
      error.status === 503 || // Service Unavailable
      error.status === 504 || // Gateway Timeout
      error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('connect') ||
      error.message?.toLowerCase().includes('timeout') ||
      error.name === 'AuthRetryableFetchError'
    );
  };

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Try to get session from storage
        const storedSession = await AsyncStorage.getItem(USER_SESSION_KEY);
        
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          
          // Always set the user from stored session initially
          setUser(sessionData.user);
          setSession(sessionData);
          
          // Check if session is expired based on local time when offline
          if (!isOnline) {
            const expired = await isSessionExpired(sessionData);
            if (expired) {
              console.log('Session is expired based on local time check with grace period');
              // Even if expired locally, still keep the session active in offline mode
              // but mark it for validation when online
              setPendingSessionValidation(true);
            } else {
              console.log('Device offline - trusting stored session');
              setPendingSessionValidation(true);
            }
          } else {
            // If online, validate with server
            validateSessionWithServer(sessionData);
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
  }, [isOnline]);

  // Set up auth state change listener
  useEffect(() => {
    if (!authInitialized) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession) {
          // Save user object along with session
          const sessionWithUser = {
            ...newSession,
            user: newSession.user
          };
          
          // Save session to storage
          await saveSession(sessionWithUser);
          setUser(newSession.user);
          setSession(newSession);
          setPendingSessionValidation(false);
          
          // Update expiry time
          updateSessionExpiry(newSession);
        } else if (event === 'SIGNED_OUT') {
          // Clear session from storage
          await AsyncStorage.removeItem(USER_SESSION_KEY);
          await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
          setUser(null);
          setSession(null);
          setPendingSessionValidation(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          // Update session in storage with new tokens
          const sessionWithUser = {
            ...newSession,
            user: user || newSession.user // Preserve existing user data if available
          };
          
          await saveSession(sessionWithUser);
          setSession(newSession);
          setPendingSessionValidation(false);
          
          // Update expiry time
          updateSessionExpiry(newSession);
        }
      }
    );

    // Clean up subscription
    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, [authInitialized, user]);

  // Save session to AsyncStorage
  const saveSession = async (session) => {
    try {
      // Make sure we store the user object too
      const sessionWithUser = session.user ? session : {
        ...session,
        user: user  // Include current user object
      };
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionWithUser));
      
      // Update session expiry time
      updateSessionExpiry(sessionWithUser);
      
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    setIsLoading(true);
    
    if (!isOnline) {
      setIsLoading(false);
      return { data: null, error: { message: 'Cannot sign in while offline' } };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Save user with session
      const sessionWithUser = {
        ...data.session,
        user: data.user
      };
      
      await saveSession(sessionWithUser);
      setUser(data.user);
      setSession(data.session);
      setPendingSessionValidation(false);
      return { data, error: null };
    } catch (error) {
      // Handle network errors more gracefully
      if (isNetworkError(error)) {
        return { 
          data: null, 
          error: { 
            message: 'Network error. Please check your internet connection and try again.'
          }
        };
      }
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, metadata) => {
    setIsLoading(true);
    
    if (!isOnline) {
      setIsLoading(false);
      return { data: null, error: { message: 'Cannot sign up while offline' } };
    }
    
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
        // Save user with session
        const sessionWithUser = {
          ...data.session,
          user: data.user
        };
        
        await saveSession(sessionWithUser);
        setUser(data.user);
        setSession(data.session);
        setPendingSessionValidation(false);
      }
      
      return { data, error: null };
    } catch (error) {
      // Handle network errors more gracefully
      if (isNetworkError(error)) {
        return { 
          data: null, 
          error: { 
            message: 'Network error. Please check your internet connection and try again.'
          }
        };
      }
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async (options = { forceSignOut: false }) => {
    setIsLoading(true);
    try {
      // Allow offline sign out by always clearing local session
      if (options.forceSignOut || isOnline) {
        await AsyncStorage.removeItem(USER_SESSION_KEY);
        await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
        setUser(null);
        setSession(null);
        setPendingSessionValidation(false);
      } else {
        // When offline and not forced, just report that we can't sign out
        setIsLoading(false);
        return { error: { message: 'Cannot sign out while offline. Use forceSignOut: true to sign out anyway.' } };
      }
      
      // Only try to contact server if online
      if (isOnline) {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out on server:', error);
      }
      
      router.replace('/auth?mode=signin');
      return { error: null };
    } catch (error) {
      console.error('Error during sign out:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    setIsLoading(true);
    
    if (!isOnline) {
      setIsLoading(false);
      return { error: { message: 'Cannot reset password while offline' } };
    }
    
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
    
    if (!isOnline) {
      // Store update locally and mark for sync when back online
      try {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...userData,
          },
        };
        
        setUser(updatedUser);
        
        // Update the session with the new user data
        if (session) {
          const updatedSession = {
            ...session,
            user: updatedUser
          };
          await saveSession(updatedSession);
        }
        
        // Add to offline actions queue
        await addOfflineAction({
          type: 'update_profile',
          data: userData,
          timestamp: new Date().getTime()
        });
        
        setIsLoading(false);
        return { data: { user: updatedUser }, error: null, offlineMode: true };
      } catch (error) {
        setIsLoading(false);
        return { data: null, error, offlineMode: true };
      }
    }
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: userData,
      });

      if (error) throw error;
      
      // Update local user
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...userData,
        },
      };
      
      setUser(updatedUser);
      
      // Update session with new user data
      if (session) {
        const updatedSession = {
          ...session,
          user: updatedUser
        };
        await saveSession(updatedSession);
      }
      
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
    isOnline,
    pendingSessionValidation,
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