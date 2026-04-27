/**
 * Console-error patterns we deliberately ignore in route-smoke tests.
 *
 * Smoke tests assert that a page renders without uncaught exceptions or real
 * console errors. The patterns below are noise — either browser quirks under
 * parallel load (ERR_NETWORK_IO_SUSPENDED, MIME false-positives) or transport
 * signals from the API layer that have their own dedicated test suites
 * (Failed to load resource, ApiClient errors). Filtering them keeps the smoke
 * gate signal-only.
 *
 * To add a pattern: append a regex that matches the *full* console message.
 * To remove a filter: prefer that over weakening a test assertion.
 */
export const KNOWN_NOISE: RegExp[] = [
  /\[HMR\]/i,
  /Download the React DevTools/i,
  /\bSourceMapConsumer\b/,
  /\[Fast Refresh\]/i,
  /websocket/i,

  // Browser strict-MIME false-positive when Next.js prefetches CSS via
  // <link rel="preload" as="script">. The CSS still loads via <link rel="stylesheet">.
  /Refused to execute script from .*\.css.*MIME type \('text\/css'\)/i,

  // Backend 4xx/5xx and ApiClient errors are page-data signals, not "page broken"
  // signals. Smoke just verifies the route renders; the API contract is owned
  // by the API test suites (mvn test, integration tests).
  /Failed to load resource: the server responded with a status of \d+/i,
  /\[ApiClient\] Error:/i,

  // Chromium suspends in-flight requests under heavy parallel load — pure
  // test-environment artifact, not a real failure.
  /Failed to load resource: net::ERR_NETWORK_IO_SUSPENDED/i,
  /Failed to load resource: net::ERR_ABORTED/i,
];

export const isNoise = (msg: string): boolean =>
  KNOWN_NOISE.some((re) => re.test(msg));
