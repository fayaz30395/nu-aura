// Next.js Edge Middleware entry point.
// Implementation lives in proxy.ts to allow isolated unit testing.
// Renamed from middleware.ts → proxy.ts in ce622c04; this shim restores
// Next.js middleware recognition without moving the implementation.
export { proxy as middleware, config } from './proxy';
