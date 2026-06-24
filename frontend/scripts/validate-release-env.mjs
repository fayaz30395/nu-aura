#!/usr/bin/env node

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const allowInsecureApiUrl = process.env.ALLOW_INSECURE_RELEASE_API_URL === 'true';

function isLoopbackUrl(value) {
  try {
    const {hostname} = new URL(value);
    const normalized = hostname.toLowerCase();
    return normalized === 'localhost'
      || normalized === '::1'
      || normalized === '[::1]'
      || normalized === '0.0.0.0'
      || normalized.startsWith('127.');
  } catch {
    return false;
  }
}

function isPlaceholderUrl(value) {
  try {
    const {hostname} = new URL(value);
    const normalized = hostname.toLowerCase();
    return normalized.endsWith('.example')
      || normalized.includes('example.com')
      || normalized.includes('your-domain')
      || normalized.includes('yourdomain');
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`Release environment validation failed: ${message}`);
  process.exit(1);
}

if (!apiUrl) {
  fail('NEXT_PUBLIC_API_URL is required for production builds.');
}

try {
  new URL(apiUrl);
} catch {
  fail('NEXT_PUBLIC_API_URL must be a valid URL.');
}

const parsedApiUrl = new URL(apiUrl);

if (isLoopbackUrl(apiUrl) && !allowInsecureApiUrl) {
  fail('NEXT_PUBLIC_API_URL must point to the deployed API, not localhost or loopback. Set ALLOW_INSECURE_RELEASE_API_URL=true only for local/CI production smoke tests.');
}

if (isPlaceholderUrl(apiUrl)) {
  fail('NEXT_PUBLIC_API_URL must point to the real deployed API, not an example or placeholder domain.');
}

if (parsedApiUrl.protocol !== 'https:' && !allowInsecureApiUrl) {
  fail('NEXT_PUBLIC_API_URL must use HTTPS for release builds. Set ALLOW_INSECURE_RELEASE_API_URL=true only for local production smoke tests.');
}
