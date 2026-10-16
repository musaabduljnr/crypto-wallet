/**
 * Environment configuration and validation.
 * Ensures all required public and server-only environment variables are defined
 * and formatted correctly before the application processes requests.
 */

export interface AppConfig {
  appUrl: string;
  appEnv: 'development' | 'test' | 'staging' | 'production';
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      return `mock-${key.toLowerCase().replace(/_/g, '-')}`;
    }
    throw new Error(`CRITICAL: Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development') as AppConfig['appEnv'];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Public variables accessible in browser
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://mock-project.supabase.co');
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'mock-anon-key-development-only');

  // Server-only variable (never exposed in client bundle)
  const isServer = typeof window === 'undefined';
  const serviceRoleKey = isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined;

  return {
    appUrl,
    appEnv,
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey,
    },
    isProduction: appEnv === 'production',
    isDevelopment: appEnv === 'development',
    isTest: appEnv === 'test',
  };
}

export const config = loadConfig();
