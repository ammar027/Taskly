import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync(Ionicons.font);
    }
    loadFonts();
  }, []);

  return (
    <>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f5f5' }
      }}>
        <Stack.Screen name="(tabs)"  />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}