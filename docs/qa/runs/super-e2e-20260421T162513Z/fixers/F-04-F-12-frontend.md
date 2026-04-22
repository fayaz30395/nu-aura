# F-04 (BUG-010 regression) & F-12 Frontend Fixes

Fixer: Senior Frontend Fixer #3
Date: 2026-04-21

---

## F-04 / BUG-010 — `/helpdesk/tickets` ticket-number cell not a real anchor

### Root cause

`frontend/app/helpdesk/tickets/page.tsx` wrapped every row in a `<tr>` with
`onClick={onNavigate}` that called `router.push(`/helpdesk/tickets/${id}`)` (line
365 in the pre-fix file, prop drilled into `TicketRow`). A real `<Link>` was
present inside the first cell, BUT:

- The outer `<tr>` was the primary interactive affordance (`cursor-pointer`,
  row-wide onClick).
- That path is programmatic — it breaks right-click → open in new tab,
  middle-click, copy-link, and keyboard focus navigation.
- QA Chrome DOM scan correctly reported "tbody has 0 anchors" on the initial
  paint because the row was hydrating with the `onClick`-based handler before
  the Link anchor was prioritised by the accessibility tree.

In short: navigation was being driven by `router.push`, not by a real anchor,
which is exactly the regression called out in BUG-010.

### Fix

File: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/helpdesk/tickets/page.tsx`

1. Removed `useRouter` import and `router` usage in `TicketListPage`.
2. Removed the `onNavigate` prop from `TicketRow` (and the prop drilling at the
   call site).
3. Removed `onClick={onNavigate}` and `cursor-pointer` from the `<tr>`.
4. Kept the ticket-number `<Link>` (now unconditional — no `stopPropagation`
   needed).
5. Promoted the Subject cell from a plain `<span>` to a second `<Link>` to
   the same detail route, so there are TWO real anchors per row (better UX and
   belt-and-braces for BUG-010).
6. Dropped the `onClick={(e) => e.stopPropagation()}` on the Actions `<td>`
   (no longer needed — row is not clickable).

Before (abridged):

```tsx
<tr className="... cursor-pointer" onClick={onNavigate}>
  <td>
    <Link href={`/helpdesk/tickets/${ticket.id}`}
          onClick={(e) => e.stopPropagation()}
          className="...">
      {ticket.ticketNumber || ticket.id.slice(0, 8)}
    </Link>
  </td>
  <td>
    <span className="text-sm font-medium ...">{ticket.subject}</span>
  </td>
  ...
  <td onClick={(e) => e.stopPropagation()}>
    <PermissionGate .../>
  </td>
</tr>
```

After:

```tsx
const detailHref = `/helpdesk/tickets/${ticket.id}`;
<tr className="h-11 hover:bg-[var(--bg-card-hover)] transition-colors">
  <td>
    <Link href={detailHref} className="...">
      {ticket.ticketNumber || ticket.id.slice(0, 8)}
    </Link>
  </td>
  <td>
    <Link href={detailHref} className="... hover:underline">
      {ticket.subject}
    </Link>
  </td>
  ...
  <td>
    <PermissionGate .../>
  </td>
</tr>
```

### QA verification

1. Navigate to `/helpdesk/tickets` as SUPER_ADMIN.
2. Inspect tbody — expect `>= 2 * N` `<a href="/helpdesk/tickets/{id}">` anchors
   (ticket number + subject per row).
3. Right-click the ticket number → "Open link in new tab" must work.
4. Middle-click (or Cmd+Click) on ticket number / subject must open a new tab.
5. Keyboard: Tab into the table → each ticket number and subject should be
   focusable and show the focus-visible ring.
6. Status dropdown (Actions cell) still works and does not trigger navigation.

### Confidence: **H**

### Follow-ups

- Optional: consider a shared `<RowLink>` helper used across helpdesk / contracts
  / employees list pages to prevent future regressions of this exact pattern.
- Consider adding a Playwright snapshot assertion
  `expect(locator('tbody a').count()).toBeGreaterThan(0)` to the helpdesk smoke
  test.

---

## F-12 — `/employees?page=N` URL param ignored

### Root cause

`frontend/app/employees/page.tsx` initialised pagination with
`useState(0)` and never read `useSearchParams()`. It also only updated local
state when the user clicked Prev/Next, so the URL never reflected the current
page and direct links to `?page=2` were silently ignored — the API call always
sent `page=0`.

### Fix

File: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/employees/page.tsx`

- Added `useSearchParams`, `usePathname` imports.
- Replaced `const [currentPage, setCurrentPage] = useState(0)` with a URL-backed
  `currentPage` derived from `searchParams.get('page')`.
- URL uses 1-based page numbers (user-friendly); API uses 0-based (unchanged).
- Introduced a `setCurrentPage` shim with the SAME signature (accepts a number
  or updater function) so all existing call-sites (`setCurrentPage(0)` in
  search/filter handlers, `setCurrentPage(p => p - 1)` / `p + 1` in Prev/Next
  buttons) keep working. The shim pushes the new state into the URL via
  `router.replace`, which triggers React Query refetch because `currentPage`
  is part of the `useEmployees` query key.
- When the resulting URL page is `1`, the `?page=` param is stripped from the
  URL for cleanliness.

Before:

```tsx
const [currentPage, setCurrentPage] = useState(0);
const PAGE_SIZE = 20;
```

After:

```tsx
const pathname = usePathname();
const searchParams = useSearchParams();
...
const PAGE_SIZE = 20;

const parsedPageParam = Number(searchParams.get('page'));
const urlPage = Number.isFinite(parsedPageParam) && parsedPageParam >= 1
  ? Math.floor(parsedPageParam)
  : 1;
const currentPage = urlPage - 1;

const setCurrentPage = (updater: number | ((prev: number) => number)) => {
  const next = typeof updater === 'function' ? updater(currentPage) : updater;
  const nextUrlPage = Math.max(1, next + 1);
  const params = new URLSearchParams(searchParams.toString());
  if (nextUrlPage <= 1) params.delete('page');
  else params.set('page', String(nextUrlPage));
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname);
};
```

### QA verification

1. Visit `/employees?page=2` directly — Network panel should show
   `GET /api/v1/employees?page=1&size=20&...` (0-based page index on API, which
   corresponds to "page 2" in the URL and UI).
2. Pagination footer should read `2 / <total>`.
3. Click Next → URL updates to `?page=3`, API call goes out with `page=2`.
4. Click Prev back to page 1 → URL param `?page` is removed (clean URL).
5. Changing status filter or typing a search query + clicking Search → URL
   returns to "no page param" (i.e. page 1) and refetches from page 0.
6. Browser back button after paginating goes to the prior page (because we use
   `router.replace`, this intentionally does NOT pollute history — if the PM
   wants Back to step through pages, swap `router.replace` for `router.push`).

### Confidence: **H**

### Follow-ups

- Consider persisting `search` and `status` filters to the URL too, so QA /
  PM / managers can share deep links like `/employees?page=2&status=ACTIVE`.
- If a `Back`-button-steps-through-pages UX is desired, switch `router.replace`
  → `router.push` in the `setCurrentPage` shim.
- No new npm packages added; no axios instance changes; no backend touched.

---

## Files touched

- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/helpdesk/tickets/page.tsx`
- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/employees/page.tsx`

## Constraint compliance

- [x] No commit performed.
- [x] No backend changes.
- [x] TypeScript strict, no `any` introduced.
- [x] Uses existing React Query + axios client (no new instances).
- [x] Mantine/Tailwind only.
- [x] No unrelated refactor.
