# RV-2FZHHD8MRVVK: Enforced FluenceEditLockService server-side: added FluenceEditLockService.requireNoConflictingLock(tenantId, contentType, contentId, userId) throwing IllegalStateException (409) when another user holds the lock. Called from WikiPageService.updatePage (contentType=WIKI) and BlogPostService.updatePost (contentType=BLOG) right after loading the entity, before any mutation. The lock was previously advisory-only (checked only via the acquire/release/heartbeat UI-courtesy endpoints) — the backend mutation path is now the source of truth, closing the concurrent-edit data-loss gap. Added FluenceEditLockServiceTest (no-lock/own-lock/other-user-lock cases) and a WikiPageApprovalTest case asserting updatePage propagates the conflict.

> **Story:** US-2FZFCXMESBXC
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
