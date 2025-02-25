import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from '@/components/ThemeContext';

export default function Index() {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const updateNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(isDarkMode ? "#000000" : "#ffffff");
      } catch (error) {
        console.error("Error setting navigation bar color:", error);
      }
    };

    updateNavBar();
  }, [isDarkMode]); // This ensures the nav bar updates instantly on theme change

  return <Redirect href="/record/new" />;
}
