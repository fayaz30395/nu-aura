import {test as baseTest, expect} from '@playwright/test';
import {collectConsole} from './console';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
/** Where `backend:8080` XHRs are sent; derived from NEXT_PUBLIC_API_URL. */
const API_ORIGIN = new URL(API_BASE).origin;

interface BaseOptions {
  /** Max tolerated console problems per test. Default 0; override with the defect id in a comment. */
  consoleBudget: number;
}

/**
 * Project `test`: reroutes `http://backend:8080/` to the real API origin (so it keeps
 * working when .env points at the docker hostname) and enforces a console-error budget.
 * WebSocket cannot be rerouted; known-noise.ts filters /websocket/i.
 */
export const test = baseTest.extend<BaseOptions>({
  consoleBudget: [0, {option: true}],

  context: async ({context}, use) => {
    await context.route(/^http:\/\/backend:8080\//, (route) =>
      route.continue({url: route.request().url().replace('http://backend:8080', API_ORIGIN)}),
    );
    await use(context);
  },

  page: async ({page, consoleBudget}, use) => {
    const collector = collectConsole(page);
    await use(page);
    expect(
      collector.problems.length,
      `console/network problems over budget ${consoleBudget}:\n${collector.problems.join('\n')}`,
    ).toBeLessThanOrEqual(consoleBudget);
  },
});

export {expect};
