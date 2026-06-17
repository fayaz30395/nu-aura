import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// NOTE: The 8px-grid spacing restrictions (p-3 / px-3 / py-3 / gap-3 /
// space-y-3 / space-x-3 / m-3 = 12px) were intentionally removed. NU-AURA
// ships a deliberate COMPACT, desktop-first design system (36px buttons,
// text-xs labels) where the 12px (3-unit) step is a sanctioned token, not an
// off-grid mistake. Re-flagging it forced 80+ files toward looser 16px spacing,
// which conflicts with the documented compact look. The remaining rules below
// still catch genuinely banned patterns (gradient text, side-stripe borders,
// decorative icon-tile gradients, undefined status classes, brand colors, and
// bare .toLocaleDateString()).
const restrictedSyntaxRules = [
  {
    selector: String.raw`CallExpression[callee.type='MemberExpression'][callee.property.name='toLocaleDateString']`,
    message: 'Use formatDate / formatDateTime from @/lib/utils/format/date instead of bare .toLocaleDateString(). Bare calls bypass the canonical 12-hour, MMM d, yyyy format.',
  },
  {
    selector: String.raw`Literal[value=/bg-clip-text[^"']*text-transparent|text-transparent[^"']*bg-clip-text/]`,
    message: 'Design system: gradient text (bg-clip-text + text-transparent) is banned per DESIGN.md. Use solid text-accent-600 + font-weight emphasis instead.',
  },
  {
    selector: String.raw`TemplateElement[value.raw=/bg-clip-text[^` + '`' + String.raw`]*text-transparent|text-transparent[^` + '`' + String.raw`]*bg-clip-text/]`,
    message: 'Design system: gradient text (bg-clip-text + text-transparent) is banned per DESIGN.md. Use solid text-accent-600 + font-weight emphasis instead.',
  },
  {
    selector: String.raw`Literal[value=/\bborder-l-(2|4|8)\s+border-[a-z]+-[0-9]+/]`,
    message: 'Design system: side-stripe border-l-N + border-color is banned per DESIGN.md. Use full border + tinted bg, or wrap in <Callout>.',
  },
  {
    selector: String.raw`TemplateElement[value.raw=/\bborder-l-(2|4|8)\s+border-[a-z]+-[0-9]+/]`,
    message: 'Design system: side-stripe border-l-N + border-color is banned per DESIGN.md. Use full border + tinted bg, or wrap in <Callout>.',
  },
  {
    selector: String.raw`Literal[value=/bg-gradient-to-(br|r|b|tr|tl|bl|t|l)\s+from-(accent|success|warning|danger|info)-(500|600)\s+to-(accent|success|warning|danger|info)-(700|800)/]`,
    message: 'Design system: decorative icon-tile gradients are banned per DESIGN.md. Use flat bg-X-100 dark:bg-X-500/10 + text-X-600.',
  },
  {
    selector: String.raw`TemplateElement[value.raw=/bg-gradient-to-(br|r|b|tr|tl|bl|t|l)\s+from-(accent|success|warning|danger|info)-(500|600)\s+to-(accent|success|warning|danger|info)-(700|800)/]`,
    message: 'Design system: decorative icon-tile gradients are banned per DESIGN.md. Use flat bg-X-100 dark:bg-X-500/10 + text-X-600.',
  },
  {
    selector: String.raw`Literal[value=/\bstatus-(purple|orange|pink|brown|gray|black|white)\b/]`,
    message: 'Design system: undefined .status-* class. Use one of status-success / status-danger / status-warning / status-info / status-neutral.',
  },
  {
    selector: String.raw`TemplateElement[value.raw=/\bstatus-(purple|orange|pink|brown|gray|black|white)\b/]`,
    message: 'Design system: undefined .status-* class. Use one of status-success / status-danger / status-warning / status-info / status-neutral.',
  },
  {
    selector: String.raw`Literal[value=/\bnu-(purple|red-orange)\b/]`,
    message: 'Design system: NULogic brand colors (nu-purple / nu-red-orange) are banned in product UI per DESIGN.md — they exist for the logo/brand only. Use accent or a semantic status token (--err-fg, --status-*). The logo gradient (--nu-grad-brand) is exempt.',
  },
  {
    selector: String.raw`TemplateElement[value.raw=/\bnu-(purple|red-orange)\b/]`,
    message: 'Design system: NULogic brand colors (nu-purple / nu-red-orange) are banned in product UI per DESIGN.md — they exist for the logo/brand only. Use accent or a semantic status token (--err-fg, --status-*). The logo gradient (--nu-grad-brand) is exempt.',
  },
];

const baseRules = {
  // A11y: every form control must have an associated <label> (htmlFor/id, nesting, or aria).
  // Wrapping labels (<label>Text <input/></label>) satisfy this and are NOT flagged.
  'jsx-a11y/label-has-associated-control': ['error', {assert: 'either'}],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'axios',
          message: 'Import axios only from lib/api/. Use the typed client at @/lib/api/client instead; see docs/architecture/frontend/api-layer.md for the boundary rules.',
          allowTypeImports: true,
        },
      ],
    },
  ],
  'no-restricted-syntax': ['warn', ...restrictedSyntaxRules],
  'no-console': [
    'warn',
    {
      allow: ['warn', 'error'],
    },
  ],
  'react-hooks/component-hook-factories': 'off',
  'react-hooks/config': 'off',
  'react-hooks/error-boundaries': 'off',
  // P0-2: Stale closures over tenant/currentUser/permissions are authorization bugs,
  // not style nits. Escalated from 'warn' to 'error' globally (was only 'error' in
  // lib/hooks + lib/contexts). Fix violations with useCallback/useRef or narrowing deps.
  'react-hooks/exhaustive-deps': 'error',
  'react-hooks/gating': 'off',
  'react-hooks/globals': 'off',
  'react-hooks/immutability': 'off',
  'react-hooks/incompatible-library': 'off',
  'react-hooks/preserve-manual-memoization': 'off',
  'react-hooks/purity': 'off',
  'react-hooks/refs': 'off',
  'react-hooks/set-state-in-effect': 'off',
  'react-hooks/set-state-in-render': 'off',
  'react-hooks/static-components': 'off',
  'react-hooks/unsupported-syntax': 'off',
  'react-hooks/use-memo': 'off',
};

const config = [
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      'lib/generated/**',
      'playwright-report/**',
      'playwright/**',
      'test-results/**',
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'out/**',
      'dist/**',
      'tmp/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
  },
  {
    rules: baseRules,
  },
  {
    // Wave-10 P0-2: a stale closure over `tenant` / `currentUser` / `permissions` in these
    // paths is an authorization bug (e.g. a pre-switch tenantId captured in a fetch URL),
    // not a style nit — escalate exhaustive-deps from the repo-wide 'warn' to 'error'.
    // Fix violations with useCallback/useRef or by narrowing deps; never eslint-disable.
    files: [
      'lib/hooks/**/*',
      'lib/contexts/**/*',
      'app/providers.tsx',
      'components/notifications/WebSocketProvider.tsx',
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['*.config.js', '*.config.cjs', '*.config.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'import/no-anonymous-default-export': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['e2e/**/*', 'e2e/**/*.spec.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_|^page$|^request$|^context$|^browser$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['lib/api/**/*', 'lib/services/**/*'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    files: ['lib/utils/logger.ts', 'lib/services/websocket.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'e2e/**/*',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'scripts/**/*',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
