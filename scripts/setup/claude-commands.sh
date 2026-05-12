#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Claude Code Aliases: Personal (subscription) vs Work (Vertex)
#
# SETUP (run once):
#   1. claude config set apiProvider ""    ← clears any stuck config
#   2. Add to your ~/.zshrc:
#      source ~/IdeaProjects/nulogic/nu-aura/claude-commands.sh
#   3. source ~/.zshrc
# ──────────────────────────────────────────────────────────────

# ── claude-personal ──────────────────────────────────────────
# Uses your personal Anthropic subscription (claude.ai Max/Pro)
# Explicitly sets CLAUDE_CODE_USE_VERTEX=0 to override any
# lingering internal config.
claude-personal() {
  echo "🔵 Claude Code — Personal Subscription"
  CLAUDE_CODE_USE_VERTEX=0 \
  CLAUDE_CODE_USE_BEDROCK=0 \
  env -u CLAUDE_API_KEY \
      -u ANTHROPIC_API_KEY \
      -u ANTHROPIC_VERTEX_PROJECT_ID \
      -u ANTHROPIC_VERTEX_REGION \
      -u CLOUD_ML_REGION \
      claude "$@"
}

# ── claude-work ──────────────────────────────────────────────
# Uses Google Cloud Vertex AI (billed to your org)
# Requires: gcloud CLI authenticated + project access
#
# UPDATE THESE VALUES with your actual org settings:
#   ANTHROPIC_VERTEX_PROJECT_ID → your GCP project ID
#   CLOUD_ML_REGION             → your Vertex AI region
claude-work() {
  echo "🟢 Claude Code — Vertex AI (Org Billing)"
  CLAUDE_CODE_USE_VERTEX=1 \
  ANTHROPIC_VERTEX_PROJECT_ID="${ANTHROPIC_VERTEX_PROJECT_ID:-your-gcp-project-id}" \
  CLOUD_ML_REGION="${CLOUD_ML_REGION:-us-east5}" \
  claude "$@"
}

# ── Aliases (shorter) ───────────────────────────────────────
alias cp-claude='claude-personal'
alias cw-claude='claude-work'
