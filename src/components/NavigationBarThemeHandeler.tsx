import { useEffect } from 'react';
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from '@/components/ThemeContext';
import { Platform } from 'react-native';

export function NavigationBarThemeHandler({ specialState, specialColor, specialButtonStyle }) {
  const { isDarkMode, theme } = useTheme();

  useEffect(() => {
    // Only run on Android since NavigationBar API is Android-specific
    if (Platform.OS !== 'android') return;

    const updateNavBar = async () => {
      try {
        // If in special state (like recording), use special colors
        if (specialState) {
          console.log(`Setting navigation bar to special state: ${specialColor}`);
          await NavigationBar.setBackgroundColorAsync(specialColor || "rgba(30, 30, 30, 0.9)");
          await NavigationBar.setButtonStyleAsync(specialButtonStyle || "light");
        } else {
          // Normal theme-based coloring
          console.log(`Setting navigation bar to ${isDarkMode ? 'dark' : 'light'} mode (theme: ${theme})`);
          await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff");
          await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
          
          // Make sure the navigation bar is visible and not translucent
          await NavigationBar.setVisibilityAsync("visible");
          await NavigationBar.setPositionAsync("relative");
        }
      } catch (error) {
        console.error("Error setting navigation bar color:", error);
      }
    };

    updateNavBar();

    // Important: Clean up when component unmounts
    return () => {
      if (Platform.OS === 'android') {
        // Reset to default theme-based settings when unmounting
        NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff");
        NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
        NavigationBar.setVisibilityAsync("visible");
        NavigationBar.setPositionAsync("relative");
      }
    };
  }, [isDarkMode, theme, specialState, specialColor, specialButtonStyle]);

  // This component doesn't render anything visible
  return null;
}