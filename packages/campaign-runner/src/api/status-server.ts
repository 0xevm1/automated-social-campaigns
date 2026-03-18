import Fastify from 'fastify';
import { logger } from '@asc/shared';
import { getCampaign } from '../state/campaign-store.js';

export async function startStatusServer(port = 3001) {
  const app = Fastify({ logger: false });

  app.get('/campaigns/:correlationId', async (request, reply) => {
    const { correlationId } = request.params as { correlationId: string };
    const campaign = await getCampaign(correlationId);

    if (!campaign) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }

    return reply.send(campaign);
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Campaign Runner status API listening');

  return app;
}
