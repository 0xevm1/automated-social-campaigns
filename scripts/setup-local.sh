#!/usr/bin/env bash
set -euo pipefail

# Load .env if it exists (vars already in environment take precedence)
ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading config from $ENV_FILE"
  # shellcheck disable=SC1090
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    # Don't override vars already set in the environment
    if [[ -z "${!key+x}" ]]; then
      export "$key=$value"
    fi
  done < "$ENV_FILE"
else
  echo "Warning: $ENV_FILE not found, using defaults"
fi

# Derive settings from env vars
REGION="${AWS_REGION:-us-east-1}"
BUCKET="${S3_BUCKET:-asc-campaign-assets}"
DYNAMO_TABLE="${DYNAMO_TABLE_NAME:-asc-campaigns}"

# Conditional --endpoint-url (omitted for real AWS, set for LocalStack)
ENDPOINT_FLAG=()
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  ENDPOINT_FLAG=(--endpoint-url "$AWS_ENDPOINT_URL")
  TARGET="LocalStack ($AWS_ENDPOINT_URL)"
else
  TARGET="AWS"
fi

# Resolve account ID
if [[ -n "${SNS_TOPIC_ARN_PREFIX:-}" ]]; then
  ACCOUNT=$(echo "$SNS_TOPIC_ARN_PREFIX" | grep -oE '[0-9]{12}' | head -1)
elif [[ -n "${SQS_QUEUE_URL_PREFIX:-}" ]]; then
  ACCOUNT=$(echo "$SQS_QUEUE_URL_PREFIX" | grep -oE '[0-9]{12}' | head -1)
else
  ACCOUNT=$(aws "${ENDPOINT_FLAG[@]}" sts get-caller-identity --query Account --output text --region "$REGION" 2>/dev/null || echo "000000000000")
fi
ACCOUNT="${ACCOUNT:-000000000000}"

SNS_PREFIX="arn:aws:sns:${REGION}:${ACCOUNT}:"
SQS_ARN_PREFIX="arn:aws:sqs:${REGION}:${ACCOUNT}:"

if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  SQS_URL_PREFIX="${AWS_ENDPOINT_URL}/${ACCOUNT}/"
else
  SQS_URL_PREFIX="https://sqs.${REGION}.amazonaws.com/${ACCOUNT}/"
fi

# Resource names
TOPICS=(asc-brief-validated asc-processing-progress asc-campaign-status)
QUEUES=(asc-processing-queue asc-runner-queue asc-notifications-queue)
DLQS=(asc-processing-dlq asc-runner-dlq asc-notifications-dlq)

SUB_TOPICS=(asc-brief-validated asc-processing-progress asc-campaign-status)
SUB_QUEUES=(asc-processing-queue asc-runner-queue asc-notifications-queue)

echo "=== Setting up resources on ${TARGET} ==="
echo "  Region:   $REGION"
echo "  Account:  $ACCOUNT"
echo "  Bucket:   $BUCKET"
echo ""

# S3 Bucket
echo "S3 bucket..."
if aws "${ENDPOINT_FLAG[@]}" s3 mb "s3://${BUCKET}" --region "$REGION" > /dev/null 2>&1; then
  echo "  created: ${BUCKET}"
else
  echo "  exists:  ${BUCKET}"
fi

# SNS Topics
echo "SNS topics..."
for topic in "${TOPICS[@]}"; do
  if aws "${ENDPOINT_FLAG[@]}" sns create-topic --name "$topic" --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${topic}"
  else
    echo "  exists:  ${topic}"
  fi
done

# SQS DLQs
echo "SQS DLQ queues..."
for dlq in "${DLQS[@]}"; do
  if aws "${ENDPOINT_FLAG[@]}" sqs create-queue --queue-name "$dlq" --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${dlq}"
  else
    echo "  exists:  ${dlq}"
  fi
done

# SQS Queues with redrive policies
echo "SQS queues (with DLQ redrive)..."
for i in "${!QUEUES[@]}"; do
  queue="${QUEUES[$i]}"
  dlq="${DLQS[$i]}"
  dlq_arn="${SQS_ARN_PREFIX}${dlq}"

  if aws "${ENDPOINT_FLAG[@]}" sqs create-queue \
    --queue-name "$queue" \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${dlq_arn}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "  created: ${queue}"
  else
    echo "  exists:  ${queue}"
  fi
done

# SNS → SQS Subscriptions
echo "SNS -> SQS subscriptions..."
for i in "${!SUB_TOPICS[@]}"; do
  topic="${SUB_TOPICS[$i]}"
  queue="${SUB_QUEUES[$i]}"
  if aws "${ENDPOINT_FLAG[@]}" sns subscribe \
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
if aws "${ENDPOINT_FLAG[@]}" dynamodb create-table \
  --table-name "$DYNAMO_TABLE" \
  --attribute-definitions AttributeName=correlationId,AttributeType=S \
  --key-schema AttributeName=correlationId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" > /dev/null 2>&1; then
  echo "  created: ${DYNAMO_TABLE}"
else
  echo "  exists:  ${DYNAMO_TABLE}"
fi

# Write derived values back to .env if they're missing
echo ""
if [[ -f "$ENV_FILE" ]]; then
  UPDATED=false

  if ! grep -q "^SNS_TOPIC_ARN_PREFIX=" "$ENV_FILE"; then
    echo "SNS_TOPIC_ARN_PREFIX=${SNS_PREFIX}" >> "$ENV_FILE"
    UPDATED=true
  fi

  if ! grep -q "^SQS_QUEUE_URL_PREFIX=" "$ENV_FILE"; then
    echo "SQS_QUEUE_URL_PREFIX=${SQS_URL_PREFIX}" >> "$ENV_FILE"
    UPDATED=true
  fi

  if $UPDATED; then
    echo "Updated $ENV_FILE with derived ARN/URL prefixes"
  fi
fi

echo ""
echo "=== ${TARGET} setup complete ==="
echo ""
echo "Resources:"
echo "  S3:       s3://${BUCKET}"
echo "  SNS:      ${TOPICS[*]}"
echo "  SQS:      ${QUEUES[*]} (+ DLQs)"
echo "  DynamoDB: ${DYNAMO_TABLE}"
echo ""
echo "Env vars for $ENV_FILE:"
echo "  AWS_REGION=$REGION"
echo "  S3_BUCKET=$BUCKET"
echo "  SNS_TOPIC_ARN_PREFIX=${SNS_PREFIX}"
echo "  SQS_QUEUE_URL_PREFIX=${SQS_URL_PREFIX}"
echo "  DYNAMO_TABLE_NAME=$DYNAMO_TABLE"
