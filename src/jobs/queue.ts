import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = { url: env.REDIS_URL };

export const reminderQueue = new Queue('reminders', { connection });

export interface ReminderJobData {
  appointmentId: number;
  clientTelegramId: number;
  clientName: string;
  service: string;
  startsAt: string;
}

export async function scheduleReminder(data: ReminderJobData): Promise<string> {
  const startsAt = new Date(data.startsAt).getTime();
  const delay = startsAt - Date.now() - 24 * 60 * 60 * 1000; // 24h antes

  const job = await reminderQueue.add('send-reminder', data, {
    delay: Math.max(delay, 0),
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  return job.id!;
}
