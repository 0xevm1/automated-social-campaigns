#!/usr/bin/env bash
set -euo pipefail

echo "=== Initializing LocalStack AWS resources ==="

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ACCOUNT="000000000000"

SNS_PREFIX="arn:aws:sns:${REGION}:${ACCOUNT}:"
SQS_ARN_PREFIX="arn:aws:sqs:${REGION}:${ACCOUNT}:"

# S3 Bucket
echo "S3 bucket..."
if awslocal s3 mb s3://asc-campaign-assets --region "$REGION" > /dev/null 2>&1; then
  echo "  created: asc-campaign-assets"
else
  echo "  exists:  asc-campaign-assets"
fi

# SNS Topics
echo "SNS topics..."
for topic in asc-brief-validated asc-processing-progress asc-campaign-status; do
  if awslocal sns create-topic --name "$topic" --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${topic}"
  else
    echo "  exists:  ${topic}"
  fi
done

# SQS DLQs
echo "SQS DLQ queues..."
for dlq in asc-processing-dlq asc-runner-dlq asc-notifications-dlq; do
  if awslocal sqs create-queue --queue-name "$dlq" --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${dlq}"
  else
    echo "  exists:  ${dlq}"
  fi
done

# SQS Queues with redrive policies
QUEUES=(asc-processing-queue asc-runner-queue asc-notifications-queue)
DLQS=(asc-processing-dlq asc-runner-dlq asc-notifications-dlq)

echo "SQS queues (with DLQ redrive)..."
for i in "${!QUEUES[@]}"; do
  queue="${QUEUES[$i]}"
  dlq="${DLQS[$i]}"
  dlq_arn="${SQS_ARN_PREFIX}${dlq}"

  if awslocal sqs create-queue \
    --queue-name "$queue" \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${dlq_arn}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${queue}"
  else
    echo "  exists:  ${queue}"
  fi
done

# SNS -> SQS Subscriptions
echo "SNS -> SQS subscriptions..."
TOPICS=(asc-brief-validated asc-processing-progress asc-campaign-status)
SUB_QUEUES=(asc-processing-queue asc-runner-queue asc-notifications-queue)

for i in "${!TOPICS[@]}"; do
  topic="${TOPICS[$i]}"
  queue="${SUB_QUEUES[$i]}"
  if awslocal sns subscribe \
    --topic-arn "${SNS_PREFIX}${topic}" \
    --protocol sqs \
    --notification-endpoint "${SQS_ARN_PREFIX}${queue}" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${topic} -> ${queue}"
  else
    echo "  exists:  ${topic} -> ${queue}"
  fi
done

# DynamoDB Table
echo "DynamoDB table..."
if awslocal dynamodb create-table \
  --table-name asc-campaigns \
  --attribute-definitions AttributeName=correlationId,AttributeType=S \
  --key-schema AttributeName=correlationId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" > /dev/null 2>&1; then
  echo "  created: asc-campaigns"
else
  echo "  exists:  asc-campaigns"
fi

echo "=== LocalStack initialization complete ==="
