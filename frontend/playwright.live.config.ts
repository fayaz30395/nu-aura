import baseConfig from './playwright.config';
import {defineConfig} from '@playwright/test';

export default defineConfig({
  ...baseConfig,
  webServer: undefined,
  use: {
    ...baseConfig.use,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002',
  },
});
