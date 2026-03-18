import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '@asc/shared';

const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH ?? '.google-token.json';

let authClient: InstanceType<typeof google.auth.OAuth2> | null = null;

export function getGoogleAuth(): InstanceType<typeof google.auth.OAuth2> {
  if (authClient) return authClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/oauth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }

  authClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Load saved tokens if available
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    authClient.setCredentials(tokens);
    logger.info('Loaded saved Google OAuth tokens');
  }

  // Save tokens on refresh
  authClient.on('tokens', (tokens) => {
    const existing = fs.existsSync(TOKEN_PATH)
      ? JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
      : {};
    const merged = { ...existing, ...tokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
    logger.info('Google OAuth tokens refreshed and saved');
  });

  return authClient;
}

export function getAuthUrl(scopes: string[]): string {
  const auth = getGoogleAuth();
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function exchangeCode(code: string): Promise<void> {
  const auth = getGoogleAuth();
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  logger.info('Google OAuth tokens exchanged and saved');
}
