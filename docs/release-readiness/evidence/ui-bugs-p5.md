# UI bugs - phase P5 (NU-Fluence, announcements, recognition, helpdesk, tasks)

Found by `scripts/e2e/p5-sweep.mjs` (30 routes x EMP/MGR/HR, desktop + mobile 390; output `p5-sweep.json`) and the flow probes `p5-a..s.mjs`. Test data prefix `NUAURA_TEST_P5_R1` / `_R2` (space `3ad822cc-9f37-448c-8417-d4b3da52939e`; wiki pages `ba12d612-728f-4717-8f45-1bd60c797c7d`, `de931c4b-fa1b-4b68-a25f-6ca2b0f4fc57`, `856e60e7-6e8d-4e2e-bd38-7b04ce4c415a`, `1974494e-541b-40ac-9e84-7ffa292ce519`; wall post `a602557d-14c3-4287-80a8-e9c2fce086b0`). Environment as in `ui-bugs.md` (commit `c0e2db9a`, FE :3000, BE :8080 dev, Chromium headless). Roles: EMP arun@, MGR sumit@, HR admin@. Screenshots in `screenshots/ui-p5-*.png`. No product code was changed.

## Summary

| ID | Sev | Title |
|---|---|---|
| F-001 | High | Wiki page view shows raw editor JSON instead of the content |
| F-002 | High | Wiki edit loads raw JSON into the editor; saving corrupts the stored content |
| F-003 | High | Blog post cannot be created (400 "Malformed JSON request"), no message shown |
| F-004 | High | Template cannot be created (400 "Malformed JSON request"), no message shown |
| F-005 | High | Fluence search page says "No results found" although the API returns the page |
| F-006 | High | Edit lock is never acquired: lock calls return 403 for HR admin (two-editor protection absent) |
| F-007 | Medium | Server-rejected input (400 "potentially malicious content") fails silently on Wiki space, Wiki page and Wall post |
| F-008 | Medium | Wiki "Publish" with no space chosen does nothing and says nothing |
| F-009 | Medium | 403 data calls are shown as empty states ("No templates", "No files", zero analytics, "No tasks") |
| F-010 | Medium | Wiki space card and header show "0 pages" / "0 total pages" while a page exists |
| F-011 | Medium | Helpdesk home shows SLA/Escalation admin tiles to EMP and calls an API that returns 403 |
| F-012 | Low | Wall: a 6000-character post is not sent and nothing is shown |
| F-013 | Low | Wiki page header: empty status badge, "Version v", "1 views" |
| F-014 | Low | "My Content" shows "New Page" to EMP/MGR; click ends in an Access Denied toast |
| F-015 | Low | Template save: generic "Please check your input" with no field named |
| F-016 | Low | Recognition: raw backend text shown in the error toast; receiver is a free-text "Employee ID" |

Not logged: draft and private wiki pages stayed hidden from MGR/EMP in list, direct URL (404) and API (404); `<b>x</b>` posted to the Wall renders as inert text; no horizontal overflow at 390px on any of the 30 routes; HR cannot create announcements (already UI-003); screens without a heading (UI-012); `/fluence/wiki/new` redirect for EMP/MGR (gate, see `defects-fluence.md` DEF-FLUENCE-05).

---

## F-001 - Wiki page view shows raw editor JSON

- **Route/role:** `/fluence/wiki/<id>` · HR (same for MGR, who can open it) · desktop.
- **Steps:** 1. As HR create space, then `/fluence/wiki/new`, title + body "Hello body ...", Publish, pick the space, "Publish Page". 2. Page opens.
- **Expected:** the typed text is shown as formatted text.
- **Actual:** the body shows `{"type": "doc", "content": [{"type": "paragraph", ... "text": "Hello body ..."}]}`.
- **Severity:** High - every wiki page is unreadable. **Frequency:** 4/4 pages.
- **Evidence:** `screenshots/ui-p5-e-published.png`. API list returns content as a JSON string (`"content":"{\"type\":\"doc\"..."`), the page renders it as plain text.

## F-002 - Wiki edit loads raw JSON, save corrupts content

- **Route/role:** `/fluence/wiki/<id>/edit` · HR.
- **Steps:** 1. Open edit on the page from F-001. 2. Editor shows the JSON text. 3. Click at the end, type " appended", Save Changes.
- **Expected:** editor shows the page text; the edit is appended to it.
- **Actual:** editor content is the JSON string; Save sends it back as text, "Wiki page updated successfully" toast, and the page now shows `... "type": "t appendedext"}]}]}` (JSON broken further).
- **Severity:** High (content loss/corruption). **Frequency:** 2/2.
- **Evidence:** `screenshots/ui-p5-f-edit.png`; `PUT /api/v1/knowledge/wiki/pages/<id>` returned 200.

## F-003 - Blog post cannot be created

- **Route/role:** `/fluence/blogs/new` · HR.
- **Steps:** Title, Excerpt, body text, "Create Post".
- **Expected:** post saved, user sent to it.
- **Actual:** `POST /api/v1/knowledge/blogs` returns 400 `Malformed JSON request`; the form stays as is, no toast, no inline error. Request sends `content` as an object and `categoryId: ""` (the wiki form was fixed to send a string; this form was not).
- **Severity:** High - blogs cannot be created; failure is silent. **Frequency:** 4/4.
- **Evidence:** `screenshots/ui-p5-g-created.png`.

## F-004 - Template cannot be created

- **Route/role:** `/fluence/templates/new` · HR.
- **Steps:** name, body text, "Save Template".
- **Expected:** template saved and listed.
- **Actual:** `POST /api/v1/knowledge/templates` returns 400 `Malformed JSON request` (content sent as an object); no message, page unchanged. "Create and use a template" (plan P5) is blocked.
- **Severity:** High. **Frequency:** 3/3. **Evidence:** `screenshots/ui-p5-i-settings.png`.

