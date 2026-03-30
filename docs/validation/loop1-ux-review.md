# Loop 1 UX/UI Review -- Auth, Login & Public Pages

**Reviewer:** UX/UI Agent
**Date:** 2026-03-31
**Routes reviewed:** 10
**Issues found:** 24

---

## 1. Per-Page Review

### 1.1 `/auth/login` -- `frontend/app/auth/login/page.tsx`

**Visual Consistency**
- Uses accent/blue palette (correct, no purple remnants)
- CSS variable system (`--bg-main`, `--text-primary`, etc.) used consistently
- Dark mode handled via `dark:` variants throughout
- Focus ring on Google SSO button not explicitly defined (relies on browser default or global)
- Touch target: Google SSO button uses `py-3.5` (~56px) -- adequate

**Component Quality**
- Uses raw HTML `<button>` and `<div>` instead of Mantine components for the login card, Google button, and demo panel
- Loading spinner is a custom CSS border-based spinner, not a Mantine Loader
- Error alert is hand-built, not using a shared Alert component
- Demo accounts panel uses custom expandable, not Mantine Accordion

**Accessibility**
- Google SSO button has no `aria-label` for the SVG icon
- Trust badge SVG (shield icon at line 638) has no `aria-hidden` or accessible label
- Image alt text present for logo ("NuLogic") -- adequate
- No `aria-live` region for error messages (screen readers won't announce auth failures)

**Responsiveness**
- Left panel hidden on `lg:` breakpoint via `hidden lg:flex` -- correct
- Mobile tagline shown on small screens -- good
- Max width constrained at 420px for login card -- good

**State Clarity**
- Loading state on Google SSO button with spinner -- good
- Error message displayed with icon and title -- good
- MFA screen has separate render path -- good
- No loading skeleton for initial page (Suspense fallback is minimal spinner)

---

### 1.2 `/auth/signup` -- `frontend/app/auth/signup/page.tsx`

**Visual Consistency**
- Background uses `from-accent-50 via-[var(--bg-surface)] to-accent-50` -- consistent
- Focus rings use `focus:ring-accent-500` -- uses accent-500 instead of the recommended accent-700 from design tokens
- Input height: `py-3` (~48px) -- meets 44px minimum
- Uses custom Card component from `@/components/ui/Card` -- good

**Component Quality**
- Uses raw HTML `<input>` elements instead of Mantine TextInput
- React Hook Form + Zod -- correct pattern
- Button uses custom `Button` component with `isLoading` -- good
- Show/hide password toggle present -- good

**Accessibility**
- All inputs have associated `<label>` elements -- good
- Password toggle button uses `tabIndex={-1}` to skip tab order -- acceptable
- Eye/EyeOff icons lack `aria-label` on the toggle button
- No `aria-live` for error state

**Responsiveness**
- Name fields use `grid grid-cols-2 gap-4` -- collapses properly
- Max width `max-w-lg` -- good for mobile
- Padding responsive: `px-4 sm:px-6 lg:px-8`

**State Clarity**
- Success state shows separate card with redirect button -- good
- Error alert with icon -- good
- Loading state on submit button -- good

---

### 1.3 `/auth/forgot-password` -- `frontend/app/auth/forgot-password/page.tsx`

**Visual Consistency**
- Uses `surface-50` and `surface-100` in background which maps to gray palette -- consistent
- Logo is a `Building2` icon instead of the actual NU-AURA logo image (unlike login and signup)
- Focus ring: `focus:ring-accent-500` -- same accent-500 inconsistency as signup

**Component Quality**
- Uses custom Card, Button, Input components -- good
- React Hook Form + Zod -- correct
- SSO user detection and redirect to Google Account Security -- nice touch

**Accessibility**
- Email input has label -- good
- `ArrowLeft` icon in "Back to Sign In" link lacks accessible text (the text "Back to Sign In" is adjacent so this is acceptable)
- `Building2` icon in logo area has no alt text

**Responsiveness**
- `max-w-md` constrains width -- good
- Responsive padding -- good

**State Clarity**
- Success state differentiates SSO users vs local users -- excellent
- Error alert visible -- good
- Loading state on submit -- good

---

### 1.4 `/` -- `frontend/app/page.tsx` (Landing)

**Visual Consistency**
- Minimal redirect page -- just shows "Redirecting..." in a `skeuo-card`
- No Sky/accent colors needed; uses CSS vars

**Component Quality**
- Immediate redirect to `/auth/login` via `router.replace`
- No loading skeleton or branded transition

**Accessibility**
- "Redirecting..." text is accessible but could use `aria-live="polite"` for screen readers
- No skip-to-content link

**Responsiveness**
- Centered layout -- adequate

**State Clarity**
- Only shows "Redirecting..." -- minimal but functional

---

### 1.5 `/careers` -- `frontend/app/careers/page.tsx`

**Visual Consistency**
- Hero gradient uses `from-accent-700 via-accent-600 to-accent-700` -- consistent with blue palette
- Cards and badges use accent colors -- good
- Uses `skeuo-card` and `card-interactive` classes

**Component Quality**
- Uses custom Card, Badge, Button, Input, Modal, Skeleton components -- good
- React Hook Form + Zod for application form -- correct
- Skeleton loading state for job cards -- good
- Empty state with icon and message -- good
- Pagination component is hand-built

**Accessibility**
- Job cards use `onClick` on a `<Card>` div -- not keyboard accessible (no `role="button"`, no `tabIndex`, no `onKeyDown`)
- Filter `<select>` elements use raw HTML, not Mantine Select
- Resume upload `<input type="file">` is hidden with label proxy -- accessible pattern
- `<textarea>` for cover letter uses `input-aura` class but may not meet 44px touch target

**Responsiveness**
- 4-column grid `lg:grid-cols-4` for sidebar + content -- good
- Search bar in hero section -- good
- Sidebar sticky at `top-24` -- may overlap on some viewports

**State Clarity**
- Loading skeletons -- good
- Empty state with clear filters button -- good
- Application submit success/error feedback -- good

---

### 1.6 `/offer-portal` -- `frontend/app/offer-portal/page.tsx`

**Visual Consistency**
- Background gradient: `from-accent-50 to-surface-100` -- consistent
- Uses accent colors for header icon and highlight text
- Info cards use `bg-[var(--bg-secondary)]` -- consistent

**Component Quality**
- Uses custom Card, Button components
- React Hook Form + Zod for accept form
- Suspense wrapper with loading fallback -- good
- Custom modal implemented as `fixed inset-0` overlay instead of Mantine Modal

**Accessibility**
- Accept/decline modals use `fixed inset-0` divs but lack `role="dialog"`, `aria-modal`, and focus trap
- Date input has label -- good
- Decline reason textarea has label -- good

**Responsiveness**
- `max-w-3xl` main content -- good
- Grid `md:grid-cols-2` for candidate info -- good
- Modals use `max-w-md` and padding -- adequate

**State Clarity**
- Loading spinner with text -- good
- Error state with icon card -- good
- Accepted/declined status banners with distinct colors -- excellent
- Mutation loading states on buttons -- good

---

### 1.7 `/about` -- `frontend/app/about/page.tsx`

**Visual Consistency**
- Uses accent gradient for value icons and timeline circles -- consistent
- Header is a custom sticky nav (not the app's main Header component)
- `skeuo-emboss` class used on headings
- Section backgrounds alternate: `bg-[var(--bg-main)]` and `bg-[var(--bg-surface)]`

**Component Quality**
- Uses Framer Motion for scroll animations -- correct library
- Custom Card, Button, Badge components -- good
- No loading states needed (static content)

**Accessibility**
- Stats section icons lack `aria-hidden` (decorative icons should be hidden)
- Navigation links are standard `<Link>` elements -- accessible
- No skip-to-content link on public pages

**Responsiveness**
- Grid layouts responsive: `md:grid-cols-2`, `lg:grid-cols-4` -- good
- CTA buttons stack on mobile: `flex-col sm:flex-row` -- good

**State Clarity**
- Static content, no dynamic states -- N/A

---

### 1.8 `/features` -- `frontend/app/features/page.tsx`

**Visual Consistency**
- Tab buttons use `bg-accent-500 text-white` for active state -- consistent
- Feature card icons use module-specific gradients -- good
- Check marks use `text-success-500` -- semantic color usage correct

**Component Quality**
- Module tabs are custom buttons, not Mantine Tabs
- Framer Motion for tab content transitions -- good
- Card with `hover` prop -- good
- Integration icons section -- good

**Accessibility**
- Tab buttons have no `role="tab"`, `aria-selected`, or `role="tablist"` on the container -- significant a11y gap
- Integration icons lack alt text or labels
- Feature benefit lists use semantic `<ul>/<li>` -- good

**Responsiveness**
- Tab buttons `flex-wrap` for overflow -- good
- Feature grid `lg:grid-cols-3` -- good
- Integration icons wrap naturally

**State Clarity**
- Active tab visually distinct -- good
- No loading states needed (static)

---

### 1.9 `/pricing` -- `frontend/app/pricing/page.tsx`

**Visual Consistency**
- Popular plan uses `ring-2 ring-accent-500/50 scale-105` -- visually prominent
- Billing toggle uses `bg-[var(--bg-surface)]` with active card treatment -- good
- Success badge for annual savings -- good

**Component Quality**
- Framer Motion animations -- good
- FAQ accordion is hand-built, not Mantine Accordion
- Card, Badge, Button from custom UI library -- good
- Pricing cards with proper structure

**Accessibility**
- FAQ buttons have proper interactive semantics (button element) -- good
- Billing toggle buttons lack `role="radio"` or `role="tab"` semantics
- "Most Popular" badge is positioned absolutely and may not be read in correct order
- Feature checkmarks/X marks lack `aria-label` (included/not-included)

**Responsiveness**
- Pricing cards `lg:grid-cols-3` -- good
- Add-ons grid `md:grid-cols-3` -- good
- CTA buttons stack on mobile

**State Clarity**
- Billing toggle immediately updates prices -- good
- FAQ expand/collapse smooth

---

### 1.10 `/contact` -- `frontend/app/contact/page.tsx`

**Visual Consistency**
- Contact method cards use distinct gradients per type -- good
- Office location cards use accent-50/950 backgrounds -- consistent
- Form uses `input-aura` class and accent focus rings

**Component Quality**
- React Hook Form + Zod -- correct
- Custom Input component -- good
- Textarea uses raw HTML with `input-aura` class
- Success feedback uses Framer Motion animation -- good

**Accessibility**
- All form inputs have labels -- good
- Textarea has label -- good
- Success message lacks `role="alert"` or `aria-live`
- Contact method icons (decorative) lack `aria-hidden`

**Responsiveness**
- Two-column layout `lg:grid-cols-2` -- good
- Form fields `sm:grid-cols-2` -- good
- Office grid `md:grid-cols-3` -- good

**State Clarity**
- Success message auto-dismisses after 5 seconds -- good
- Loading state on submit button with `isLoading` -- good
- Validation errors shown per field -- good

---

## 2. Design Debt Log

| ID | Page | Category | Severity | Description |
|---|---|---|---|---|
| UX-01 | All public pages | visual | MEDIUM | Font family is IBM Plex Sans/Serif/Mono (layout.tsx), not Plus Jakarta Sans as documented in MEMORY.md. Either docs or implementation needs updating. |
| UX-02 | `/auth/login` | visual | LOW | Google SSO button and demo panel buttons are raw HTML, not Mantine components. Inconsistent with component library strategy. |
| UX-03 | `/auth/signup`, `/auth/forgot-password` | visual | LOW | Focus ring uses `focus:ring-accent-500` instead of the design system standard of 2px accent-700 (per MEMORY.md: `focus:ring-sky-700`). Note: design system migrated from Sky to Blue/accent, but ring shade is inconsistent (500 vs 700). |
| UX-04 | `/auth/forgot-password` | visual | MEDIUM | Logo is a `Building2` Lucide icon instead of the actual logo image (`/images/logo.png`), unlike login and signup pages which use the real logo. |
| UX-05 | `/` (landing) | visual | LOW | Redirect page is unstyled and unbranded. No logo, no animation, just "Redirecting..." in a plain card. |
| UX-06 | `/careers` | visual | LOW | "Apply Now" and "Clear Filters" buttons use `bg-accent-700 hover:bg-accent-700` -- hover state is identical to default (no hover feedback). |
| UX-07 | `/offer-portal` | visual | LOW | Download PDF link uses `bg-accent-700 hover:bg-accent-700` -- same hover issue as careers. |
| UX-08 | `/about`, `/features`, `/pricing`, `/contact` | visual | MEDIUM | Public pages have a custom header nav that duplicates navigation but is not a shared component. Each page re-implements the header with slight variations (different nav links). |
| UX-09 | All pages | visual | LOW | `skeuo-emboss` and `skeuo-card` CSS classes are used widely but represent a skeuomorphic style that may conflict with the "minimal material depth" philosophy stated in tailwind.config.js. |
| UX-10 | `/pricing` | visual | LOW | Popular plan card uses `scale-105` which may cause text rendering issues at non-integer scales on some displays. |

---

## 3. Accessibility Issues

| ID | Page | Category | Severity | Description | Current Code | Recommended Fix |
|---|---|---|---|---|---|---|
| UX-11 | `/auth/login` | accessibility | HIGH | Google SSO button SVG icon has no `aria-hidden="true"` and no accessible label. Screen readers will attempt to read the SVG paths. | `<svg className="w-5 h-5" viewBox="0 0 24 24">` | Add `aria-hidden="true"` to the SVG since the adjacent text "Continue with Google" provides the label. |
| UX-12 | `/auth/login` | accessibility | HIGH | Error messages lack `aria-live="assertive"` region. Screen readers will not announce authentication failures. | `{error && (<div className="flex items-start ...">` | Wrap error div with `role="alert"` or add `aria-live="assertive"`. |
| UX-13 | `/auth/signup` | accessibility | HIGH | Password visibility toggle button lacks `aria-label`. | `<button type="button" onClick={...} className="..." tabIndex={-1}>` | Add `aria-label={showPassword ? 'Hide password' : 'Show password'}`. |
| UX-14 | `/auth/signup` | accessibility | MEDIUM | Error messages lack `aria-live` region (same pattern as login). | See UX-12 pattern. | Same fix: add `role="alert"` to error container. |
| UX-15 | `/careers` | accessibility | HIGH | Job cards are clickable divs without keyboard support. Cannot be focused or activated via keyboard. | `<Card className="card-interactive ..." onClick={() => onViewDetails(job)}>` | Add `role="button"`, `tabIndex={0}`, and `onKeyDown` handler for Enter/Space. |
| UX-16 | `/careers` | accessibility | MEDIUM | Filter dropdowns use raw `<select>` elements without associated `<label>` elements linked via `htmlFor`/`id`. | `<label className="...">Department</label><select ...>` | Add `id` to `<select>` and `htmlFor` to `<label>`. |
| UX-17 | `/offer-portal` | accessibility | HIGH | Accept and Decline modals lack focus trap, `role="dialog"`, and `aria-modal="true"`. Keyboard users can tab out of the modal into background content. | `<div className="fixed inset-0 bg-[var(--bg-overlay)] ...">` | Use Mantine Modal or add `role="dialog"`, `aria-modal="true"`, and a focus trap (e.g., `@mantine/hooks` useFocusTrap). |
| UX-18 | `/features` | accessibility | HIGH | Module tab buttons lack ARIA tab semantics. Missing `role="tablist"` on container, `role="tab"` on buttons, `aria-selected`, and `role="tabpanel"` on content. | `<div className="flex flex-wrap justify-center gap-2 mb-12">{modules.map((module) => (<button ...>` | Add `role="tablist"` to container, `role="tab"` and `aria-selected` to buttons, `role="tabpanel"` to content div. |
| UX-19 | `/pricing` | accessibility | MEDIUM | Billing cycle toggle lacks ARIA semantics. Should use `role="radiogroup"` / `role="radio"` or segmented control pattern. | `<div className="inline-flex items-center gap-4 ..."><button ...>Monthly</button><button ...>Annual</button>` | Add `role="radiogroup"` on container, `role="radio"` and `aria-checked` on buttons. |
| UX-20 | `/about`, `/features`, `/contact` | accessibility | MEDIUM | Decorative icons throughout public pages lack `aria-hidden="true"`. Screen readers will announce icon content or empty elements. | `<stat.icon className="h-10 w-10 ..." />` | Add `aria-hidden="true"` to all decorative Lucide icons. |
| UX-21 | `/contact` | accessibility | MEDIUM | Success message lacks `role="alert"` or `aria-live`. Screen readers won't announce successful form submission. | `<motion.div ... className="mb-6 p-4 rounded-lg bg-success-50 ...">` | Add `role="alert"` to the success message container. |

---

## 4. Design System Violations

| ID | Page | Category | Severity | Description | Current | Expected |
|---|---|---|---|---|---|---|
| UX-22 | All pages (layout.tsx) | visual | MEDIUM | Font family is IBM Plex Sans, not Plus Jakarta Sans as documented in MEMORY.md. The design tokens reference `--font-sans` which resolves to IBM Plex Sans. | `IBM_Plex_Sans` in layout.tsx | Either update MEMORY.md to reflect the IBM Plex decision, or migrate to Plus Jakarta Sans as documented. This is likely a deliberate design evolution that outdated the memory doc. |
| UX-23 | `/auth/signup`, `/auth/forgot-password` | visual | LOW | Focus ring color is `accent-500` instead of design system standard `accent-700`. The Mantine theme sets `primaryShade: { light: 6 }` (accent-600) which is also different. | `focus:ring-2 focus:ring-accent-500` | Use `focus:ring-2 focus:ring-accent-600` (matching Mantine primary shade) or `focus:ring-accent-700` (matching memory doc). |
| UX-24 | `/auth/login`, `/careers`, `/offer-portal` | visual | LOW | Tailwind `primary-*` alias maps to blue/accent colors (not purple), so no actual color violation -- but the alias still exists in tailwind.config.js as a backward-compatibility bridge. This is acceptable but should be noted for eventual cleanup. | `primary: { DEFAULT: blue[600], ...blue }` in tailwind config | No immediate action. Track for eventual removal once all `primary-*` references are eliminated. |

---

## 5. Recommendations

### Priority 1 -- Accessibility Fixes (HIGH severity)

1. **Add `role="alert"` to all error containers** across auth pages (UX-12, UX-14). This is a one-line fix per page.
2. **Add keyboard support to clickable cards** on `/careers` (UX-15). Add `role="button"`, `tabIndex={0}`, and Enter/Space key handler.
3. **Replace custom modals with Mantine Modal** on `/offer-portal` (UX-17). The existing Mantine Modal component from `@/components/ui/Modal` is already imported in other pages.
4. **Add ARIA tab semantics to features page** (UX-18). This requires `role="tablist"`, `role="tab"`, `aria-selected`, and `role="tabpanel"` attributes.
5. **Add `aria-hidden="true"` to all decorative SVG/icons** (UX-11, UX-20). Bulk find-and-fix.
6. **Add `aria-label` to password toggle** on signup (UX-13).

### Priority 2 -- Design Consistency (MEDIUM severity)

7. **Resolve font documentation mismatch** (UX-22). The codebase uses IBM Plex Sans but MEMORY.md documents Plus Jakarta Sans. Update MEMORY.md to reflect reality.
8. **Standardize focus ring shade** (UX-03, UX-23). Pick one shade (accent-600 or accent-700) and apply consistently.
9. **Use actual logo on forgot-password page** (UX-04). Replace `Building2` icon with `<Image src="/images/logo.png" .../>` to match login and signup.
10. **Extract shared public page header** (UX-08). About, Features, Pricing, and Contact each re-implement a sticky header. Extract to `frontend/components/public/PublicHeader.tsx`.

### Priority 3 -- Polish (LOW severity)

11. **Fix identical hover states** (UX-06, UX-07). Change `hover:bg-accent-700` to `hover:bg-accent-800` on buttons where background is already `bg-accent-700`.
12. **Brand the landing redirect** (UX-05). Show the NU-AURA logo during the brief redirect.
13. **Add ARIA radio semantics to billing toggle** (UX-19) on pricing page.
14. **Consider migrating raw HTML inputs to Mantine TextInput** across auth pages for consistency with the rest of the platform (low priority since current implementation works).

---

## Summary

| Category | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Accessibility | 5 | 5 | 0 | 10 |
| Visual Consistency | 0 | 3 | 7 | 10 |
| Responsiveness | 0 | 0 | 0 | 0 |
| State Clarity | 0 | 0 | 0 | 0 |
| **Total** | **5** | **8** | **7** | **24** |

**Overall assessment:** The Loop 1 routes are visually polished and functionally complete. The color palette migration from purple to blue/accent is fully applied -- no purple remnants were found. The main areas of concern are accessibility (missing ARIA attributes, keyboard navigation on interactive elements, focus traps in custom modals) and a font family documentation mismatch. Responsiveness and state management are well handled across all pages.
