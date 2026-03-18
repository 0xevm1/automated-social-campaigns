import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { randomUUID } from 'node:crypto';
import { logger } from '@asc/shared';
import { handleBrief } from './handlers/brief-handler.js';
import { startWebhookServer } from './server.js';
import { GmailWatcher } from './watchers/gmail.js';
import { GoogleDriveWatcher } from './watchers/google-drive.js';
import { OutlookWatcher } from './watchers/outlook.js';

const program = new Command();

program
  .name('asc-intake')
  .description('Intake service for automated social campaigns')
  .version('1.0.0');

program
  .command('manual')
  .description('Submit a campaign brief manually from a file')
  .requiredOption('-b, --brief <path>', 'Path to campaign brief (JSON or YAML)')
  .action(async (opts) => {
    const briefPath = path.resolve(opts.brief);

    if (!fs.existsSync(briefPath)) {
      logger.error({ briefPath }, 'Brief file not found');
      process.exit(1);
    }

    const raw = fs.readFileSync(briefPath, 'utf-8');
    let briefData: unknown;

    if (briefPath.endsWith('.yaml') || briefPath.endsWith('.yml')) {
      briefData = parseYaml(raw);
    } else {
      briefData = JSON.parse(raw);
    }

    const correlationId = randomUUID();
    const result = await handleBrief(briefData, correlationId);

    if (result.success) {
      console.log('\n====================================');
      console.log('  Brief Submitted');
      console.log('====================================');
      console.log(`  Campaign:      ${result.campaignName}`);
      console.log(`  Correlation ID: ${result.correlationId}`);

      if (result.complianceWarnings && result.complianceWarnings.length > 0) {
        console.log(`\n  Warnings (${result.complianceWarnings.length}):`);
        for (const w of result.complianceWarnings) {
          console.log(`    - ${w}`);
        }
      }

      console.log('\n  Brief published to processing queue.');
      console.log('====================================\n');
    } else {
      logger.error({ error: result.error }, 'Brief submission failed');
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Start watching for campaign briefs from various sources')
  .option('--webhook', 'Start webhook server', false)
  .option('--gmail', 'Watch Gmail for campaign brief attachments', false)
  .option('--drive', 'Watch Google Drive for new brief files', false)
  .option('--outlook', 'Watch Outlook for campaign brief attachments', false)
  .option('--poll-interval <ms>', 'Poll interval in milliseconds', '60000')
  .option('--port <port>', 'Webhook server port', '3000')
  .action(async (opts) => {
    const pollInterval = parseInt(opts.pollInterval, 10);
    const watchers: { name: string; start: () => Promise<void>; stop: () => void }[] = [];

    if (opts.webhook) {
      const port = parseInt(opts.port, 10);
      await startWebhookServer(port);
    }

    if (opts.gmail) {
      const watcher = new GmailWatcher(pollInterval);
      watchers.push({ name: 'gmail', start: () => watcher.start(), stop: () => watcher.stop() });
    }

    if (opts.drive) {
      const watcher = new GoogleDriveWatcher(pollInterval);
      watchers.push({ name: 'drive', start: () => watcher.start(), stop: () => watcher.stop() });
    }

    if (opts.outlook) {
      const watcher = new OutlookWatcher(pollInterval);
      watchers.push({ name: 'outlook', start: () => watcher.start(), stop: () => watcher.stop() });
    }

    if (watchers.length === 0 && !opts.webhook) {
      logger.warn('No watchers or webhook enabled. Use --gmail, --drive, --outlook, or --webhook');
      process.exit(1);
    }

    // Start all watchers
    for (const w of watchers) {
      logger.info({ watcher: w.name }, 'Starting watcher');
      await w.start();
    }

    // Graceful shutdown
    function shutdown() {
      logger.info('Shutting down intake service...');
      for (const w of watchers) {
        w.stop();
      }
      process.exit(0);
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    logger.info({ watchers: watchers.map((w) => w.name) }, 'Intake service running');
  });

// Filter out bare '--' that pnpm injects when forwarding args
const args = process.argv.filter((arg, i) => !(arg === '--' && i >= 2));
program.parse(args);
