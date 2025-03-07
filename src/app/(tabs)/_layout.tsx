import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/components/ThemeContext';
import { NavigationBarThemeHandler } from '@/components/NavigationBarThemeHandeler';

export default function TabLayout() {
  const { isDarkMode, theme } = useTheme();
  
  // Define theme colors
  const themeColors = {
    tabBackground: isDarkMode ? 'rgb(30, 30, 30)' : '#ffffff',
    tabBorder: isDarkMode ? '#2c2c2c' : '#e5e5e5',
    headerBackground: isDarkMode ? '#121212' : '#ffffff',
    activeTintColor: '#4F46E5',
    inactiveTintColor: isDarkMode ? '#a0a0a0' : '#8E8E93',
    headerTintColor: isDarkMode ? '#e0e0e0' : '#1e293b',
  };
  
  return (
    <>
      {/* Add the NavigationBarThemeHandler here to ensure it's always present */}
      <NavigationBarThemeHandler />
      
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: themeColors.tabBackground,
            borderTopWidth: 0.3,
            borderTopColor: themeColors.tabBorder,
            height: Platform.OS === 'ios' ? 88 : 78,
            paddingBottom: Platform.OS === 'ios' ? 28 : 15,
            paddingTop: 15,
            // Make sure the tab bar is positioned above the navigation bar on Android
            ...(Platform.OS === 'android' && {
              position: 'absolute',
              zIndex: 1,
              bottom: 0,
              left: 0,
              right: 0,
              elevation: 8,
            }),
          },
          tabBarActiveTintColor: themeColors.activeTintColor,
          tabBarInactiveTintColor: themeColors.inactiveTintColor,
          headerStyle: {
            backgroundColor: themeColors.headerBackground,
          },
          headerShown: false,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
            color: themeColors.headerTintColor,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Notes',
            headerShown: false,
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: 'Categories',
            headerTitle: 'Categories',
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="folder-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reminders"
          options={{
            title: 'Reminders',
            headerTitle: 'Reminders',
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="alarm-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerTitle: 'Settings',
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}