import 'dotenv/config';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function requireAnyEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}

export const config = {
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireAnyEnv('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: requireAnyEnv('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'),
  resendApiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@momentumstudio.dev',
  teamEmail: process.env.TEAM_EMAIL || 'sarah@momentumstudio.dev',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  redisUrl: process.env.REDIS_URL || '',
  port: parseInt(process.env.PORT || '4000', 10),
} as const;
