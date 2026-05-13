# Product

## Register

product

## Users

NULogic's distributed workforce. Three primary roles, overlapping daily:

- **Employees** — check attendance, request leave, view payslips, complete reviews, browse the wiki. Mobile or desktop, fragmented attention, often mid-workday.
- **HR & People Ops** — run payroll, manage employee lifecycle, audit attendance, approve workflows, configure policies. Desk-bound, long sessions, dense data.
- **Hiring managers and recruiters** — move candidates through pipelines, run interview loops, score, hire. High-context switching, decisions per hour.

Plus department leads using NU-Grow for reviews / OKRs / 1:1s and contributors writing in NU-Fluence. One platform, four sub-apps, one login.

## Product Purpose

NU-AURA is the internal operating system for NULogic. It replaces KEKA for HR operations and consolidates four previously-stitched-together domains — core HR (HRMS), recruitment (Hire), performance and learning (Grow), and knowledge (Fluence) — behind one login and one design language.

Success looks like: an employee who never thinks about the tool. A recruiter who closes a hire in fewer clicks than KEKA needed. An HR admin who finds the right setting on the first try. A reviewer who writes feedback in the same flow they wrote it last quarter.

It is not a product sold to customers. It is the daily environment for everyone at NULogic. Friction here compounds across the company.

## Brand Personality

Calm. Capable. Quietly confident.

Linear-ish, not Salesforce-ish. The interface earns trust by being predictable, fast, and right — not by announcing itself. Color, motion, and typography are tools for clarity, never for personality. The product feels like an expert who already knows the answer and isn't excited about it.

## Anti-references

This product should explicitly NOT look or feel like:

- **KEKA / Zoho-style HRMS clutter** — every field visible at once, dense forms with no progressive disclosure, late-2010s pastel chips and emoji-status. We're replacing KEKA, not echoing it.
- **Workday / SuccessFactors enterprise gray** — gray-on-gray density, accessibility-by-checkbox, modal-soup workflows, dated type. Compliance-shaped, not human-shaped.
- **Generic SaaS purple-gradient hero deck** — gradient text, identical icon-grid feature cards, hero-metric vanity numbers. Marketing aesthetics leaking into a workhorse product.
- **Notion-style infinite-canvas freedom** — drag-everywhere, drop-anywhere, blank-page-by-default. NU-Fluence is structured wiki with taxonomy and ownership, not a blank canvas.

## Design Principles

1. **Information density without clutter.** Dense like Linear, not crowded like Workday. Reveal only what the current task needs; the rest is a click away.
2. **Color earns its place.** The Studio Slate vivid blue (#2563EB) is signal, not decoration. Status colors mean status. Everything else is tinted neutral.
3. **Structured over freeform.** Flows have a shape. Forms have an order. Lists have a taxonomy. The platform decides where things go so the user doesn't have to.
4. **Show the work, not the chrome.** UI fades; the employee's task is the foreground. Borders are subtle, shadows are flat, motion is short. No frame announces itself before content.
5. **Predictable across surfaces.** Same patterns in HRMS, Hire, Grow, Fluence. A user who learns one sub-app already half-knows the next. Cross-bundle drift is a bug.

## Accessibility & Inclusion

- **WCAG 2.1 AA** baseline across all interactive surfaces.
- Visible focus rings on every focusable element (already wired via `--border-focus` in globals.css).
- `prefers-reduced-motion` respected — all transitions collapse to 0ms (already wired).
- Tinted neutrals throughout — no pure `#000` / `#fff`, gray text never on saturated backgrounds.
- Status uses color + label, never color alone (icon + text on every badge).
- Mobile-friendly tap targets (44×44 min) on touch breakpoints; desktop-first compact sizing (h-9 / 36px) on pointer breakpoints.
