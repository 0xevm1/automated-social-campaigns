import { google } from 'googleapis';
import { randomUUID } from 'node:crypto';
import { createLogger } from '@asc/shared';
import { BaseWatcher } from './base-watcher.js';
import { getGoogleAuth } from '../auth/google-oauth.js';
import { handleBrief } from '../handlers/brief-handler.js';

const GMAIL_LABEL = process.env.GMAIL_LABEL ?? 'campaign-briefs';

export class GmailWatcher extends BaseWatcher {
  private lastHistoryId: string | null = null;

  constructor(pollIntervalMs?: number) {
    super({ name: 'gmail', pollIntervalMs });
  }

  protected async poll(): Promise<void> {
    const log = createLogger();
    const auth = getGoogleAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      // List unread messages with the target label
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: `label:${GMAIL_LABEL} is:unread`,
        maxResults: 10,
      });

      const messages = response.data.messages ?? [];
      if (messages.length === 0) return;

      log.info({ count: messages.length }, 'Found new campaign brief emails');

      for (const msg of messages) {
        if (!msg.id) continue;

        try {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });

          // Look for JSON attachments
          const parts = full.data.payload?.parts ?? [];
          for (const part of parts) {
            if (part.filename?.endsWith('.json') && part.body?.attachmentId) {
              const attachment = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msg.id,
                id: part.body.attachmentId,
              });

              if (attachment.data.data) {
                const briefJson = Buffer.from(attachment.data.data, 'base64').toString('utf-8');
                const briefData = JSON.parse(briefJson);
                const correlationId = randomUUID();

                log.info({ filename: part.filename, correlationId }, 'Processing email attachment');
                await handleBrief(briefData, correlationId);
              }
            }
          }

          // Mark as read
          await gmail.users.messages.modify({
            userId: 'me',
            id: msg.id,
            requestBody: { removeLabelIds: ['UNREAD'] },
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          log.error({ messageId: msg.id, error: errorMsg }, 'Failed to process email');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ error: errorMsg }, 'Gmail poll failed');
      throw err;
    }
  }
}
