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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Derive the actual dark/light state based on theme mode and system preference
  const isDarkMode = 
    themeMode === ThemeMode.DARK || 
    (themeMode === ThemeMode.SYSTEM && systemColorScheme === 'dark');
  
  // Load theme preference and respond to system color scheme changes
  useEffect(() => {
    console.log('Loading theme preference, current system theme:', systemColorScheme);
    
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        console.log('Loaded theme from storage:', savedTheme);
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load theme preference:', error);
        setIsInitialized(true);
      }
    };
    
    loadThemePreference();
  }, [systemColorScheme]); // Added systemColorScheme as dependency to react to system changes
  
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
    
    // Only save if it's initialized (prevents overwriting during first load)
    if (isInitialized) {
      saveThemePreference();
    }
  }, [themeMode, isInitialized]);
  
  // Simple toggle between light and dark (doesn't touch system)
  const toggleTheme = () => {
    setThemeMode(prevMode => 
      prevMode === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK
    );
  };
  
  // Don't render children until theme is determined
  if (!isInitialized) {
    return null; // or return a loading indicator
  }
  
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

export const useTheme = () => useContext(ThemeContext);