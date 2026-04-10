import { Scenes, Markup } from 'telegraf';
import { getFreeSlots, isSlotStillFree, createEvent, SERVICE_DURATIONS, SERVICE_LABELS, TimeSlot } from '../../calendar/slots';
import { db } from '../../db/client';
import { env } from '../../config/env';
import { scheduleReminder } from '../../jobs/queue';

interface AgendamentoState {
  service?: string;
  slot?: TimeSlot;
}

export type BotContext = Scenes.WizardContext;

function state(ctx: BotContext): AgendamentoState {
  return ctx.wizard.state as AgendamentoState;
}

// Step 0 — entrada: mostra opções de serviço
async function stepServico(ctx: BotContext) {
  await ctx.reply(
    'Qual serviço você deseja?',
    Markup.inlineKeyboard([
      [Markup.button.callback('Corte', 'corte')],
      [Markup.button.callback('Barba', 'barba')],
      [Markup.button.callback('Corte + Barba', 'corte_barba')],
    ]),
  );
  return ctx.wizard.next();
}

// Step 1 — recebe serviço, mostra slots disponíveis
async function stepSlot(ctx: BotContext) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    await ctx.reply('Por favor, escolha uma das opções acima.');
    return;
  }

  const service = ctx.callbackQuery.data;
  if (!SERVICE_DURATIONS[service]) {
    await ctx.reply('Serviço inválido. Use /agendar para recomeçar.');
    return ctx.scene.leave();
  }

  await ctx.answerCbQuery();
  state(ctx).service = service;

  await ctx.reply('Buscando horários disponíveis...');

  let slots: TimeSlot[];
  try {
    slots = await getFreeSlots(SERVICE_DURATIONS[service]);
  } catch {
    await ctx.reply('Não consegui buscar os horários. Tente novamente mais tarde.');
    return ctx.scene.leave();
  }

  if (slots.length === 0) {
    await ctx.reply('Não há horários disponíveis nos próximos dias. Entre em contato diretamente com o profissional.');
    return ctx.scene.leave();
  }

  const buttons = slots.map((slot) =>
    [Markup.button.callback(slot.label, slot.startISO)],
  );

  await ctx.reply(
    `Horários disponíveis para *${SERVICE_LABELS[service]}*:`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) },
  );

  return ctx.wizard.next();
}

// Step 2 — recebe slot, pede nome
async function stepNome(ctx: BotContext) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    await ctx.reply('Por favor, escolha um dos horários acima.');
    return;
  }

  const startISO = ctx.callbackQuery.data;
  const { service } = state(ctx);
  const durationMinutes = SERVICE_DURATIONS[service!];
  const endISO = new Date(new Date(startISO).getTime() + durationMinutes * 60 * 1000).toISOString();

  await ctx.answerCbQuery();

  let free: boolean;
  try {
    free = await isSlotStillFree(startISO, endISO);
  } catch {
    await ctx.reply('Erro ao verificar disponibilidade. Tente novamente.');
    return ctx.scene.leave();
  }

  if (!free) {
    await ctx.reply('Este horário acabou de ser ocupado. Use /agendar para ver os horários atualizados.');
    return ctx.scene.leave();
  }

  let slots: TimeSlot[] = [];
  try {
    slots = await getFreeSlots(durationMinutes);
  } catch { /* label opcional */ }

  const slotLabel = slots.find((s) => s.startISO === startISO)?.label
    ?? new Date(startISO).toLocaleString('pt-BR');

  state(ctx).slot = { label: slotLabel, startISO, endISO };

  await ctx.reply('Qual o seu nome completo?');
  return ctx.wizard.next();
}

// Step 3 — recebe nome, confirma e cria agendamento
async function stepConfirmar(ctx: BotContext) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Por favor, envie seu nome completo.');
    return;
  }

  const clientName = ctx.message.text.trim();
  if (clientName.length < 2 || clientName.length > 100) {
    await ctx.reply('Nome inválido. Por favor, envie seu nome completo.');
    return;
  }

  const { service, slot } = state(ctx);
  const clientTelegramId = ctx.from!.id;

  try {
    const googleEventId = await createEvent({
      calendarId: env.PROFESSIONAL_CALENDAR_ID,
      clientName,
      service: service!,
      startISO: slot!.startISO,
      endISO: slot!.endISO,
    });

    const result = await db.query(
      `INSERT INTO appointments
        (professional_id, client_name, client_telegram_id, service, duration_minutes, starts_at, ends_at, google_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        1,
        clientName,
        clientTelegramId,
        service,
        SERVICE_DURATIONS[service!],
        slot!.startISO,
        slot!.endISO,
        googleEventId,
      ],
    );

    const appointmentId = result.rows[0].id;

    const jobId = await scheduleReminder({
      appointmentId,
      clientTelegramId,
      clientName,
      service: service!,
      startsAt: slot!.startISO,
    });

    await db.query(
      'UPDATE appointments SET reminder_job_id = $1 WHERE id = $2',
      [jobId, appointmentId],
    );

    await ctx.reply(
      `✅ *Agendamento confirmado!*\n\n` +
      `Serviço: ${SERVICE_LABELS[service!]}\n` +
      `Data/Hora: ${slot!.label}\n\n` +
      `Te envio um lembrete 24h antes. Até lá!`,
      { parse_mode: 'Markdown' },
    );
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    await ctx.reply('Ocorreu um problema ao confirmar seu agendamento. Por favor, tente novamente.');
  }

  return ctx.scene.leave();
}

export const agendamentoScene = new Scenes.WizardScene<BotContext>(
  'agendamento',
  stepServico,
  stepSlot,
  stepNome,
  stepConfirmar,
);
