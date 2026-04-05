import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN é obrigatório'),

  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID é obrigatório'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET é obrigatório'),
  GOOGLE_REDIRECT_URI: z.string().url('GOOGLE_REDIRECT_URI deve ser uma URL válida'),
  GOOGLE_REFRESH_TOKEN: z.string().min(1, 'GOOGLE_REFRESH_TOKEN é obrigatório'),
  PROFESSIONAL_CALENDAR_ID: z.string().default('primary'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  TIMEZONE: z.string().default('America/Sao_Paulo'),
  PROFESSIONAL_TELEGRAM_ID: z.coerce.number().optional(),
  SLOT_INTERVAL_MINUTES: z.coerce.number().default(30),
  WORKING_HOURS_START: z.string().default('09:00'),
  WORKING_HOURS_END: z.string().default('18:00'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
