import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as QuickActions from "expo-quick-actions";
import { Platform, Linking } from 'react-native';
import { useQuickActionRouting } from "expo-quick-actions/router";
import { router } from 'expo-router';

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
    
    if (path.includes('/record/new')) {
      // If we're on the home screen, the params will be handled there
      // Otherwise, navigate to home with params
      if (router.canGoBack()) {
        router.navigate({
          pathname: '/',
          params: {
            content: params.content || '',
            priority: params.priority || 'medium'
          }
        });
      } else {
        router.replace({
          pathname: '/',
          params: {
            content: params.content || '',
            priority: params.priority || 'medium'
          }
        });
      }
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
          android: "add_note", 
        }),
        id: "record_item",
        params: { href: "/record/new" }
      },
    ]);
  }, []);

  return (
    <>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f5f5' }
      }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}