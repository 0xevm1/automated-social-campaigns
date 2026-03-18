import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { AWS_CONFIG } from '../config.js';
import type { ServiceMessage } from '../events/types.js';
import { logger } from './logger.js';

let client: SQSClient | null = null;

function getClient(): SQSClient {
  if (!client) {
    client = new SQSClient({
      region: AWS_CONFIG.region,
      ...(AWS_CONFIG.endpoint ? { endpoint: AWS_CONFIG.endpoint } : {}),
    });
  }
  return client;
}

export type MessageHandler = (message: ServiceMessage) => Promise<void>;

export interface SqsConsumerOptions {
  queueName: string;
  handler: MessageHandler;
  waitTimeSeconds?: number;
  maxMessages?: number;
}

export function createSqsConsumer(options: SqsConsumerOptions) {
  const {
    queueName,
    handler,
    waitTimeSeconds = 20,
    maxMessages = 1,
  } = options;

  const queueUrl = `${AWS_CONFIG.sqsQueueUrlPrefix}${queueName}`;
  let running = false;

  async function poll(): Promise<void> {
    const sqs = getClient();
    running = true;

    logger.info({ queueName, queueUrl }, 'SQS consumer starting');

    while (running) {
      try {
        const response = await sqs.send(new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: maxMessages,
          WaitTimeSeconds: waitTimeSeconds,
          MessageAttributeNames: ['All'],
        }));

        if (!response.Messages || response.Messages.length === 0) continue;

        for (const sqsMessage of response.Messages) {
          if (!sqsMessage.Body || !sqsMessage.ReceiptHandle) continue;

          try {
            // SNS wraps the message in its own envelope
            let parsedBody: ServiceMessage;
            const rawBody = JSON.parse(sqsMessage.Body);

            if (rawBody.Type === 'Notification' && rawBody.Message) {
              // SNS → SQS: the actual message is nested in .Message
              parsedBody = JSON.parse(rawBody.Message) as ServiceMessage;
            } else {
              parsedBody = rawBody as ServiceMessage;
            }

            logger.info(
              { queueName, eventType: parsedBody.eventType, correlationId: parsedBody.correlationId },
              'Processing SQS message',
            );

            await handler(parsedBody);

            await sqs.send(new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: sqsMessage.ReceiptHandle,
            }));
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error({ queueName, error: errorMsg }, 'Failed to process message');
            // Message will return to queue after visibility timeout → eventually DLQ
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ queueName, error: errorMsg }, 'SQS poll error');
        // Brief pause before retrying
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    logger.info({ queueName }, 'SQS consumer stopped');
  }

  function stop(): void {
    running = false;
  }

  return { poll, stop };
}
