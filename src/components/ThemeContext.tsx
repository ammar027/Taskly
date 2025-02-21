import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_STORAGE_KEY = 'user_theme_preference';
export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

export const ThemeContext = createContext({
  theme: ThemeMode.SYSTEM,
  isDarkMode: false,
  toggleTheme: () => {},
  setThemeMode: () => {}
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(ThemeMode.SYSTEM);
  
  // Derive the actual dark/light state based on theme mode and system preference
  const isDarkMode = 
    themeMode === ThemeMode.DARK || 
    (themeMode === ThemeMode.SYSTEM && systemColorScheme === 'dark');
  
// Add console logging to better trace theme changes
useEffect(() => {
    // Add this line to debug when preferences load
    console.log('Loading theme preference, current system theme:', systemColorScheme);
    
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        console.log('Loaded theme from storage:', savedTheme);
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Save theme preference whenever it changes
useEffect(() => {
    console.log('Saving theme mode:', themeMode);
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    };
    
    saveThemePreference();
  }, [themeMode]);
  
  // Simple toggle between light and dark (doesn't touch system)
  const toggleTheme = () => {
    setThemeMode(prevMode => 
      prevMode === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK
    );
  };
  
  return (
    <ThemeContext.Provider 
      value={{
        theme: themeMode,
        isDarkMode,
        toggleTheme,
        setThemeMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for easy theme access
export const useTheme = () => useContext(ThemeContext);