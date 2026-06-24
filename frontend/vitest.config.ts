import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const strictCoverage = process.env.COVERAGE_100 === 'true';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: strictCoverage,
      include: strictCoverage
        ? [
          'app/**/*.{ts,tsx}',
          'components/**/*.{ts,tsx}',
          'hooks/**/*.{ts,tsx}',
          'lib/**/*.{ts,tsx}',
        ]
        : undefined,
      exclude: [
        'node_modules/',
        'e2e/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/__tests__/**',
        '**/*.config.*',
        '**/generated/**',
        'scripts/**',
        'tmp/**',
        '**/types/**',
      ],
      thresholds: strictCoverage
        ? {
          100: true,
          perFile: true,
        }
        : {
          statements: 60,
          branches: 60,
          functions: 60,
          lines: 60,
        },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
