#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Claude Code Aliases: Personal (subscription) vs Work (Vertex)
#
# Add this to your ~/.zshrc (or ~/.bashrc):
#   source ~/IdeaProjects/nulogic/nu-aura/claude-commands.sh
#
# Or copy the two functions below directly into your shell RC.
# ──────────────────────────────────────────────────────────────

# ── claude-personal ──────────────────────────────────────────
# Uses your personal Anthropic subscription (claude.ai Pro/Team)
# No API key needed — authenticates via your logged-in account
claude-personal() {
  echo "🔵 Claude Code — Personal Subscription"
  env -u CLAUDE_API_KEY \
      -u ANTHROPIC_API_KEY \
      -u CLAUDE_CODE_USE_BEDROCK \
      -u CLAUDE_CODE_USE_VERTEX \
      -u CLOUD_ML_REGION \
      -u ANTHROPIC_VERTEX_PROJECT_ID \
      -u ANTHROPIC_VERTEX_REGION \
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
  ANTHROPIC_VERTEX_PROJECT_ID="${ANTHROPIC_VERTEX_PROJECT_ID:-sep-devqa-martech-ai}" \
  CLOUD_ML_REGION="${CLOUD_ML_REGION:-global}" \
  claude "$@"
}

# ── Aliases (shorter) ───────────────────────────────────────
alias cp-claude='claude-personal'
alias cw-claude='claude-work'