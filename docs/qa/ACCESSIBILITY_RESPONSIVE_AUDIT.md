# Accessibility and Responsive Audit

Date: 2026-06-13

## Findings

- Axe Playwright dependency and accessibility spec exist.
- Root layout has language and skip-link support.
- Duplicate main landmark issue in app shell was fixed.
- Reduced-motion support exists globally.
- Existing a11y automated scope is not broad enough for full production readiness; high-value routes need expanded axe scans.

## Responsive coverage required

- Desktop 1440/1280 widths.
- Tablet iPad viewport.
- Mobile Pixel/iPhone viewport.
- Mobile sidebar open/close, focus trap/escape, body scroll lock.
- Tables and cards at narrow widths.
- Modal/drawer overflow and fixed/sticky header behavior.

## Accessibility coverage required

- Axe WCAG 2.1 A/AA on public, auth, dashboard, admin, recruitment, performance, fluence, reports, settings routes.
- Keyboard navigation through login, sidebar, tables, modals, forms, command palette.
- Form labels/errors and screen-reader announcements.
- Color contrast and visible focus indicators.

## Status

Partial static pass with one implemented fix. Full a11y/responsive verdict is BLOCKED until browser execution is available.
