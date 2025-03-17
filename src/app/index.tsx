import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import * as NavigationBar from "expo-navigation-bar";
import { useTheme, ThemeMode } from '@/components/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';

const WELCOME_SHOWN_KEY = 'welcome_screen_shown';
const USER_SESSION_KEY = 'user_session';

export default function Index() {
  const { isDarkMode, theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Effect for navigation bar theming
  useEffect(() => {
    const updateNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff");
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
      } catch (error) {
        console.error("Error setting navigation bar color:", error);
      }
    };

    updateNavBar();
  }, [isDarkMode]); 

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme === ThemeMode.SYSTEM) {
      const subscription = NavigationBar.addVisibilityListener(() => {
        const updateNavBarOnVisibilityChange = async () => {
          try {
            await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff");
            await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
          } catch (error) {
            console.error("Error updating navigation bar on visibility change:", error);
          }
        };
        
        updateNavBarOnVisibilityChange();
      });
      
      return () => subscription.remove();
    }
  }, [theme, isDarkMode]);

  // Check if user is authenticated and welcome screen has been shown
  useEffect(() => {
    const checkAppState = async () => {
      try {
        const [welcomeStatus, sessionData] = await Promise.all([
          AsyncStorage.getItem(WELCOME_SHOWN_KEY),
          AsyncStorage.getItem(USER_SESSION_KEY)
        ]);
        
        setHasSeenWelcome(welcomeStatus === 'true');
        
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const { data, error } = await supabase.auth.getUser(session.access_token);
          
          if (data?.user && !error) {
            setIsAuthenticated(true);
          } else {
            // Session is invalid or expired
            await AsyncStorage.removeItem(USER_SESSION_KEY);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking app state:', error);
        setHasSeenWelcome(true);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAppState();
  }, []);

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#121212' : '#f8fafc'
      }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }
  
  // First time user flow: Welcome -> Auth -> App
  if (!hasSeenWelcome) {
    return <Redirect href="/welcome" />;
  }
  
  // Logged out user flow: Auth -> App
  if (!isAuthenticated) {
    return <Redirect href="/auth?mode=signin" />;
  }
  
  // Authenticated user: Go to main app
  return <Redirect href="/record/new" />;
}