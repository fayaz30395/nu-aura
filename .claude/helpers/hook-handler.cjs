#!/usr/bin/env node
/**
 * hook-handler.cjs — Central dispatch for all Claude Code hook events.
 *
 * Delegates intelligence work to intelligence.cjs; always exits 0 so
 * Claude never blocks on a hook failure.
 *
 * Rules:
 *   - stdout must be valid JSON schema or empty (stderr for logging)
 *   - Always exit 0 (allow) — never block the user
 *   - Stay within the timeout declared in settings.json
 */

'use strict';

const path = require('path');
const fs = require('fs');

const CMD = process.argv[2] || '';
const isHookJSON = process.env.CLAUDE_HOOK_JSON === '1';

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  process.stderr.write('[hook-handler] ' + msg + '\n');
}

function readStdin() {
  try {
    return fs.readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return '';
  }
}

function parseStdin() {
  try {
    const raw = readStdin();
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Lazy-load intelligence to avoid crashing if the file has errors
let intel = null;
function getIntel() {
  if (intel) return intel;
  try {
    intel = require(path.join(__dirname, 'intelligence.cjs'));
  } catch (e) {
    log('intelligence.cjs unavailable: ' + e.message);
    intel = {};
  }
  return intel;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function handlePreBash() {
  // Allow all bash commands — fast pass-through
  process.exit(0);
}

function handlePreEdit() {
  // Allow all edits — fast pass-through
  process.exit(0);
}

function handlePostEdit() {
  const input = parseStdin();
  const filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || 'unknown';
  try {
    const i = getIntel();
    if (i.recordEdit) i.recordEdit(filePath);
  } catch (e) {
    log('post-edit recordEdit failed: ' + e.message);
  }
  process.exit(0);
}

function handlePostBash() {
  // Nothing to do after bash — fast exit
  process.exit(0);
}

function handleRoute() {
  // UserPromptSubmit — inject intelligence context if available
  const input = parseStdin();
  const prompt = (input.user_message && input.user_message.content) ||
    (input.tool_input && input.tool_input.prompt) || '';

  try {
    const i = getIntel();
    if (i.getContext && prompt) {
      const ctx = i.getContext(prompt);
      if (ctx) {
        // Output additionalContext for UserPromptSubmit hook
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'UserPromptSubmit',
            suppressOutput: false,
            additionalContext: ctx,
          },
        }));
      }
    }
  } catch (e) {
    log('route getContext failed: ' + e.message);
  }
  process.exit(0);
}

function handleSessionRestore() {
  try {
    const i = getIntel();
    if (i.init) {
      const result = i.init();
      log('session-restore: ' + JSON.stringify(result));
    }
  } catch (e) {
    log('session-restore init failed: ' + e.message);
  }
  process.exit(0);
}

function handleSessionEnd() {
  try {
    const i = getIntel();
    if (i.consolidate) {
      const result = i.consolidate();
      log('session-end: ' + JSON.stringify(result));
    }
  } catch (e) {
    log('session-end consolidate failed: ' + e.message);
  }
  process.exit(0);
}

function handlePostTask() {
  // SubagentStop — provide positive feedback for matched patterns
  try {
    const i = getIntel();
    if (i.feedback) i.feedback(true);
  } catch (e) {
    log('post-task feedback failed: ' + e.message);
  }
  process.exit(0);
}

function handleStatus() {
  // SubagentStart — nothing needed, fast exit
  process.exit(0);
}

function handleNotify() {
  // Notification hook — nothing needed
  process.exit(0);
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

switch (CMD) {
  case 'pre-bash':       handlePreBash(); break;
  case 'pre-edit':       handlePreEdit(); break;
  case 'post-edit':      handlePostEdit(); break;
  case 'post-bash':      handlePostBash(); break;
  case 'route':          handleRoute(); break;
  case 'session-restore': handleSessionRestore(); break;
  case 'session-end':    handleSessionEnd(); break;
  case 'compact-manual': handleSessionEnd(); break;   // same as session-end
  case 'compact-auto':   handleSessionEnd(); break;   // same as session-end
  case 'post-task':      handlePostTask(); break;
  case 'status':         handleStatus(); break;
  case 'notify':         handleNotify(); break;
  default:
    log('unknown command: ' + CMD);
    process.exit(0); // always allow
}
