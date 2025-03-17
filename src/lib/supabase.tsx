import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://keuujebchmygjpwxuels.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldXVqZWJjaG15Z2pwd3h1ZWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTc2NzMsImV4cCI6MjA1Nzc3MzY3M30.-FUsecZv66P9lV_X3nDGM_VJ0MqB1y9CVgCiHURbZ7U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});