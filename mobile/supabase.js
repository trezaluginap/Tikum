import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validasi dan throw error jika env vars missing
if (!supabaseUrl) {
  throw new Error('❌ EXPO_PUBLIC_SUPABASE_URL tidak ditemukan di .env file');
}

if (!supabaseAnonKey) {
  throw new Error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env file');
}

console.log('✅ Supabase environment variables loaded successfully');

// Inisialisasi client standar Mobile
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Simpan token di memori permanen HP
    autoRefreshToken: true, // Otomatis perpanjang token jika expired
    persistSession: true, // User tetap login walaupun app ditutup
    detectSessionInUrl: false, // Tidak dipakai di React Native
  },
});