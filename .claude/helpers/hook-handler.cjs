#!/usr/bin/env node
/**
 * Claude Flow Hook Handler (Cross-Platform)
 * Dispatches hook events to the appropriate helper modules.
 *
 * Usage: node hook-handler.cjs <command> [args...]
 *
 * Commands:
 *   route          - Route a task to optimal agent (reads PROMPT from env/stdin)
 *   pre-bash       - Validate command safety before execution
 *   post-edit      - Record edit outcome for learning
 *   session-restore - Restore previous session state
 *   session-end    - End session and persist state
 *
 * Output contract (Claude Code hook JSON schema):
 *   - stdout carries ONLY a single JSON object per the official hook output
 *     schema (systemMessage / continue / suppressOutput / decision / reason /
 *     hookSpecificOutput.{hookEventName, additionalContext,
 *     permissionDecision, permissionDecisionReason, updatedInput}) — or
 *     nothing at all.
 *   - All diagnostics go to stderr.
 *   - Exit code is always 0; errors must never block Claude Code.
 */

const path = require('path');
const fs = require('fs');

const helpersDir = __dirname;

// Context-budget cap for additionalContext injected per event.
const MAX_CONTEXT_CHARS = 420;
const DRY_RUN = process.env.CLAUDE_HOOK_DRY_RUN === '1';

function emitJSON(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

// Emit context back to Claude Code as schema-valid hook JSON.
// Only `hookEventName` + `additionalContext` are allowed here — no custom fields.
function emitAdditionalContext(hookEventName, context) {
  if (!context) return;
  const trimmed = String(context).trim();
  if (!trimmed) return;
  // Keep hook context small to prevent context-window overflows.
  const trimmedLines = trimmed.split('\n').filter(Boolean).slice(0, 5);
  const compacted = trimmedLines.join('\n');
  const capped = compacted.length > MAX_CONTEXT_CHARS
    ? `${compacted.slice(0, MAX_CONTEXT_CHARS)}…`
    : compacted;
  emitJSON({continue: true, hookSpecificOutput: {hookEventName, additionalContext: capped}});
}

function warn(message) {
  process.stderr.write(`[WARN] ${message}\n`);
}

function withMutedConsole(fn) {
  const origStdoutWrite = process.stdout.write;
  const origStderrWrite = process.stderr.write;
  const orig = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };
  const noop = () => {};
  console.log = noop;
  console.error = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  process.stdout.write = noop;
  process.stderr.write = noop;
  try {
    return fn();
  } finally {
    console.log = orig.log;
    console.error = orig.error;
    console.warn = orig.warn;
    console.info = orig.info;
    console.debug = orig.debug;
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
  }
}

// Safe require with stdout suppression - the helper modules have CLI
// sections that run unconditionally on require(), so we mute console
// during the require to prevent noisy output.
function safeRequire(modulePath) {
  try {
    if (fs.existsSync(modulePath)) {
      return withMutedConsole(() => require(modulePath));
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

const router = safeRequire(path.join(helpersDir, 'router.js'));
const session = safeRequire(path.join(helpersDir, 'session.js'));
const memory = safeRequire(path.join(helpersDir, 'memory.js'));
const intelligence = safeRequire(path.join(helpersDir, 'intelligence.cjs'));

// ── Intelligence timeout protection (fixes #1530, #1531) ───────────────────
const INTELLIGENCE_TIMEOUT_MS = 3000;

function emitPreToolUseDecision(permissionDecision, details = {}) {
  const hookSpecificOutput = {
    hookEventName: 'PreToolUse',
    permissionDecision,
  };

  if (details.reason) {
    hookSpecificOutput.permissionDecisionReason = details.reason;
  }
  emitJSON({hookSpecificOutput});
}

function readToolCommand(hookInput, toolInput, args) {
  const command =
    hookInput.command ||
    (toolInput && typeof toolInput === 'object' ? toolInput.command : undefined) ||
    (typeof hookInput.prompt === 'string' ? hookInput.prompt : undefined) ||
    process.env.TOOL_INPUT_command ||
    args.join(' ');

  return typeof command === 'string' ? command : JSON.stringify(command || '');
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function readPrompt(hookInput, toolInput, args) {
  const fromHook = firstString(
    hookInput.prompt,
    hookInput.command,
    hookInput.description,
    hookInput.message,
    hookInput.task,
  );
  if (fromHook) return fromHook;

  if (toolInput && typeof toolInput === 'object') {
    const fromTool = firstString(
      toolInput.prompt,
      toolInput.command,
      toolInput.description,
      toolInput.message,
      toolInput.task,
    );
    if (fromTool) return fromTool;
  }

  const fromEnv = firstString(process.env.PROMPT, process.env.TOOL_INPUT_command);
  if (fromEnv) return fromEnv;

  const fromArgs = args.join(' ').trim();
  if (fromArgs) return fromArgs;

  return '';
}

function runWithTimeout(fn, label) {
  // For synchronous blocking calls, we use a global safety timer.
  // The readJSON file-size guard prevents loading huge files, but this
  // is an additional safety net.
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      warn(`${label} timed out after ${INTELLIGENCE_TIMEOUT_MS}ms, skipping`);
      resolve(null);
    }, INTELLIGENCE_TIMEOUT_MS);
    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (e) {
      clearTimeout(timer);
      resolve(null);
    }
  });
}


