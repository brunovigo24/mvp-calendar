/**
 * Script one-time para gerar o GOOGLE_REFRESH_TOKEN.
 *
 * Como usar:
 *   1. Preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no .env
 *   2. Execute: npm run oauth:setup
 *   3. Abra a URL impressa no terminal
 *   4. Autorize com a conta Google da barbeira
 *   5. Copie o `code` da URL de redirecionamento (parâmetro ?code=...)
 *   6. Cole no terminal quando solicitado
 *   7. Copie o GOOGLE_REFRESH_TOKEN gerado para o .env
 */

import * as readline from 'readline';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/oauth/callback';

if (!clientId || !clientSecret) {
  console.error('Erro: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são obrigatórios no .env');
  process.exit(1);
}

async function main() {
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  console.log('\n=== Setup OAuth2 Google Calendar ===\n');
  console.log('1. Abra esta URL no navegador:\n');
  console.log(url);
  console.log('\n2. Autorize com a conta Google do profissional.');
  console.log('3. Após autorizar, você será redirecionado para localhost.');
  console.log('   A página vai dar erro (normal) — copie o parâmetro "code" da URL.\n');
  console.log('   Exemplo: http://localhost:3000/oauth/callback?code=AQUI_ESTÁ_O_CODE&...\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const code = await new Promise<string>((resolve) => {
    rl.question('Cole o código aqui: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    console.error('Refresh token não retornado. Tente revogar o acesso em https://myaccount.google.com/permissions e rode novamente.');
    process.exit(1);
  }

  console.log('\n=== Sucesso! ===\n');
  console.log('Adicione ao seu .env:\n');
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
