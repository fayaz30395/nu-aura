import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const css = readFileSync(join(__dirname, '../../../app/globals.css'), 'utf8');

function hexToTriplet(hex: string): string {
  const h = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}

// Each `--x-rgb` triplet must equal the most recent `--x: #hex` declared above it
// (light and dark blocks each redeclare both).
function collectPairs(): Array<{name: string; hex: string; rgb: string; line: number}> {
  const lastHex = new Map<string, string>();
  const pairs: Array<{name: string; hex: string; rgb: string; line: number}> = [];
  css.split('\n').forEach((raw, i) => {
    const hex = raw.match(/^\s*--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/);
    if (hex) lastHex.set(hex[1], hex[2].toLowerCase());
    const rgb = raw.match(/^\s*--([a-z0-9-]+)-rgb:\s*(\d+ \d+ \d+)\s*;/);
    if (rgb) {
      const base = lastHex.get(rgb[1]);
      pairs.push({name: rgb[1], hex: base ?? '(missing)', rgb: rgb[2], line: i + 1});
    }
  });
  return pairs;
}

describe('globals.css colour tokens', () => {
  const pairs = collectPairs();

  it('declares rgb triplets for the accent, brand scale and product colours', () => {
    const names = new Set(pairs.map((p) => p.name));
    for (const n of ['accent', 'accent-hover', 'aura-accent-500', 'prod-hrms', 'prod-hire', 'prod-grow', 'prod-fluence']) {
      expect(names.has(n), n).toBe(true);
    }
  });

  it.each(collectPairs())('--$name-rgb (line $line) matches its hex', ({hex, rgb}) => {
    expect(hex).not.toBe('(missing)');
    expect(rgb).toBe(hexToTriplet(hex));
  });
});
