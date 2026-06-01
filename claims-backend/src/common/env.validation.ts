import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USERNAME: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default('claims_db'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is a required environment variable for production security.'),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, any>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('\x1b[31m❌ SYSTEM ERROR: Invalid environment configuration:\x1b[0m');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('SYSTEM ERROR: Environment validation failed. Crashing application.');
  }

  return result.data;
}
