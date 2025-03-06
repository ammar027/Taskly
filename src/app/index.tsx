import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import * as NavigationBar from "expo-navigation-bar";
import { useTheme, ThemeMode } from '@/components/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

const WELCOME_SHOWN_KEY = 'welcome_screen_shown';

export default function Index() {
  const { isDarkMode, theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Effect for navigation bar theming
  useEffect(() => {
    const updateNavBar = async () => {
      try {
        // Set the background color based on the current theme
        await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff");
        
        // Also set button colors for better visibility
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
        
        // You can also control the navigation bar visibility if needed
        // await NavigationBar.setVisibilityAsync("visible");
        
        console.log(`Navigation bar updated to ${isDarkMode ? 'dark' : 'light'} mode`);
      } catch (error) {
        console.error("Error setting navigation bar color:", error);
      }
    };

    updateNavBar();
  }, [isDarkMode]); 

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme === ThemeMode.SYSTEM) {
      // This will create a subscription for system theme changes
      // if you're using the system theme mode
      const subscription = NavigationBar.addVisibilityListener(() => {
        // Re-apply the navigation bar color when visibility changes
        // This helps maintain theme consistency
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
      
      // Clean up subscription
      return () => subscription.remove();
    }
  }, [theme, isDarkMode]);

  // Check if welcome screen has been shown
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const hasShownWelcome = await AsyncStorage.getItem(WELCOME_SHOWN_KEY);
        setHasSeenWelcome(hasShownWelcome === 'true');
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking welcome screen status:', error);
        // Default to showing the main app if there's an error
        setHasSeenWelcome(true);
        setIsLoading(false);
      }
    };

    checkWelcomeStatus();
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
  
  return hasSeenWelcome ? 
    <Redirect href="/record/new" /> : 
    <Redirect href="/welcome" />;
}