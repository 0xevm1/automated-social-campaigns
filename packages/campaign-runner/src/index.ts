import {
  PipelineEvent,
  createSqsConsumer,
  SQS_QUEUES,
  logger,
  type ServiceMessage,
} from '@asc/shared';
import { handleProgressEvent } from './handlers/progress-handler.js';
import { handleCompletionEvent } from './handlers/completion-handler.js';
import { startStatusServer } from './api/status-server.js';

const COMPLETION_EVENTS = new Set([
  PipelineEvent.CAMPAIGN_COMPLETED,
  PipelineEvent.CAMPAIGN_FAILED,
]);

async function handleMessage(message: ServiceMessage): Promise<void> {
  if (COMPLETION_EVENTS.has(message.eventType as PipelineEvent)) {
    await handleCompletionEvent(message);
  } else {
    await handleProgressEvent(message);
  }
}

const consumer = createSqsConsumer({
  queueName: SQS_QUEUES.RUNNER,
  handler: handleMessage,
});

// Graceful shutdown
function shutdown() {
  logger.info('Shutting down campaign runner...');
  consumer.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start status API server
const statusPort = parseInt(process.env.STATUS_PORT ?? '3001', 10);
startStatusServer(statusPort).catch((err) => {
  logger.warn(err, 'Status server failed to start (non-fatal)');
});

logger.info('Campaign runner starting...');
consumer.poll().catch((err) => {
  logger.error(err, 'Campaign runner fatal error');
  process.exit(1);
});
