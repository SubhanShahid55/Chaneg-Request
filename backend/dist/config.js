import 'dotenv/config';
function requireEnv(name) {
    const val = process.env[name];
    if (!val) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return val;
}
export const config = {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
    resendApiKey: requireEnv('RESEND_API_KEY'),
    fromEmail: process.env.FROM_EMAIL || 'noreply@momentumstudio.dev',
    teamEmail: process.env.TEAM_EMAIL || 'sarah@momentumstudio.dev',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    redisUrl: process.env.REDIS_URL || '',
    port: parseInt(process.env.PORT || '4000', 10),
};
//# sourceMappingURL=config.js.map