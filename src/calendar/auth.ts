import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(client: OAuth2Client): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
}

export async function exchangeCode(
  client: OAuth2Client,
  code: string,
): Promise<string> {
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Refresh token não retornado. Verifique se o prompt=consent está ativo.',
    );
  }
  return tokens.refresh_token;
}

export function getAuthorizedClient(): OAuth2Client {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
  return client;
}
