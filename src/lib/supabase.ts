import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://demo-routenex.supabase.co';
const supabaseAnonKey = getEnv('PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || 'demo-anon-key-placeholder';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('demo-routenex') &&
    !supabaseAnonKey.includes('placeholder')
  );
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the initialized Supabase client instance.
 * Gracefully provides safe fallback client if environment variables are not configured.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabase();

export async function signInWithEmail(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string, metadata: Record<string, any> = {}) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
}

export async function signInWithMagicLink(email: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
}

export async function signInWithOAuth(provider: 'github' | 'google') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
