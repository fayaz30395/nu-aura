#!/usr/bin/env node
/**
 * Claude Flow Session Manager
 * Handles session lifecycle: start, restore, end
 */

const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(process.cwd(), '.claude-flow', 'sessions');
const SESSION_FILE = path.join(SESSION_DIR, 'current.json');

// Atomic write: concurrent hook processes write this file; a plain
// writeFileSync interleaves and produces torn/corrupt JSON. Write to a
// pid-unique temp file and rename (rename is atomic on POSIX).
function atomicWriteSession(data) {
  fs.mkdirSync(SESSION_DIR, {recursive: true});
  const tmp = `${SESSION_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, SESSION_FILE);
}

// Safe read: a corrupt session file must never crash a hook. Quarantine
// the corrupt file (for diagnosis) and return null so callers start fresh.
function readSession() {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  } catch {
    try {
      fs.renameSync(SESSION_FILE, `${SESSION_FILE}.corrupt-${Date.now()}`);
    } catch { /* best effort */
    }
    return null;
  }
}

const commands = {
  start: () => {
    const sessionId = `session-${Date.now()}`;
    const session = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      cwd: process.cwd(),
      context: {},
      metrics: {
        edits: 0,
        commands: 0,
        tasks: 0,
        errors: 0,
      },
    };

    atomicWriteSession(session);

    console.log(`Session started: ${sessionId}`);
    return session;
  },

  restore: () => {
    const session = readSession();
    if (!session) {
      console.log('No session to restore');
      return null;
    }

    session.restoredAt = new Date().toISOString();
    atomicWriteSession(session);

    console.log(`Session restored: ${session.id}`);
    return session;
  },

  end: () => {
    const session = readSession();
    if (!session) {
      console.log('No active session');
      return null;
    }

    session.endedAt = new Date().toISOString();
    session.duration = Date.now() - new Date(session.startedAt).getTime();

    // Archive session
    const archivePath = path.join(SESSION_DIR, `${session.id}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(session, null, 2));
    fs.unlinkSync(SESSION_FILE);

    console.log(`Session ended: ${session.id}`);
    console.log(`Duration: ${Math.round(session.duration / 1000 / 60)} minutes`);
    console.log(`Metrics: ${JSON.stringify(session.metrics)}`);

    return session;
  },

  status: () => {
    const session = readSession();
    if (!session) {
      console.log('No active session');
      return null;
    }

    const duration = Date.now() - new Date(session.startedAt).getTime();

    console.log(`Session: ${session.id}`);
    console.log(`Started: ${session.startedAt}`);
    console.log(`Duration: ${Math.round(duration / 1000 / 60)} minutes`);
    console.log(`Metrics: ${JSON.stringify(session.metrics)}`);

    return session;
  },

  update: (key, value) => {
    const session = readSession();
    if (!session) {
      console.log('No active session');
      return null;
    }

    if (!session.context) session.context = {};
    session.context[key] = value;
    session.updatedAt = new Date().toISOString();
    atomicWriteSession(session);

    return session;
  },

  get: (key) => {
    const session = readSession();
    if (!session) return null;
    return key ? (session.context || {})[key] : session.context;
  },

  metric: (name) => {
    const session = readSession();
    if (!session) return null;

    if (session.metrics && session.metrics[name] !== undefined) {
      session.metrics[name]++;
      atomicWriteSession(session);
    }

    return session;
  },
};

// CLI
const [, , command, ...args] = process.argv;

if (command && commands[command]) {
  commands[command](...args);
} else {
  console.log('Usage: session.js <start|restore|end|status|update|metric> [args]');
}

module.exports = commands;
