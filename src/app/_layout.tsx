import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as QuickActions from "expo-quick-actions";
import { Platform, Linking } from 'react-native';
import { useQuickActionRouting } from "expo-quick-actions/router";
import { router } from 'expo-router';
import { ThemeProvider } from '@/components/ThemeContext';

export default function RootLayout() {
  // Set up automatic routing for Quick Actions
  useQuickActionRouting();

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync(Ionicons.font);
    }
    loadFonts();
  }, []);

  // Handle deep links from Google Assistant
  useEffect(() => {
    // Handle links that launched the app
    const getInitialLink = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('App launched with URL:', url);
        handleDeepLink(url);
      }
    };
    
    getInitialLink();

    // Handle incoming links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Received URL while running:', url);
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    if (!url) return;

    console.log('Processing deep link:', url);
    
    try {
      // Parse URL and get path and query parameters
      const urlObj = new URL(url);
      const path = urlObj.pathname || '';
      const params = {};
      
      // Extract query parameters
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      console.log('Path:', path);
      console.log('Parameters:', params);
      
      // Handle opening record screen
      if (path.includes('/record/new')) {
        console.log('Opening new task screen');
        
        // Route to the task creation screen with parameters
        router.replace({
          pathname: "/(tabs)/new-task",
          params: {
            content: params.content || '',
            description: params.description || '',
            priority: params.priority || 'medium',
            assistantRequest: 'true' // Flag that this came from Assistant
          }
        });
        return;
      }
      
      // Handle specific task creation with content
      if (path.includes('/create-task')) {
        console.log('Creating new task with content:', params.content);
        
        router.replace({
          pathname: "/(tabs)/new-task",
          params: {
            content: params.content || '',
            description: params.description || '',
            priority: params.priority || 'medium',
            assistantRequest: 'true',
            autoStart: 'true' // Auto-start with the content
          }
        });
        return;
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  useEffect(() => {
    QuickActions.setItems([
      {
        title: "Record Item",
        subtitle: "Quickly create a new record",
        icon: Platform.select({
          ios: "symbol:square.and.pencil",
          android: "ic_appaction_foreground", 
        }),
        id: "record_item",
        params: { href: "/record/new" }
      },
    ]);
  }, []);

  return (
    <>
    <ThemeProvider>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f5f5' }
      }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      </ThemeProvider>
    </>
  );
}