import {defineConfig} from 'orval';

/**
 * Orval codegen config for the NU-AURA OpenAPI client.
 *
 * Input:
 *   - Defaults to the running backend SpringDoc endpoint.
 *   - Override with `API_DOCS_URL` env var for CI (point to a snapshot file or
 *     an alternate environment).
 *
 * Output:
 *   - `frontend/lib/generated/api/` — gitignored, regenerated on demand.
 *   - `mode: 'tags-split'` produces one file per OpenAPI tag (Auth, Employees,
 *     Leave Management, etc.) so churn stays local to each domain.
 *   - `client: 'react-query'` emits typed `@tanstack/react-query` hooks
 *     (`useFooQuery`, `useFooMutation`) — already the project's data layer.
 *   - `mutator` routes every request through the existing `apiClient` so we
 *     keep httpOnly-cookie auth, 401 refresh mutex, CSRF, and tenant headers.
 *
 * Run:
 *   1. Start the backend locally (so `/v3/api-docs` is reachable), OR
 *      `API_DOCS_URL=./openapi-snapshot.json pnpm api:generate`.
 *   2. `npm run api:generate`.
 */
export default defineConfig({
  nuaura: {
    input: {
      target: process.env.API_DOCS_URL ?? 'http://localhost:8080/v3/api-docs',
    },
    output: {
      mode: 'tags-split',
      target: './lib/generated/api/index.ts',
      schemas: './lib/generated/api/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: './lib/api/orval-mutator.ts',
          name: 'orvalMutator',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: [],
    },
  },
});
