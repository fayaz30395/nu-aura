# Runs ONE Claude agent fully isolated from the host.
#
# The orchestrator launches this with only /work mounted — the host repo is
# never mounted, so an agent physically cannot touch your working tree on ANY
# platform (Linux / Windows / macOS). This is the cross-platform equivalent of
# the macOS sandbox-exec guarantee.
#
# Build:   docker build -f scripts/agent.Dockerfile -t nu-agent-os:latest .
# Use:     ORCH_SANDBOX=docker ANTHROPIC_API_KEY=sk-... node scripts/orchestrator-os-server.js
#          (the server runs: docker run --rm -v <worktree>:/work -w /work \
#                                  -e ANTHROPIC_API_KEY nu-agent-os:latest claude ...)
#
# Auth (no API key / no extra cost): your macOS Keychain login can't be mounted,
# but you can mint a SUBSCRIPTION OAuth token for headless use:
#     claude setup-token            # interactive, free, uses your existing plan
#     ORCH_SANDBOX=docker CLAUDE_CODE_OAUTH_TOKEN=<token> node scripts/orchestrator-os-server.js
# (ANTHROPIC_API_KEY also works if you have one.) On macOS you usually don't need
# Docker at all — leave ORCH_SANDBOX unset and the server uses sandbox-exec, which
# already runs under your subscription with a hard guarantee.
FROM node:20-alpine
RUN apk add --no-cache git \
 && npm install -g @anthropic-ai/claude-code
WORKDIR /work
ENTRYPOINT []
