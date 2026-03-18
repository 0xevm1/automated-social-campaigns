import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { AWS_CONFIG } from '../config.js';
import type { ServiceMessage } from '../events/types.js';
import { logger } from './logger.js';

let client: SNSClient | null = null;

function getClient(): SNSClient {
  if (!client) {
    client = new SNSClient({
      region: AWS_CONFIG.region,
      ...(AWS_CONFIG.endpoint ? { endpoint: AWS_CONFIG.endpoint } : {}),
    });
  }
  return client;
}

export async function publishToTopic<T>(
  topicName: string,
  eventType: string,
  correlationId: string,
  payload: T,
): Promise<void> {
  const sns = getClient();
  const topicArn = `${AWS_CONFIG.snsTopicArnPrefix}${topicName}`;

  const message: ServiceMessage<T> = {
    eventType,
    correlationId,
    timestamp: new Date().toISOString(),
    payload,
  };

  await sns.send(new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageAttributes: {
      eventType: { DataType: 'String', StringValue: eventType },
      correlationId: { DataType: 'String', StringValue: correlationId },
    },
  }));

  logger.info({ topicName, eventType, correlationId }, 'Published to SNS');
}