// Get the command from argv
const [, , command, ...args] = process.argv;

// Read stdin with timeout — Claude Code sends hook data as JSON via stdin.
// Timeout prevents hanging when stdin is not properly closed (common on Windows).
async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(data);
    }, 500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}

async function main() {
  // Global safety timeout: hooks must NEVER hang (#1530, #1531)
  const safetyTimer = setTimeout(() => {
    warn('Hook handler global timeout (5s), forcing exit');
    process.exit(0);
  }, 5000);
  safetyTimer.unref(); // don't keep process alive just for this timer

  let stdinData = '';
  try {
    stdinData = await readStdin();
  } catch (e) { /* ignore stdin errors */
  }

  let hookInput = {};
  if (stdinData.trim()) {
    try {
      hookInput = JSON.parse(stdinData);
    } catch (e) { /* ignore parse errors */
    }
  }

  // Normalize snake_case/camelCase: Claude Code sends tool_input/tool_name (snake_case)
  const toolInput = hookInput.toolInput || hookInput.tool_input || {};
  const toolName = hookInput.toolName || hookInput.tool_name || '';

  // Merge stdin data into prompt resolution: prefer stdin fields, then env, then argv
  const prompt = readPrompt(hookInput, toolInput, args);

  const handlers = {
    'route': () => {
      if (DRY_RUN) {
        emitJSON({continue: true});
        return;
      }
      if (!prompt) {
        emitJSON({continue: true});
        return;
      } // nothing to route, nothing to inject

      // Ranked intelligence context (multi-line text) — inject as
      // schema-valid additionalContext, capped for context budget.
      let intelligenceContext = '';
      if (intelligence && intelligence.getContext) {
        try {
          intelligenceContext = withMutedConsole(() => intelligence.getContext(prompt)) || '';
        } catch (e) { /* non-fatal */
        }
      }

      let routingLine = '';
      if (router && router.routeTask) {
        try {
          const result = withMutedConsole(() => router.routeTask(prompt));
          routingLine = `Suggested agent: ${result.agent} (confidence ${(result.confidence * 100).toFixed(0)}%, ${result.reason})`;
        } catch (e) { /* non-fatal */
        }
      }

      const context = [intelligenceContext, routingLine].filter(Boolean).join('\n');
      if (context) {
        emitAdditionalContext('UserPromptSubmit', context);
      } else {
        emitJSON({continue: true});
      }
    },

    'pre-bash': () => {
      // Basic command safety check — prefer stdin command data from Claude Code
      const cmd = readToolCommand(hookInput, toolInput, args).toLowerCase();
      const dangerous = ['rm -rf /', 'format c:', 'del /s /q c:\\', ':(){:|:&};:'];
      for (const d of dangerous) {
        if (cmd.includes(d)) {
          emitPreToolUseDecision('deny', {
            reason: `Dangerous command detected: ${d}`,
          });
          return;
        }
      }
      emitPreToolUseDecision('allow');
    },

    'pre-edit': () => {
      emitPreToolUseDecision('allow');
    },

    'post-edit': () => {
      if (DRY_RUN) return;
      // Record edit for session metrics
      if (session && session.metric) {
        try {
          withMutedConsole(() => session.metric('edits'));
        } catch (e) { /* no active session */
        }
      }
      // Record edit for intelligence consolidation — prefer stdin data from Claude Code
      if (intelligence && intelligence.recordEdit) {
        try {
          const file = hookInput.file_path || toolInput.file_path
            || process.env.TOOL_INPUT_file_path || args[0] || '';
          withMutedConsole(() => intelligence.recordEdit(file));
        } catch (e) { /* non-fatal */
        }
      }
      // No stdout: bookkeeping only.
    },

    'session-restore': async () => {
      if (DRY_RUN) {
        emitJSON({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: 'SessionStart: dry-run (session restore skipped)',
          },
        });
        return;
      }

      let sessionStatus = 'started';
      let sessionId;
      // session.js / intelligence print human-readable logs; hook stdout
      // must stay clean, so everything runs with console muted.
      withMutedConsole(() => {
        if (session) {
          // Try restore first, fall back to start.
          const existing = session.restore && session.restore();
          if (existing) {
            sessionStatus = 'restored';
            sessionId = existing.id;
            return;
          }
          const started = session.start && session.start();
          sessionStatus = 'started';
          sessionId = started?.id;
        }
      });

      // Initialize intelligence graph after session restore (with timeout — #1530)
      if (intelligence && intelligence.init) {
        await runWithTimeout(() => withMutedConsole(() => intelligence.init()), 'intelligence.init()');
      }
      emitJSON({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: `SessionStart: ${sessionStatus}${sessionId ? ` ${sessionId}` : ''}`,
        },
      });
    },

    'session-end': async () => {
      if (DRY_RUN) {
        emitJSON({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'SessionEnd',
            additionalContext: 'SessionEnd: dry-run (session finalization skipped)',
          },
        });
        return;
      }
      // Consolidate intelligence before ending session (with timeout — #1530)
      if (intelligence && intelligence.consolidate) {
        await runWithTimeout(() => withMutedConsole(() => intelligence.consolidate()), 'intelligence.consolidate()');
      }
      if (session && session.end) {
        try {
          withMutedConsole(() => session.end());
        } catch (e) { /* no active session */
        }
      }
      // No stdout: bookkeeping only.
    },

    'pre-task': () => {
      if (DRY_RUN) return;
      if (session && session.metric) {
        try {
          withMutedConsole(() => session.metric('tasks'));
        } catch (e) { /* no active session */
        }
      }
      // No stdout: bookkeeping only.
    },

    'post-bash': () => {
      if (DRY_RUN) return;
      // Record command for session metrics (PostToolUse:Bash)
      if (session && session.metric) {
        try {
          withMutedConsole(() => session.metric('commands'));
        } catch (e) { /* no active session */
        }
      }
      // No stdout: bookkeeping only.
    },

    'post-task': () => {
      if (DRY_RUN) return;
      // Implicit success feedback for intelligence
      if (intelligence && intelligence.feedback) {
        try {
          withMutedConsole(() => intelligence.feedback(true));
        } catch (e) { /* non-fatal */
        }
      }
      // No stdout: bookkeeping only.
    },

    // Manual CLI command (not wired to any hook event) — human output is fine here.
    'stats': () => {
      if (intelligence && intelligence.stats) {
        intelligence.stats(args.includes('--json'));
      } else {
        warn('Intelligence module not available. Run session-restore first.');
      }
    },

    // Aliases used by settings.json for events that are bookkeeping-only.
    'status': () => { /* no-op heartbeat for SubagentStart */
    },
    'notify': () => { /* no-op for Notification */
    },
    'compact-manual': () => { /* no-op for PreCompact(manual) */
    },
    'compact-auto': () => { /* no-op for PreCompact(auto) */
    },
  };

  // Execute the handler
  if (command && handlers[command]) {
    try {
      await Promise.resolve(handlers[command]());
    } catch (e) {
      // Hooks must never crash or block Claude Code: report on stderr only.
      warn(`Hook ${command} encountered an error: ${e.message}`);
    }
  } else if (command) {
    // Unknown command — pass through silently (stderr note for debugging).
    warn(`Unknown hook command: ${command}`);
  } else {
    process.stderr.write('Usage: hook-handler.cjs <route|pre-bash|pre-edit|post-edit|session-restore|session-end|pre-task|post-task|stats>\n');
  }
}

// Hooks must ALWAYS exit 0 — Claude Code treats non-zero as "hook error"
// and skips all subsequent hooks for the event.
process.exitCode = 0;
main().catch((e) => {
  try {
    warn(`Hook handler error: ${e.message}`);
  } catch (_) {
  }
}).finally(() => {
  process.exit(0);
});
