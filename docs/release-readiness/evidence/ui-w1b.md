# UI Wave 1 batch B (W1-04, W1-05, W1-06)

- W1-04 Wiki shell gating + error state: done. "New Page" wrapped in `PermissionGate` (KNOWLEDGE_WIKI_CREATE), `QueryErrorCard` shown for spaces/pages errors; `app/fluence/wiki/page.test.tsx` 3/3 pass.
- W1-05 Holidays add-button gate: done. Gate uses `Permissions.LEAVE_MANAGE` (the backend `POST /api/v1/holidays` permission); `app/holidays/page.test.tsx` 2/2 pass.
- W1-06 Add Employee code optional: done, but the plan's target file was test-only. The live form uses `app/employees/_components/create-employee-schema.ts`, so that schema, `AddEmployeeFields.tsx` and `toCreateEmployeeRequest` (blank to undefined) were changed too; `lib/validations/employee.test.ts` 25/25 pass.

Checks: `npx tsc --noEmit` no output (no errors); `npx eslint` on touched source files 0 errors (test files are ignored by the lint config).
