import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { logger } from '@asc/shared';
import { handleBrief } from './handlers/brief-handler.js';

const app = Fastify({ logger: false });

app.post('/events/campaign-brief', async (request, reply) => {
  const correlationId = randomUUID();
  const result = await handleBrief(request.body, correlationId);

  if (result.success) {
    return reply.code(202).send({
      correlationId: result.correlationId,
      campaignName: result.campaignName,
      complianceWarnings: result.complianceWarnings,
      message: 'Brief accepted and queued for processing',
    });
  } else {
    return reply.code(400).send({
      correlationId: result.correlationId,
      error: result.error,
    });
  }
});

app.get('/health', async () => ({ status: 'ok' }));

export async function startWebhookServer(port = 3000) {
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Intake webhook server listening');
  return app;
}

export { app };
