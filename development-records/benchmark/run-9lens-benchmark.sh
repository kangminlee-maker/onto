#!/bin/bash
# 9-Lens Subagent LLM Benchmark Runner
# Tests each lens × each model combination
#
# Usage: bash development-records/benchmark/run-9lens-benchmark.sh [model_filter]
#   model_filter: optional, e.g. "4B" to run only that model

set -euo pipefail
cd /Users/kangmin/cowork/onto-4

PACKETS_DIR="/tmp/onto-benchmark/packets"
RESULTS_DIR="/tmp/onto-benchmark/results"
ONTO_HOME="$HOME/.onto"
PROJECT_ROOT="/Users/kangmin/cowork/onto-4"
MODEL_FILTER="${1:-}"

LENSES=(logic structure dependency semantics pragmatics evolution coverage conciseness axiology)

# Model definitions: ID|display|type|model_name|port_or_flag|timeout_ms
MODELS=(
  "4B|Qwen3-4B|litellm|mlx-community/Qwen3-4B-Instruct-2507-4bit|8081|120000"
  "30B-A3B|Qwen3-30B-A3B|litellm|mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit|8080|180000"
  "27B-Opus|Qwen3.5-27B-Opus|litellm|mlx-community/Qwen3.5-27B-Claude-4.6-Opus-Distilled-MLX-4bit|8081|600000"
  "Codex-GPT54|GPT-5.4-high|codex|gpt-5.4|high|300000"
)

echo "═══════════════════════════════════════════════════════════════"
echo " 9-Lens Subagent LLM Benchmark"
echo " Date: $(date +%Y-%m-%d\ %H:%M)"
echo " Lenses: ${#LENSES[@]} | Models: ${#MODELS[@]}"
echo " Total runs: $((${#LENSES[@]} * ${#MODELS[@]}))"
echo "═══════════════════════════════════════════════════════════════"
echo ""

SUMMARY_FILE="$RESULTS_DIR/summary.csv"
echo "model,lens,time_s,lines,bytes,status" > "$SUMMARY_FILE"

for model_entry in "${MODELS[@]}"; do
  IFS='|' read -r MODEL_ID DISPLAY TYPE MODEL_NAME PORT_OR_FLAG TIMEOUT <<< "$model_entry"

  if [ -n "$MODEL_FILTER" ] && [ "$MODEL_ID" != "$MODEL_FILTER" ]; then
    continue
  fi

  echo "▸ Model: $DISPLAY ($MODEL_ID)"
  mkdir -p "$RESULTS_DIR/$MODEL_ID"

  for LENS in "${LENSES[@]}"; do
    PACKET="$PACKETS_DIR/${LENS}.packet.md"
    OUTPUT="$RESULTS_DIR/$MODEL_ID/${LENS}.md"

    if [ ! -f "$PACKET" ]; then
      echo "  ⚠ $LENS: packet not found, skipping"
      echo "$MODEL_ID,$LENS,0,0,0,missing_packet" >> "$SUMMARY_FILE"
      continue
    fi

    printf "  %-14s" "$LENS:"
    START_TIME=$(python3 -c "import time; print(time.time())")

    STATUS="ok"
    if [ "$TYPE" = "litellm" ]; then
      ONTO_LLM_TIMEOUT_MS=$TIMEOUT npx tsx src/core-runtime/cli/inline-http-review-unit-executor.ts \
        --project-root "$PROJECT_ROOT" \
        --session-root "$RESULTS_DIR/$MODEL_ID" \
        --onto-home "$ONTO_HOME" \
        --unit-id "bench-${LENS}" \
        --unit-kind lens \
        --packet-path "$PACKET" \
        --output-path "$OUTPUT" \
        --provider litellm \
        --model "$MODEL_NAME" \
        --llm-base-url "http://localhost:$PORT_OR_FLAG/v1" \
        --max-tokens 4096 > /dev/null 2>&1 || STATUS="error"
    elif [ "$TYPE" = "codex" ]; then
      npx tsx src/core-runtime/cli/codex-review-unit-executor.ts \
        --project-root "$PROJECT_ROOT" \
        --session-root "$RESULTS_DIR/$MODEL_ID" \
        --unit-id "bench-${LENS}" \
        --unit-kind lens \
        --packet-path "$PACKET" \
        --output-path "$OUTPUT" \
        --model "$MODEL_NAME" \
        --reasoning-effort "$PORT_OR_FLAG" \
        --sandbox-mode read-only > /dev/null 2>&1 || STATUS="error"
    fi

    END_TIME=$(python3 -c "import time; print(time.time())")
    ELAPSED=$(python3 -c "print(f'{$END_TIME - $START_TIME:.1f}')")

    if [ "$STATUS" = "ok" ] && [ -f "$OUTPUT" ]; then
      LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
      BYTES=$(wc -c < "$OUTPUT" | tr -d ' ')
      echo "${ELAPSED}s | ${LINES} lines | ${BYTES} bytes"
    else
      LINES=0
      BYTES=0
      echo "${ELAPSED}s | FAILED"
    fi

    echo "$MODEL_ID,$LENS,$ELAPSED,$LINES,$BYTES,$STATUS" >> "$SUMMARY_FILE"
  done
  echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo " Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""
column -t -s',' "$SUMMARY_FILE"
echo ""
echo "Results: $RESULTS_DIR/"
echo "CSV:     $SUMMARY_FILE"