## F-005 - Search shows no results for existing content

- **Route/role:** `/fluence/search` · HR and MGR.
- **Steps:** type `NUAURA_TEST_P5_R2` (or "wiki page EDITED"), wait, press Enter.
- **Expected:** the published page is listed.
- **Actual:** "No results found. Try different keywords or remove filters." The same request `GET /api/v1/fluence/search?query=...` returns 200 with the page (also via the browser fetch as EMP/MGR), so the page does not render the response.
- **Severity:** High - search unusable. **Frequency:** 4/4. **Evidence:** `screenshots/ui-p5-m-search.png`.

## F-006 - Edit lock returns 403 for HR admin

- **Route/role:** `/fluence/wiki/<id>/edit` · HR.
- **Actual:** `POST /api/v1/fluence/edit-lock/WIKI/<id>` returns 403 three times on every opening; editing continues without a lock and no notice. A second editor is therefore never blocked (plan P5 fail condition). Matches DEF-FLUENCE-06 (feature flag), still reproducing.
- **Severity:** High. **Frequency:** 3/3. A second user with edit rights was not available, so overwrite itself was not shown.

## F-007 - Rejected input fails silently

- **Routes:** `/fluence/wiki` (Create Space dialog), `/fluence/wiki/new` (Publish), `/fluence/wall` (Post) · HR/EMP.
- **Steps:** enter text such as `<img src=x onerror=...>` in the space description, the page body or a wall post and submit.
- **Expected:** a visible message ("contains characters that are not allowed").
- **Actual:** server returns 400 `Invalid input: potentially malicious content in ...`; dialog/form stays, no toast or inline error, user cannot tell why nothing happened.
- **Severity:** Medium. **Frequency:** 3/3 (one per screen). Whether plain-text markup should be rejected at all is a product decision (plan P5 expects it to display as text).

## F-008 - Publish with no space does nothing

- **Route/role:** `/fluence/wiki/new` · HR. **Steps:** title and body, Publish, then "Publish Page" in the drawer without choosing a space.
- **Actual:** no request, no message, drawer stays. **Expected:** "Select a space" error. **Severity:** Medium. **Frequency:** 3/3.

## F-009 - 403 shown as empty state

- **Routes/role:** EMP and MGR · `/fluence/templates` ("No templates"), `/fluence/drive` (zero counts + upload box), `/fluence/analytics` (all zero charts), `/fluence/dashboard`, `/tasks` ("No tasks assigned to you / Create First Task").
- **Actual:** the data call returns 403 (`/knowledge/templates`, `/fluence/attachments/recent`, `/pm/tasks/assignee/...`) and the page reads as "nothing exists", with console errors. **Expected:** an access message, or the screen not offered. Overlaps UI-007 for the status codes; the misleading empty state is the new part.
- **Severity:** Medium. **Frequency:** 2/2 per screen. **Evidence:** `p5-sweep.json`, `screenshots/ui-p5-r-tasks.png`.

## F-010 - Space page counts stay at 0

- **Route/role:** `/fluence/wiki` · HR/MGR/EMP. After a page is published in the space, the card says "0 pages" and the header "All Spaces 0 total pages" while the page is listed below. **Severity:** Medium. **Frequency:** 5/5.

## F-011 - Helpdesk admin tiles for EMP

- **Route/role:** `/helpdesk` · EMP (also HR). Tiles "SLA Policies / Escalations / SLA Dashboard" shown; `GET /api/v1/helpdesk/sla/dashboard` returns 403 with 2 console errors on each load. **Severity:** Medium. **Frequency:** 2/2. **Evidence:** `screenshots/ui-p5-r-helpdesk.png`.

## F-012 - Long wall post silently not sent

- **Route/role:** `/fluence/wall` · EMP. Paste 6000 characters, click Post: no request, no toast, text stays. **Expected:** a length message or a counter. **Severity:** Low. **Frequency:** 2/2.

## F-013 - Wiki header details

- **Route:** `/fluence/wiki/<id>` · HR. The status pill beside the title is empty (text "PUBLISHED" exists in the DOM but is not visible), the sidebar says "Version v" with no number, and "1 views". **Severity:** Low. **Frequency:** 4/4. **Evidence:** `screenshots/ui-p5-e-published.png`.

## F-014 - "New Page" offered to users who cannot create

- **Route/role:** `/fluence/my-content` · EMP/MGR. "New Page" is shown; click redirects to `/me/dashboard` with an "Access Denied" toast. **Severity:** Low. **Frequency:** 2/2.

## F-015 - Generic template validation message

- **Route:** `/fluence/templates/new` · HR. "Save Template" with empty name: toast "Validation Error / Please check your input", the name field (a textarea with no label) shows nothing. **Severity:** Low. **Frequency:** 2/2.

## F-016 - Recognition error text and receiver input

- **Route/role:** `/recognition` · HR. Give Recognition with receiver `not-a-real-id`: toast "Error Invalid value 'not-a-real-id' for fiel..." (raw backend text). The receiver is a free-text "Employee ID" box, not a picker. **Severity:** Low. **Frequency:** 2/2.

---

## Not covered

Second-editor overwrite, Drive upload, blog list/detail/edit (no blog could be created, F-003), template "use", comments/reactions on wiki, announcements create (UI-003), NU-Mail/Calendar (not available to the roles / needs Google), dark mode and keyboard checks (P6). Target of 25 bugs not reached: 16 logged; several screens are blocked by F-003/F-004.
