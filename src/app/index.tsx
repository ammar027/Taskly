// app/index.tsx
import { Redirect } from 'expo-router';
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from 'react';
import { useTheme } from '@/components/ThemeContext';

export default function Index() {
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    // Set navigation bar properties based on theme
    NavigationBar.setPositionAsync("absolute");
    
    // Transparent background with slight theme tint
    NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(18, 18, 18, 0.9)");
    
    // Button style - light for dark mode, dark for light mode
    NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode]);

  return <Redirect href="/record/new" />;
}