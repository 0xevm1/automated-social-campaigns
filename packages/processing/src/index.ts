import {
  createEventBus,
  createSqsConsumer,
  SQS_QUEUES,
  logger,
  reportStartup,
  type ServiceMessage,
  type BriefValidatedPayload,
} from '@asc/shared';
import { createOrchestrator } from './orchestrator.js';

const bus = createEventBus();
const orchestrator = createOrchestrator(bus);

async function handleMessage(message: ServiceMessage): Promise<void> {
  const payload = message.payload as BriefValidatedPayload;
  const { brief, correlationId, complianceWarnings } = payload;

  logger.info(
    { campaign: brief.campaignName, correlationId, warnings: complianceWarnings?.length ?? 0 },
    'Received validated brief from SQS',
  );

  // Start the internal pipeline — it uses the in-process EventBus
  orchestrator.start(brief, correlationId, complianceWarnings ?? []);
}

const consumer = createSqsConsumer({
  queueName: SQS_QUEUES.PROCESSING,
  handler: handleMessage,
});

// Graceful shutdown
function shutdown() {
  logger.info('Shutting down processing service...');
  consumer.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

reportStartup();
logger.info('Processing service starting...');
consumer.poll().catch((err) => {
  logger.error(err, 'Processing service fatal error');
  process.exit(1);
});
