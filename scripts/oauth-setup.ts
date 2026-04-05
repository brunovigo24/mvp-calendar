/**
 * Script one-time para gerar o GOOGLE_REFRESH_TOKEN.
 *
 * Como usar:
 *   1. Preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no .env
 *   2. Execute: npx tsx scripts/oauth-setup.ts
 *   3. Abra a URL impressa no terminal
 *   4. Autorize com a conta Google da barbeira
 *   5. Copie o `code` da URL de redirecionamento (parâmetro ?code=...)
 *   6. Cole no terminal quando solicitado
 *   7. Copie o GOOGLE_REFRESH_TOKEN gerado para o .env
 */

import * as readline from 'readline';
import { createOAuthClient, getAuthUrl, exchangeCode } from '../src/calendar/auth';

async function main() {
  const client = createOAuthClient();
  const url = getAuthUrl(client);

  console.log('\n=== Setup OAuth2 Google Calendar ===\n');
  console.log('1. Abra esta URL no navegador:\n');
  console.log(url);
  console.log('\n2. Autorize com a conta Google do profissional.');
  console.log('3. Após autorizar, você será redirecionado para localhost.');
  console.log('   Copie o valor do parâmetro "code" da URL.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const code = await new Promise<string>((resolve) => {
    rl.question('Cole o código aqui: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const refreshToken = await exchangeCode(client, code);

  console.log('\n=== Sucesso! ===\n');
  console.log('Adicione ao seu .env:\n');
  console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}\n`);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
