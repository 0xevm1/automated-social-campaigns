import { google } from 'googleapis';
import { randomUUID } from 'node:crypto';
import { createLogger } from '@asc/shared';
import { BaseWatcher } from './base-watcher.js';
import { getGoogleAuth } from '../auth/google-oauth.js';
import { handleBrief } from '../handlers/brief-handler.js';

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';

export class GoogleDriveWatcher extends BaseWatcher {
  private pageToken: string | null = null;

  constructor(pollIntervalMs?: number) {
    super({ name: 'google-drive', pollIntervalMs });
  }

  protected async poll(): Promise<void> {
    const log = createLogger();
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    try {
      if (!this.pageToken) {
        // Initialize the start page token
        const startResponse = await drive.changes.getStartPageToken({});
        this.pageToken = startResponse.data.startPageToken ?? null;
        log.info({ pageToken: this.pageToken }, 'Initialized Drive changes page token');
        return;
      }

      const response = await drive.changes.list({
        pageToken: this.pageToken,
        spaces: 'drive',
        fields: 'nextPageToken,newStartPageToken,changes(fileId,file(name,mimeType,parents))',
      });

      const changes = response.data.changes ?? [];
      this.pageToken = response.data.newStartPageToken ?? this.pageToken;

      for (const change of changes) {
        const file = change.file;
        if (!file || !change.fileId) continue;

        // Only process JSON files in the target folder
        if (
          file.name?.endsWith('.json') &&
          file.mimeType === 'application/json' &&
          (!DRIVE_FOLDER_ID || file.parents?.includes(DRIVE_FOLDER_ID))
        ) {
          log.info({ fileId: change.fileId, name: file.name }, 'New brief detected in Drive');

          try {
            const content = await drive.files.get({
              fileId: change.fileId,
              alt: 'media',
            });

            const briefData = typeof content.data === 'string'
              ? JSON.parse(content.data)
              : content.data;

            const correlationId = randomUUID();
            await handleBrief(briefData, correlationId);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            log.error({ fileId: change.fileId, error: errorMsg }, 'Failed to process Drive file');
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ error: errorMsg }, 'Drive poll failed');
      throw err;
    }
  }
}
