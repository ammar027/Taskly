import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as QuickActions from "expo-quick-actions";
import { Platform } from 'react-native';
import { useQuickActionRouting } from "expo-quick-actions/router";

export default function RootLayout() {
  // Set up automatic routing for Quick Actions
  useQuickActionRouting();

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync(Ionicons.font);
    }
    loadFonts();
  }, []);

  useEffect(() => {
    QuickActions.setItems([
      {
        title: "Add Note",
        subtitle: "Quickly create a new note",
        icon: Platform.select({
          ios: "symbol:square.and.pencil",  // Using SF Symbols
          android: "record_note",  // Make sure this icon exists in your android resources
        }),
        id: "add_note",
        params: { href: "/note/new" }  
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