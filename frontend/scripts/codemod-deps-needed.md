# Codemod dev dependencies

The design-token codemod (`scripts/codemod-design-tokens.ts`) depends on
`jscodeshift` + types, which are **not** currently in `package.json`. The
fixture test runner (`scripts/test-codemod.ts`) does NOT require jscodeshift
— it only needs to be able to run TypeScript (we already ship `esbuild`).

## Install before running the codemod against the repo

```bash
cd frontend
npm i -D jscodeshift @types/jscodeshift
```

Recommended versions (pinned, battle-tested with Next 14 / TS 5.x):

```bash
npm i -D jscodeshift@0.15.2 @types/jscodeshift@0.11.11
```

## Running the codemod once installed

```bash
cd frontend

# Dry run first — prints changes without writing
npx jscodeshift --dry --extensions=tsx,ts --parser=tsx \
  -t scripts/codemod-design-tokens.ts \
  'app/**/*.tsx' 'components/**/*.tsx'

# Apply
npx jscodeshift --extensions=tsx,ts --parser=tsx \
  -t scripts/codemod-design-tokens.ts \
  'app/**/*.tsx' 'components/**/*.tsx'

# Single-file spot-check
npx jscodeshift --parser=tsx \
  --file=app/me/dashboard/page.tsx \
  -t scripts/codemod-design-tokens.ts
```

Artifacts emitted in the cwd after an apply run:

- `migration-report.md` — per-file before/after legacy class counts, rewrite totals
- `unconvertible-classes.json` — flat JSON of classes flagged for manual review

## Running the fixture test (no jscodeshift required)

```bash
cd frontend
# Bundle+run (scripts/test-codemod.ts imports scripts/codemod-design-tokens.ts)
npx esbuild scripts/test-codemod.ts \
  --bundle --platform=node --format=cjs \
  --external:jscodeshift \
  --outfile=/tmp/test-codemod.cjs
node /tmp/test-codemod.cjs
```

Exit code is non-zero if any fixture output differs from expected.
