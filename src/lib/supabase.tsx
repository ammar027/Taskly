import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://keuujebchmygjpwxuels.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldXVqZWJjaG15Z2pwd3h1ZWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTc2NzMsImV4cCI6MjA1Nzc3MzY3M30.-FUsecZv66P9lV_X3nDGM_VJ0MqB1y9CVgCiHURbZ7U';

// Custom localStorage adapter with error handling
const customStorage = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from AsyncStorage:', error);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 1,
    },
  },
  global: {
    // Lower timeouts for better offline detection
    headers: { 'X-Client-Info': 'react-native' },
    fetch: (url, options = {}) => {
      const requestOptions = {
        ...options,
        timeout: 10000, // 10 seconds
      };
      return fetch(url, requestOptions);
    },
  },
});