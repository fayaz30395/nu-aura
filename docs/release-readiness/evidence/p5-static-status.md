Static code reading only; nothing was run. Verify UNCLEAR and STILL OPEN rows in the browser.

Paths are under `frontend/` unless noted. Commit c9ee9e54 and later are the fix range; some fixes predate it (16d80143).

| ID | Verdict | Evidence | Reason |
|----|---------|----------|--------|
| F-007 | FIXED | lib/queryClient.ts:19-24 (global MutationCache onError), lib/utils/error-handler.ts:128,184,340-360 | Every 4xx mutation error now toasts the server message (400 maps to VALIDATION and shows the message). Only wiki space, wiki page and wall post mutations were read; none opts out via skipGlobalError. |
| F-008 | FIXED | app/fluence/wiki/new/page.tsx:44,152-158,287,350 | spaceId is required in the schema, and `onInvalid` shows a "Check the form" toast with the first error. It is wired to both Publish and Save Draft. |
| F-009 | FIXED | app/fluence/templates/page.tsx, app/tasks/page.tsx, drive, analytics and dashboard pages (changed in c9ee9e54) | Queries are gated by permission and a 403 renders "You don't have access to ..." instead of an empty state. The drive, analytics and dashboard diffs were not read line by line. |
| F-010 | FIXED-CODE | backend WikiSpaceController.java:36-39 (count added in 16d80143); lib/hooks/queries/useFluence.ts:336-345 | The backend now returns pageCount. useCreateWikiPage invalidates only wikiPages, not wikiSpaces, so the card count can stay stale for up to the 5 minute staleTime. Needs a browser check. (`1b7e0090` invalidates wikiSpaces; not proven live) |
| F-011 | FIXED | app/helpdesk/page.tsx:29-30,166 | The dashboard query is gated by HELPDESK_SLA_MANAGE and the SLA tiles are filtered out without it, so no 403 call or admin tiles for EMP. |
| F-012 | FIXED | components/wall/PostComposer.tsx:32,224-225 | Zod max(2000) with an inline error message under the textarea, so an over-long post is no longer silent. |
| F-013 | UNCLEAR | app/fluence/wiki/[slug]/page.tsx:726-735,772,1046 | Version is guarded with `!= null` and views are pluralised. The empty status pill is a Badge using a CSS-var colour; whether the text shows needs rendering. |
| F-014 | FIXED | app/fluence/my-content/page.tsx:61-70 | "New Page" is wrapped in PermissionGate for KNOWLEDGE_WIKI_CREATE. |
| F-015 | FIXED | app/fluence/templates/new/page.tsx:163-166,239,248-250 | The toast uses the first field error ("Template name is required"), the name input has an aria-label and an inline error. |
| F-016 | FIXED | app/recognition/page.tsx:65,719-730; lib/utils/error-handler.ts:308-315 | The receiver is an EmployeeSearchAutocomplete picker, and "Invalid value 'x' for field" text is replaced with a readable message. |
