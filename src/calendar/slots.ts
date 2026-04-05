import { google, calendar_v3 } from 'googleapis';
import { getAuthorizedClient } from './auth';
import { env } from '../config/env';

export const SERVICE_DURATIONS: Record<string, number> = {
  corte: 30,
  barba: 20,
  corte_barba: 50,
};

export const SERVICE_LABELS: Record<string, string> = {
  corte: 'Corte',
  barba: 'Barba',
  corte_barba: 'Corte + Barba',
};

export interface TimeSlot {
  label: string;
  startISO: string;
  endISO: string;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function getWorkingDaysOfWeek(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  // Pega os próximos 7 dias a partir de hoje
  for (let i = 0; i < 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const weekday = day.getDay();
    if (weekday !== 0) { // Exclui domingo
      days.push(day);
    }
  }
  return days;
}

function formatSlotLabel(date: Date): string {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${weekdays[date.getDay()]} ${day}/${month} ${hours}:${minutes}`;
}

export async function getFreeSlots(
  durationMinutes: number,
  maxSlots = 8,
): Promise<TimeSlot[]> {
  const auth = getAuthorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const workingDays = getWorkingDaysOfWeek();
  const timeMin = new Date(workingDays[0]);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(workingDays[workingDays.length - 1]);
  timeMax.setHours(23, 59, 59, 999);

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: env.TIMEZONE,
      items: [{ id: env.PROFESSIONAL_CALENDAR_ID }],
    },
  });

  const busyPeriods =
    freeBusyResponse.data.calendars?.[env.PROFESSIONAL_CALENDAR_ID]?.busy ?? [];

  const slots: TimeSlot[] = [];
  const start = parseTime(env.WORKING_HOURS_START);
  const end = parseTime(env.WORKING_HOURS_END);

  for (const day of workingDays) {
    if (slots.length >= maxSlots) break;

    const dayStart = new Date(day);
    dayStart.setHours(start.hours, start.minutes, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(end.hours, end.minutes, 0, 0);

    let cursor = new Date(dayStart);

    while (cursor < dayEnd && slots.length < maxSlots) {
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60 * 1000);

      if (slotEnd > dayEnd) break;

      // Pula slots no passado
      if (cursor <= new Date()) {
        cursor = new Date(cursor.getTime() + env.SLOT_INTERVAL_MINUTES * 60 * 1000);
        continue;
      }

      const isBusy = busyPeriods.some((busy: calendar_v3.Schema$TimePeriod) => {
        const busyStart = new Date(busy.start!);
        const busyEnd = new Date(busy.end!);
        return cursor < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push({
          label: formatSlotLabel(cursor),
          startISO: cursor.toISOString(),
          endISO: slotEnd.toISOString(),
        });
      }

      cursor = new Date(cursor.getTime() + env.SLOT_INTERVAL_MINUTES * 60 * 1000);
    }
  }

  return slots;
}

export async function isSlotStillFree(
  startISO: string,
  endISO: string,
): Promise<boolean> {
  const auth = getAuthorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startISO,
      timeMax: endISO,
      timeZone: env.TIMEZONE,
      items: [{ id: env.PROFESSIONAL_CALENDAR_ID }],
    },
  });

  const busy =
    response.data.calendars?.[env.PROFESSIONAL_CALENDAR_ID]?.busy ?? [];
  return busy.length === 0;
}

export async function createEvent(params: {
  calendarId: string;
  clientName: string;
  service: string;
  startISO: string;
  endISO: string;
}): Promise<string> {
  const auth = getAuthorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const serviceLabel = SERVICE_LABELS[params.service] ?? params.service;

  const response = await calendar.events.insert({
    calendarId: params.calendarId,
    requestBody: {
      summary: `${serviceLabel} — ${params.clientName}`,
      start: { dateTime: params.startISO, timeZone: env.TIMEZONE },
      end: { dateTime: params.endISO, timeZone: env.TIMEZONE },
    },
  });

  if (!response.data.id) {
    throw new Error('Evento criado sem ID retornado pelo Google Calendar.');
  }

  return response.data.id;
}

export async function deleteEvent(
  calendarId: string,
  eventId: string,
): Promise<void> {
  const auth = getAuthorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({ calendarId, eventId });
}
