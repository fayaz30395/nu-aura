---
name: nu-validate
description: Use when asked to "validate code", "code review", "check quality", "UX audit", "accessibility check", "review this component", or after writing/modifying any frontend or backend file. Runs a combined code-quality + UI/UX audit against NU-AURA project standards.
---

# NU-AURA Code & UX Validator

## When to Use

- After writing or modifying any `.tsx`, `.ts`, or `.java` file
- When the user says "validate", "check quality", "UX audit", "accessibility check", "code review",
  or "is this production ready"
- Before committing changes — catches pattern violations, missing states, and a11y issues
- When reviewing a PR for correctness and completeness

## Scope

If the user provides specific files, scan those. Otherwise, default to files changed since the last
commit:

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
git diff --name-only HEAD -- 'frontend/**/*.tsx' 'frontend/**/*.ts' 'backend/**/*.java'
git diff --cached --name-only -- 'frontend/**/*.tsx' 'frontend/**/*.ts' 'backend/**/*.java'
```

If no changed files are found, ask the user to specify a path.

---

## Phase 1 — TypeScript Code Quality

Run these checks against all `.tsx` / `.ts` files in scope.

### 1.1 No `any` Types

```
Pattern: :\s*any\b|as\s+any\b|<any>
Severity: ERROR
Fix: Define an explicit interface or type. Use `unknown` if the type is genuinely unknown, then narrow it.
```

### 1.2 No Raw Fetch Inside `useEffect`

```
Pattern: useEffect\s*\([^)]*fetch\(|useEffect[\s\S]{0,200}fetch\(
Severity: ERROR
Rule: All data fetching must use React Query (useQuery / useMutation). Raw fetch or axios inside useEffect violates the data-fetching convention.
Fix: Wrap the call in useQuery with a stable queryKey.
```

### 1.3 No New Axios Instances

```
Pattern: new axios\.|axios\.create\(|createAxiosInstance
Severity: ERROR
Rule: Only the shared client at `frontend/lib/api/client.ts` may be used.
Fix: Import { apiClient } from '@/lib/api/client' and use apiClient.get/post/put/delete.
```

### 1.4 Forms Must Use React Hook Form + Zod

```
Pattern: useState.*email|useState.*password|useState.*formData|onChange.*setState
Context: Inside a <form> or submit handler
Severity: WARN
Rule: All forms must use useForm() from react-hook-form with zodResolver.
Fix: Convert to useForm<T>({ resolver: zodResolver(schema) }).
```

### 1.5 No `console.log` / `console.error` (Production Code)

```
Pattern: console\.(log|warn|error|debug)\(
Severity: WARN
Exception: Files inside __tests__, e2e/, or *.test.ts — those are allowed.
Fix: Use createLogger from '@/lib/utils/logger' and the returned log.info/log.error/log.warn.
```

### 1.6 No Hardcoded Tenant IDs or UUIDs

```
Pattern: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
Severity: WARN
Exception: Seed files (V*.sql), test fixtures (testData.ts), migrations
Fix: Read tenant_id from the JWT / auth context / request scope — never hardcode.
```

### 1.7 React Query Keys Must Use Stable Arrays

```
Pattern: queryKey:\s*['"`]
Severity: WARN
Rule: queryKey must be an array, not a string. E.g. ['employees', id] not 'employees'.
Fix: Wrap in array brackets.
```

---

## Phase 2 — React Component Patterns

### 2.1 Every Page Must Have a Loading State

Check that each page component (files under `frontend/app/**/page.tsx`) renders a spinner or
skeleton when data is loading:

```
Pattern (absence): isLoading|isPending|Skeleton|Spinner|animate-spin|NuAuraLoader
If not found: WARN — "Page has no loading state. Add an isLoading branch."
```

### 2.2 Every Page Must Have an Empty State

```
Pattern (absence): empty|no.*found|no.*data|EmptyState|!.*length|\.length\s*===\s*0
If not found: WARN — "Page has no empty state for zero records. Add a fallback UI."
```

### 2.3 Every Page Must Have an Error State

```
Pattern (absence): isError|error|catch|AlertCircle|ErrorBoundary
If not found: WARN — "Page has no error handling. Wrap with try/catch or check isError from React Query."
```

### 2.4 Mutations Must Handle Errors

```
Pattern: useMutation\(
Look for: .catch(|onError:|try {
If mutation exists but no error handler: WARN — "Mutation found with no error handler. Add onError callback or try/catch in mutateAsync."
```

### 2.5 No `key={index}` in Lists

```
Pattern: key=\{index\}|key=\{i\}
Severity: WARN
Fix: Use a stable unique identifier (e.g. key={item.id}).
```

---

## Phase 3 — Accessibility (a11y)

### 3.1 Icon-Only Buttons Must Have `aria-label`

```
Pattern: <button[^>]*>[\s]*<[A-Z][a-zA-Z]+Icon|<button[^>]*>[\s]*<[A-Z][a-zA-Z]+ className="h-
Look for: aria-label on the same button element
If missing: ERROR — "Icon-only button has no aria-label. Screen readers cannot identify this button."
Fix: Add aria-label="Descriptive action" to the button.
```

### 3.2 All Interactive Elements Must Have `cursor-pointer`

```
Pattern: <button|<a |onClick=
Look for: cursor-pointer in same element's className
If missing: WARN — "Interactive element missing cursor-pointer. Add cursor-pointer to className."
Exception: Elements that are disabled (disabled attribute or disabled:opacity class).
```

### 3.3 Focus Ring on Focusable Elements

```
Pattern: <button|<input|<select|<textarea|<a 
Look for: focus-visible:ring|focus:ring|focus:outline
If missing on buttons/links: WARN — "Missing focus indicator. Add focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]."
Exception: Mantine UI components (they handle focus internally).
```

### 3.4 Images Must Have `alt` Text

```
Pattern: <Image|<img
Look for: alt=
If missing: ERROR — "Image missing alt attribute. Required for screen readers."
Fix: Add alt="descriptive text" or alt="" for decorative images.
```

### 3.5 Form Inputs Must Have Labels

```
Pattern: <input|<select|<textarea
Look for: <label|aria-label=|aria-labelledby=
If input exists but no label association: WARN — "Form input has no label. Add <label> or aria-label."
```

---

## Phase 4 — UX Completeness

### 4.1 Buttons Must Show Loading State During Async Actions

```
Pattern: onClick.*async|handleSubmit.*async|mutateAsync|mutation\.isPending
Look for: isPending|isLoading|animate-spin|Submitting|Loading within the same button
If missing: WARN — "Async button has no loading indicator. User cannot tell the action is processing."
Fix: Add disabled={mutation.isPending} and a spinner/text change.
```

### 4.2 Destructive Actions Must Have Confirmation

```
Pattern: delete|remove|DELETE|/delete|destroy
Look for: confirm|modal|dialog|are you sure|AlertDialog
If missing: WARN — "Destructive action has no confirmation dialog. Accidental deletions are possible."
```

### 4.3 Success Feedback After Mutations

```
Pattern: mutateAsync|mutation\.mutate
Look for: toast|success|setSuccess|notification|✓|Check
If missing: WARN — "Mutation has no success feedback. User does not know the action succeeded."
```

### 4.4 Modals Must Be Closeable via Escape / Close Button

```
Pattern: fixed inset-0|Modal|Dialog|z-50
Look for: onClose|setShow.*false|Escape|X className
If missing: WARN — "Modal/overlay has no close mechanism. User may be trapped."
```

### 4.5 Tables Must Have Empty State

```
Pattern: <table|<Table|\.map.*<tr|items\.map
Look for: length === 0|\.length \? |EmptyState|no.*records
If missing: WARN — "Table has no empty state for zero rows."
```

---

## Phase 5 — Backend Java (Spring Boot)

Run these checks against `.java` files in scope.

### 5.1 Every Endpoint Must Have `@RequiresPermission`

```
Pattern: @GetMapping|@PostMapping|@PutMapping|@DeleteMapping|@PatchMapping
Look for: @RequiresPermission on the same method
If missing: ERROR — "Endpoint missing @RequiresPermission. All endpoints must declare a required permission. SuperAdmin bypass is automatic."
```

### 5.2 No Business Logic in Controllers

```
Pattern (in *Controller.java): if\s*\(|for\s*\(|while\s*\(|switch\s*\(
Except: Input validation, null checks on path variables
Severity: WARN — "Business logic found in controller. Move to service layer."
```

### 5.3 DTOs Must Use Java Records for Simple Responses

```
Pattern (in *Response.java|*DTO.java): public class (?!.*Builder)
Look for: record keyword
Severity: INFO — "Response DTO is a class. Consider using a Java record for immutability and brevity."
```

### 5.4 Avoid `System.out.println`

```
Pattern: System\.out\.println|System\.err\.println
Severity: ERROR — "Use SLF4J logger (log.info/warn/error), not System.out."
```

### 5.5 Flyway Migrations Must Not Alter Existing Migrations

```
When a V*.sql file is modified (not created):
Severity: ERROR — "Existing Flyway migration was modified. Flyway will fail on checksum validation. Create a new migration instead."
```

---

## Phase 6 — Design System (Delegate)

After all above checks, invoke `/nu-design-check` on the same file scope to catch:

- Banned color tokens (`bg-white`, `sky-*`, `rose-*`, `slate-*`, etc.)
- Banned shadow utilities (`shadow-sm/md/lg`)
- Missing skeuomorphic utilities on cards/buttons
- Raw hex values / direct Tailwind `blue-*` classes

---

## Output Format

Produce a structured report grouped by severity.

```
═══════════════════════════════════════════════════
 NU-AURA CODE + UX VALIDATION REPORT
 Scope: frontend/app/me/profile/page.tsx
═══════════════════════════════════════════════════

ERRORS (must fix before commit)
────────────────────────────────
[E1] TypeScript: `any` type on line 84 in handleSave()
     → Define interface for the error shape or use `unknown`

[E2] a11y: Icon-only button (line 312) missing aria-label
     → Add aria-label="Edit profile"

WARNINGS (should fix)
──────────────────────
[W1] UX: Mutation has no success feedback (updateMutation, line 138)
     → Add a toast or setSuccess(true) after mutateAsync resolves

[W2] React: console.log on line 22
     → Replace with log.info() from createLogger

INFO (nice to have)
────────────────────
[I1] UX: Consider adding keyboard shortcut hint on Edit button (Ctrl+E)

═══════════════════════════════════════════════════
 Summary: 2 errors · 2 warnings · 1 info
 Status: ❌ NOT READY — fix errors before commit
═══════════════════════════════════════════════════
```

**Status logic:**

- `❌ NOT READY` — any ERRORs present
- `⚠️ REVIEW NEEDED` — only WARNINGs, no errors
- `✅ READY` — zero errors and zero warnings

---

## Severity Reference

| Level | Meaning                                     | Action                                        |
|-------|---------------------------------------------|-----------------------------------------------|
| ERROR | Violates non-negotiable project rule        | Must fix before commit                        |
| WARN  | Violates best practice, degrades UX/quality | Should fix; document if intentionally skipped |
| INFO  | Improvement opportunity                     | Optional                                      |

---

## Checks Summary Table

| #   | Check                            | Phase  | Severity            |
|-----|----------------------------------|--------|---------------------|
| 1.1 | No `any` types                   | TS     | ERROR               |
| 1.2 | No fetch in useEffect            | TS     | ERROR               |
| 1.3 | No new Axios instances           | TS     | ERROR               |
| 1.4 | Forms use RHF + Zod              | TS     | WARN                |
| 1.5 | No console.log                   | TS     | WARN                |
| 1.6 | No hardcoded UUIDs               | TS     | WARN                |
| 1.7 | Stable queryKey arrays           | TS     | WARN                |
| 2.1 | Loading state present            | React  | WARN                |
| 2.2 | Empty state present              | React  | WARN                |
| 2.3 | Error state present              | React  | WARN                |
| 2.4 | Mutations handle errors          | React  | WARN                |
| 2.5 | No key={index}                   | React  | WARN                |
| 3.1 | aria-label on icon buttons       | a11y   | ERROR               |
| 3.2 | cursor-pointer on interactive    | a11y   | WARN                |
| 3.3 | Focus ring present               | a11y   | WARN                |
| 3.4 | Images have alt text             | a11y   | ERROR               |
| 3.5 | Inputs have labels               | a11y   | WARN                |
| 4.1 | Async buttons show loading       | UX     | WARN                |
| 4.2 | Destructive actions confirmed    | UX     | WARN                |
| 4.3 | Success feedback present         | UX     | WARN                |
| 4.4 | Modals are closeable             | UX     | WARN                |
| 4.5 | Tables have empty state          | UX     | WARN                |
| 5.1 | @RequiresPermission on endpoints | Java   | ERROR               |
| 5.2 | No logic in controllers          | Java   | WARN                |
| 5.3 | Records for DTOs                 | Java   | INFO                |
| 5.4 | No System.out.println            | Java   | ERROR               |
| 5.5 | No modified Flyway migrations    | Java   | ERROR               |
| 6.* | Design token compliance          | Design | via nu-design-check |
