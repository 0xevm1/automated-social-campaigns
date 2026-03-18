import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { AWS_CONFIG } from '@asc/shared';
import type { CampaignState } from '@asc/shared';

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const ddbClient = new DynamoDBClient({
      region: AWS_CONFIG.region,
      ...(AWS_CONFIG.endpoint ? { endpoint: AWS_CONFIG.endpoint } : {}),
    });
    docClient = DynamoDBDocumentClient.from(ddbClient);
  }
  return docClient;
}

const tableName = AWS_CONFIG.dynamoTableName;

export async function getCampaign(correlationId: string): Promise<CampaignState | null> {
  const client = getDocClient();
  const result = await client.send(new GetCommand({
    TableName: tableName,
    Key: { correlationId },
  }));
  return (result.Item as CampaignState) ?? null;
}

export async function createCampaign(state: CampaignState): Promise<void> {
  const client = getDocClient();
  await client.send(new PutCommand({
    TableName: tableName,
    Item: state,
  }));
}

export async function updateCampaignStatus(
  correlationId: string,
  status: CampaignState['status'],
  updates: Partial<Pick<CampaignState, 'campaignName' | 'completedAt' | 'durationMs' | 'manifestS3Key'>>,
): Promise<void> {
  const client = getDocClient();

  const expressionParts = ['#status = :status'];
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, any> = { ':status': status };

  if (updates.campaignName !== undefined) {
    expressionParts.push('campaignName = :campaignName');
    values[':campaignName'] = updates.campaignName;
  }
  if (updates.completedAt !== undefined) {
    expressionParts.push('completedAt = :completedAt');
    values[':completedAt'] = updates.completedAt;
  }
  if (updates.durationMs !== undefined) {
    expressionParts.push('durationMs = :durationMs');
    values[':durationMs'] = updates.durationMs;
  }
  if (updates.manifestS3Key !== undefined) {
    expressionParts.push('manifestS3Key = :manifestS3Key');
    values[':manifestS3Key'] = updates.manifestS3Key;
  }

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { correlationId },
    UpdateExpression: `SET ${expressionParts.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function addS3Key(correlationId: string, s3Key: string): Promise<void> {
  const client = getDocClient();
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { correlationId },
    UpdateExpression: 'SET s3Keys = list_append(if_not_exists(s3Keys, :empty), :key)',
    ExpressionAttributeValues: {
      ':key': [s3Key],
      ':empty': [],
    },
  }));
}

export async function addComplianceWarning(correlationId: string, warning: string): Promise<void> {
  const client = getDocClient();
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { correlationId },
    UpdateExpression: 'SET complianceWarnings = list_append(if_not_exists(complianceWarnings, :empty), :warning)',
    ExpressionAttributeValues: {
      ':warning': [warning],
      ':empty': [],
    },
  }));
}
