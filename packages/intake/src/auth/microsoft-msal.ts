import * as msal from '@azure/msal-node';
import { logger } from '@asc/shared';

let msalClient: msal.ConfidentialClientApplication | null = null;
let cachedToken: string | null = null;
let tokenExpiry = 0;

function getClient(): msal.ConfidentialClientApplication {
  if (msalClient) return msalClient;

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';

  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be set');
  }

  msalClient = new msal.ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });

  return msalClient;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const client = getClient();
  const result = await client.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  if (!result?.accessToken) {
    throw new Error('Failed to acquire Microsoft access token');
  }

  cachedToken = result.accessToken;
  // Expire 5 minutes early to avoid edge cases
  tokenExpiry = Date.now() + (result.expiresOn ? result.expiresOn.getTime() - Date.now() - 300_000 : 3300_000);

  logger.info('Microsoft access token acquired');
  return cachedToken;
}
