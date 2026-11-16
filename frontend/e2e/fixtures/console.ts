import type {Page} from '@playwright/test';
import {KNOWN_NOISE} from '../generated/known-noise';

export interface ConsoleCollector {
  /** Console errors, page errors and >=400 responses (excluding /_next/), noise-filtered. */
  readonly problems: string[];
}

const isNoise = (text: string): boolean => KNOWN_NOISE.some((re) => re.test(text));

/** Attach collectors to a page; call once per page. */
export function collectConsole(page: Page): ConsoleCollector {
  const problems: string[] = [];
  const add = (text: string): void => {
    if (!isNoise(text)) problems.push(text);
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') add(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => add(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && !url.includes('/_next/')) {
      add(`HTTP ${res.status()} ${res.request().method()} ${url}`);
    }
  });

  return {problems};
}
