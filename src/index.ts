import { env } from './config/env';
import { testConnection } from './db/client';
import { bot } from './bot/index';
import { startReminderWorker } from './jobs/reminder.worker';

async function main() {
  await testConnection();
  console.log('Banco de dados conectado.');

  const worker = startReminderWorker();
  console.log('Worker de lembretes iniciado.');

  await bot.launch();
  console.log('Bot iniciado. Aguardando mensagens...');

  const shutdown = async () => {
    console.log('Encerrando...');
    bot.stop('SIGTERM');
    await worker.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
