import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
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
  );
}