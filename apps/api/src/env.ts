import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Riot API
  RIOT_API_KEY: z.string().min(1, 'RIOT_API_KEY is required'),
  
  // Discord OAuth (optional)
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_API_KEY: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().url().optional(),
  
  // CAPTCHA (optional)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  
  // Server config
  PORT: z.string().default('3333'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOW_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Redis (optional, used for sessions)
  REDIS_URL: z.string().url().optional(),
  
  // JWT Secret (required for security)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // Use fake DB for testing
  USE_FAKE_DB: z.string().optional(),
  USE_FAKE_RIOT: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      console.error(`  - ${path}: ${err.message}`);
    });
    console.error('\n⚠️  Required environment variables are missing.');
    console.error('\nFor development, generate a JWT_SECRET with:');
    console.error('  node -e "console.log(\\"JWT_SECRET=\\" + require(\\"crypto\\").randomBytes(32).toString(\\"hex\\"))"');
    process.exit(1);
  }
  
  // Log successful validation
  if (result.data.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
    console.log('✓ JWT_SECRET is configured');
  }
  
  // Production warning
  if (result.data.NODE_ENV === 'production') {
    console.log('✅ All production environment variables validated');
  }
  
  return result.data;
}

export const env = validateEnv();
