import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const memoryStorage = new Map<string, string>();

const storage = {
  async getItem(key: string) {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis && globalThis.window?.localStorage) {
      return globalThis.window.localStorage.getItem(key);
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis && globalThis.window?.localStorage) {
      globalThis.window.localStorage.setItem(key, value);
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch {
      memoryStorage.set(key, value);
    }
  },
  async removeItem(key: string) {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis && globalThis.window?.localStorage) {
      globalThis.window.localStorage.removeItem(key);
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      memoryStorage.delete(key);
    }
  },
};

export const supabase =
  typeof window !== 'undefined' && isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
