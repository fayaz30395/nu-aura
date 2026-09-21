# RV-2FZNMDJPNDAW: Added service-level unit tests for Fluence core mutation paths (previously only controller-level MockMvc coverage existed, and BlogPostService/WallService had zero unit tests). WikiPageServiceTest: create (event+activity), update (edit-lock conflict rejection + success + event), publish (approval-routing branch + direct-publish branch + watcher notification), delete (event pub + not-found), togglePin (set/clear), archive. BlogPostServiceTest: same create/update/publish/schedule/archive/delete shape (no approval routing for blog). WallServiceTest: createPost (success + author-not-found), updatePost (author-allowed vs non-author-denied), deletePost (soft-delete via active=false, author vs non-author), pinPost, addReaction (new + update-existing), removeReaction (delete + decrement count).

> **Story:** US-2FZFCY0XCFPH
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
