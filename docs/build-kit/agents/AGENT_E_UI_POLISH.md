# 🤖 Agent E — UI Polish, Loading States & Empty States
**Priority: MEDIUM | Est. Time: 2 hours**
**Paste this entire prompt into a Cursor Composer session.**

---

You are working on an existing production HRMS codebase.

- Frontend: `frontend/` — Next.js 14, TypeScript, Mantine UI, Tailwind, Zustand, React Query, Framer Motion
- Key reference files: `CLAUDE.md`, `docs/build-kit/13_ENTERPRISE_UI_SYSTEM.md`

**Read these files first before writing any code:**
- `CLAUDE.md` — coding rules and stack
- `docs/build-kit/13_ENTERPRISE_UI_SYSTEM.md` — UI patterns and standards
- `frontend/app/employees/page.tsx` — reference for best-implemented page

---

## Your Tasks

### Task 1: Loading States — `loading.tsx` Files
Run this command to find pages missing a loading file:
```bash
find frontend/app -name "page.tsx" | while read f; do
  dir=$(dirname "$f")
  [ ! -f "$dir/loading.tsx" ] && echo "MISSING loading.tsx: $dir"
done
```

For each missing `loading.tsx`, create one with Mantine `Skeleton` components that match the page layout. Examples:
- A page with a table → Skeleton rows (5 rows, 4 columns each)
- A page with cards → Skeleton cards in a grid
- A page with a form → Skeleton input fields

### Task 2: Error States
In every `page.tsx` that uses React Query's `useQuery`, find cases where `isError` is not handled. Add an error state using Mantine `Alert`:
```tsx
if (isError) return (
  <Alert color="red" icon={<IconAlertCircle />} title="Something went wrong">
    Failed to load data. <Anchor onClick={() => refetch()}>Try again</Anchor>
  </Alert>
);
```

### Task 3: Empty States
Find every TanStack Table or list that renders an empty array. Add a proper empty state below the table header:
```tsx
// When data.length === 0
<Center py="xl">
  <Stack align="center" gap="xs">
    <ThemeIcon size={64} radius="xl" variant="light" color="gray">
      <IconUsers size={32} />   {/* Use relevant Tabler icon */}
    </ThemeIcon>
    <Text fw={600}>No [items] found</Text>
    <Text c="dimmed" size="sm">Get started by adding your first [item]</Text>
    <Button leftSection={<IconPlus size={16} />}>Add [Item]</Button>
  </Stack>
</Center>
```

Apply this to at minimum: Employees table, Leave requests table, Attendance table, Payroll payslips table.

### Task 4: Framer Motion Animations
Apply consistent enter animations on the **5 most-visited pages**: Dashboard, Employees, Leave, Attendance, Payroll.

Pattern (apply to the main content container):
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: 'easeOut' }}
>
  {/* page content */}
</motion.div>
```

Also apply `AnimatePresence` to modals and slide-out Sheets for a smooth open/close.

### Task 5: Verify
- Run `cd frontend && npx tsc --noEmit`. Fix ALL TypeScript errors in files you touched.
- This agent polishes ACROSS modules, but does not change business logic — only add loading/error/empty UI states and animations.
