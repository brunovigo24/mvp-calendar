import { Telegraf, Scenes } from 'telegraf';
import { env } from '../config/env';
import { sessionMiddleware } from './middlewares/session.middleware';
import { agendamentoScene, BotContext } from './scenes/agendamento.scene';

export const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN);

const stage = new Scenes.Stage<BotContext>([agendamentoScene]);

bot.use(sessionMiddleware);
bot.use(stage.middleware());

bot.command('start', (ctx) =>
  ctx.reply('Olá! 👋 Sou o assistente de agendamento.\n\nUse /agendar para marcar um horário.'),
);

bot.command('agendar', (ctx) => ctx.scene.enter('agendamento'));
