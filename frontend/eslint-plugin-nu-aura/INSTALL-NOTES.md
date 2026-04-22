# eslint-plugin-nu-aura — install notes

This is a private, file-linked ESLint plugin that ships with the frontend repo. It is **not**
published to npm.

`frontend/package.json` declares:

```json
"devDependencies": {
  "eslint-plugin-nu-aura": "file:./eslint-plugin-nu-aura"
}
```

and `.eslintrc.json` registers it via:

```json
"plugins": ["nu-aura"]
```

## First-time bootstrap

After pulling this change, run **one** of the following from `frontend/`:

```bash
# Option A — full install (preferred on CI and after package.json changes)
npm install

# Option B — fast local link if you can't run a full install
ln -sfn "$PWD/eslint-plugin-nu-aura" node_modules/eslint-plugin-nu-aura
```

Either step creates `node_modules/eslint-plugin-nu-aura` so `require('eslint-plugin-nu-aura')`
resolves. Once the symlink exists, code changes in `eslint-plugin-nu-aura/` are picked up
automatically — no reinstall needed.

## Verifying

```bash
# Run the local RuleTester suite (pure node, no test runner needed).
node eslint-plugin-nu-aura/rules/__tests__/no-ad-hoc-page-header.test.js

# Run the design-system lint against the fixture — expect a non-zero exit.
npx eslint eslint-plugin-nu-aura/fixtures/app/fixture/page.tsx
```

## Adding new rules

1. Drop the rule module at `eslint-plugin-nu-aura/rules/<rule-name>.js`.
2. Register it in `eslint-plugin-nu-aura/index.js` under `rules`.
3. Add a RuleTester file under `eslint-plugin-nu-aura/rules/__tests__/`.
4. Enable it in `frontend/.eslintrc.json` under `"rules"` as `"nu-aura/<rule-name>"`.
