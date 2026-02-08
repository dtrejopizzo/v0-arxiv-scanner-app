#!/bin/bash

# Batch process papers with AI analysis
# Usage: ./scripts/batch-process.sh [category] [batch_size]

API_URL="http://localhost:3000/api/process-papers"
CATEGORY="${1:-}"
BATCH_SIZE="${2:-10}"

if [ -z "$CATEGORY" ]; then
  echo "Processing all categories with batch size: $BATCH_SIZE"
  curl -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"batchSize\": $BATCH_SIZE}" \
    | jq '.'
else
  echo "Processing category: $CATEGORY with batch size: $BATCH_SIZE"
  curl -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"category\": \"$CATEGORY\", \"batchSize\": $BATCH_SIZE}" \
    | jq '.'
fi
