#!/usr/bin/env bash
#
# Teams webhook notification test
# Posts an Adaptive Card "Notification Alert" to a Microsoft Teams channel
# via a Power Automate "Post card in a chat or channel" workflow.
#
# Usage:
#   ./scripts/teams-webhook-test.sh
#   ./scripts/teams-webhook-test.sh <runId> <campaignId> <date> <appName>
#
# Examples:
#   ./scripts/teams-webhook-test.sh
#   ./scripts/teams-webhook-test.sh 8464 4QM0LEwHFbDqK2Taf9Rh8q "2026-04-10 04:47:28" "Million-Mind"
#
# Override the webhook with the TEAMS_WEBHOOK_URL env var.
#
set -euo pipefail

TEAMS_WEBHOOK_URL="${TEAMS_WEBHOOK_URL:-https://default7d1f4f5f8f6348d886e18b8f63f16b.ae.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9b00c214dac44b6faf5f4b786021e4ea/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=IEO8p0S0bCclcOnDJJ7Eq2cgBuf43fDSugRe-OHzEls}"

RUN_ID="${1:-8464}"
CAMPAIGN_ID="${2:-4QM0LEwHFbDqK2Taf9Rh8q}"
DATE="${3:-2026-04-10 04:47:28}"
APP_NAME="${4:-Million-Mind}n"

read -r -d '' PAYLOAD <<JSON || true
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
          { "type": "TextBlock", "text": "🔔 Notification Alert (QA)", "size": "Large", "weight": "Bolder", "color": "Attention", "wrap": true },
          { "type": "TextBlock", "text": "✅ SUCCESS: Task Completed", "weight": "Bolder", "color": "Good", "wrap": true, "spacing": "Medium" },
          { "type": "TextBlock", "text": "🔷 **Application:** ${APP_NAME}", "weight": "Bolder", "color": "Accent", "wrap": true, "spacing": "Medium" },
          {
            "type": "FactSet",
            "spacing": "Medium",
            "facts": [
              { "title": "Id:", "value": "RunId: ${RUN_ID}" },
              { "title": "😊 Message:", "value": "CampaignId: ${CAMPAIGN_ID}" },
              { "title": "📝 Date:", "value": "${DATE}" }
            ]
          }
        ]
      }
    }
  ]
}
JSON

curl -sS -w "\n---HTTP_STATUS:%{http_code}---\n" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$TEAMS_WEBHOOK_URL"
