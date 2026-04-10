import { Worker } from 'bullmq';
import { Telegram } from 'telegraf';
import { env } from '../config/env';
import { SERVICE_LABELS } from '../calendar/slots';
import { ReminderJobData } from './queue';

const connection = { url: env.REDIS_URL };

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${weekdays[date.getDay()]} ${day}/${month} às ${hours}:${minutes}`;
}

export function startReminderWorker() {
  const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

  const worker = new Worker<ReminderJobData>(
    'reminders',
    async (job) => {
      const { clientTelegramId, clientName, service, startsAt } = job.data;
      const serviceLabel = SERVICE_LABELS[service] ?? service;
      const dateLabel = formatDate(startsAt);

      await telegram.sendMessage(
        clientTelegramId,
        `🔔 Olá, ${clientName}!\n\nLembrete: seu agendamento de *${serviceLabel}* é amanhã, *${dateLabel}*.\n\nAté lá!`,
        { parse_mode: 'Markdown' },
      );
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`Lembrete falhou (job ${job?.id}):`, err.message);
  });

  return worker;
}
