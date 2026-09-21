# RV-2G03YKVCYCM3: Blog watcher notification review

> **Story:** US-2FZSYZ7WRSJ4
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

No BlogPostWatch table exists (unlike WikiPageWatch). Approximated the watcher audience as the post author plus distinct commenters/likers; added notifyBlogWatchers to FluenceNotificationService and wired into BlogPostService.publishPost, excluding the actor. Compiles clean.
