import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pjubvuvqzwhvqxeeubcv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWJ2dXZxendodnF4ZWV1YmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDU0NjYsImV4cCI6MjA4MzcyMTQ2Nn0.S6c_saGG8tVNvAegb8e9eP3d5PbPlY0BLDnM0HR5n_0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type SupabaseUser = {
  id: string;
  email: string | undefined;
};
