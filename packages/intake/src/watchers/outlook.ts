import { Client } from '@microsoft/microsoft-graph-client';
import { randomUUID } from 'node:crypto';
import { createLogger } from '@asc/shared';
import { BaseWatcher } from './base-watcher.js';
import { getAccessToken } from '../auth/microsoft-msal.js';
import { handleBrief } from '../handlers/brief-handler.js';

const OUTLOOK_FOLDER = process.env.OUTLOOK_FOLDER ?? 'Inbox';
const OUTLOOK_USER = process.env.OUTLOOK_USER_ID ?? 'me';

export class OutlookWatcher extends BaseWatcher {
  constructor(pollIntervalMs?: number) {
    super({ name: 'outlook', pollIntervalMs });
  }

  private async getGraphClient(): Promise<Client> {
    const token = await getAccessToken();
    return Client.init({
      authProvider: (done) => done(null, token),
    });
  }

  protected async poll(): Promise<void> {
    const log = createLogger();

    try {
      const client = await this.getGraphClient();

      // Get unread messages with attachments
      const response = await client
        .api(`/users/${OUTLOOK_USER}/mailFolders/${OUTLOOK_FOLDER}/messages`)
        .filter('isRead eq false and hasAttachments eq true')
        .top(10)
        .select('id,subject,hasAttachments')
        .get();

      const messages = response.value ?? [];
      if (messages.length === 0) return;

      log.info({ count: messages.length }, 'Found new Outlook messages with attachments');

      for (const msg of messages) {
        try {
          // Get attachments
          const attachments = await client
            .api(`/users/${OUTLOOK_USER}/messages/${msg.id}/attachments`)
            .get();

          for (const attachment of attachments.value ?? []) {
            if (
              attachment.name?.endsWith('.json') &&
              attachment.contentBytes
            ) {
              const briefJson = Buffer.from(attachment.contentBytes, 'base64').toString('utf-8');
              const briefData = JSON.parse(briefJson);
              const correlationId = randomUUID();

              log.info({ filename: attachment.name, correlationId }, 'Processing Outlook attachment');
              await handleBrief(briefData, correlationId);
            }
          }

          // Mark as read
          await client
            .api(`/users/${OUTLOOK_USER}/messages/${msg.id}`)
            .update({ isRead: true });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          log.error({ messageId: msg.id, error: errorMsg }, 'Failed to process Outlook message');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ error: errorMsg }, 'Outlook poll failed');
      throw err;
    }
  }
}
