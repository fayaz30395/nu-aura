# US-2G08K1MZJEP4: Remove authProvider from forgot-password API response body - frontend no longer branches UI on it, but raw JSON still leaks GOOGLE-vs-local account-enumeration info

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Forgot-password response no longer includes authProvider field
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** pending
