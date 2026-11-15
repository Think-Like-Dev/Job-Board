#!/usr/bin/env bash
# Starts the two local model servers (llama.cpp) that the AI service talks to.
#
# Two processes, because llama-server serves either chat or embeddings
# (--embedding restricts it), and they are different model files:
#
#   1. chat       -> http://localhost:9931/v1   (extraction + evaluation)
#   2. embeddings -> http://localhost:9932/v1   (resume + job vectors)
#
# The models live outside the repository (default: ~/models), so they can never
# be committed.
#
# Usage:
#   ./start-llama-servers.sh
#   MODELS_DIR=/d/models ./start-llama-servers.sh
#
# Stop both servers with:  pkill -f llama-server

set -euo pipefail

MODELS_DIR="${MODELS_DIR:-$HOME/models}"
LLAMA_SERVER="${LLAMA_SERVER:-$HOME/llama.cpp/llama-server}"
CHAT_MODEL="${CHAT_MODEL:-qwen2.5-0.5b-instruct-q4_k_m.gguf}"
# Deliberately not the upstream file name: several broken conversions ship as
# "multilingual-e5-small-q8_0.gguf" and a case-insensitive filesystem would
# match them. This name is unique to the build that actually loads.
EMBEDDING_MODEL="${EMBEDDING_MODEL:-e5-small-multilingual-q8_0.gguf}"
CHAT_PORT="${CHAT_PORT:-9931}"
EMBEDDING_PORT="${EMBEDDING_PORT:-9932}"
THREADS="${THREADS:-4}"
CONTEXT_SIZE="${CONTEXT_SIZE:-4096}"

die() {
  echo "" >&2
  echo "ERROR: $1" >&2
  echo "  $2" >&2
  exit 1
}

[ -x "$LLAMA_SERVER" ] || [ -f "$LLAMA_SERVER" ] || die \
  "llama-server not found at $LLAMA_SERVER" \
  "Download the build from https://github.com/ggml-org/llama.cpp/releases and set LLAMA_SERVER."

[ -f "$MODELS_DIR/$CHAT_MODEL" ] || die \
  "the chat model is missing: $MODELS_DIR/$CHAT_MODEL" \
  "See the 'Models' section of back-end/ai-platform/README.md for the download links."

[ -f "$MODELS_DIR/$EMBEDDING_MODEL" ] || die \
  "the embedding model is missing: $MODELS_DIR/$EMBEDDING_MODEL" \
  "See the 'Models' section of back-end/ai-platform/README.md for the download links."

LOG_DIR="$MODELS_DIR/logs"
mkdir -p "$LOG_DIR"

port_in_use() {
  # A server that already answers /v1/models is the one we want to keep.
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/v1/models"
}

wait_ready() {
  # The model may fail to load (a missing GGUF key, a wrong file). Do not
  # report success until the server actually answers.
  local port="$1" label="$2" log="$3" i
  for i in $(seq 1 30); do
    sleep 1
    if port_in_use "$port"; then
      echo "  $label is up on port $port"
      return 0
    fi
  done
  echo "  $label did NOT come up on port $port" >&2
  if [ -f "$log" ]; then
    echo "  --- last lines of the log ---" >&2
    tail -n 15 "$log" | sed 's/^/  /' >&2
  fi
  return 1
}

echo "Starting the model servers..."

if port_in_use "$CHAT_PORT"; then
  echo "  chat       already running on port $CHAT_PORT - left alone"
else
  "$LLAMA_SERVER" \
    -m "$MODELS_DIR/$CHAT_MODEL" \
    # Bind every interface: a container reaches the host through the Docker
    # gateway, not through 127.0.0.1.
    --host 0.0.0.0 \
    --port "$CHAT_PORT" \
    --ctx-size "$CONTEXT_SIZE" \
    --threads "$THREADS" \
    --alias local-chat \
    >"$LOG_DIR/llama-chat.log" 2>&1 &
  echo "  chat       pid $!       -> http://localhost:$CHAT_PORT/v1"
  wait_ready "$CHAT_PORT" chat "$LOG_DIR/llama-chat.log" || true
fi

if port_in_use "$EMBEDDING_PORT"; then
  echo "  embeddings already running on port $EMBEDDING_PORT - left alone"
else
  "$LLAMA_SERVER" \
    -m "$MODELS_DIR/$EMBEDDING_MODEL" \
    --host 0.0.0.0 \
    --port "$EMBEDDING_PORT" \
    --threads "$THREADS" \
    --embedding \
    --pooling mean \
    --alias multilingual-e5-small \
    >"$LOG_DIR/llama-embeddings.log" 2>&1 &
  echo "  embeddings pid $!  -> http://localhost:$EMBEDDING_PORT/v1"
  wait_ready "$EMBEDDING_PORT" embeddings "$LOG_DIR/llama-embeddings.log" || true
fi

echo ""
echo "  chat       -> http://localhost:$CHAT_PORT/v1"
echo "  embeddings -> http://localhost:$EMBEDDING_PORT/v1"
echo ""
echo "The AI service (inside Docker) reaches them at:"
echo "  AI_LOCAL_LLM_BASE_URL=http://host.docker.internal:$CHAT_PORT/v1"
echo "  AI_EMBEDDING_BASE_URL=http://host.docker.internal:$EMBEDDING_PORT/v1"
echo ""
echo "Logs: $LOG_DIR"
echo "Stop both with:  pkill -f llama-server"
