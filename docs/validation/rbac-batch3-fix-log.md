# RBAC Batch 3 Fix Log

**Date:** 2026-03-31
**Scope:** 15 unprotected pages — Fluence, Attendance, Learning, Recruitment, Travel, NU-Mail

## Pattern Applied

Each page uses `usePermissions()` from `@/lib/hooks/usePermissions` with the standard guard:

```tsx
const { hasAnyPermission, isReady } = usePermissions();
const hasAccess = hasAnyPermission(Permissions.X, Permissions.Y);

useEffect(() => {
  if (isReady && !hasAccess) router.replace('/me/dashboard');
}, [isReady, hasAccess, router]);

if (!isReady || !hasAccess) return null;
```

SuperAdmin/TenantAdmin bypass is automatic via `hasAnyPermission` internals.

## Pages Fixed

| #  | Page                                               | Permissions Used                                                         |
|----|----------------------------------------------------|--------------------------------------------------------------------------|
| 1  | `frontend/app/fluence/page.tsx`                    | KNOWLEDGE_VIEW, WIKI_VIEW, BLOG_VIEW                                     |
| 2  | `frontend/app/fluence/dashboard/page.tsx`          | KNOWLEDGE_VIEW, WIKI_VIEW, BLOG_VIEW                                     |
| 3  | `frontend/app/fluence/search/page.tsx`             | KNOWLEDGE_VIEW, WIKI_VIEW, BLOG_VIEW                                     |
| 4  | `frontend/app/fluence/wall/page.tsx`               | KNOWLEDGE_VIEW, WALL_FLUENCE_VIEW                                        |
| 5  | `frontend/app/fluence/templates/[id]/page.tsx`     | KNOWLEDGE_TEMPLATE_READ, KNOWLEDGE_VIEW                                  |
| 6  | `frontend/app/fluence/wiki/[slug]/page.tsx`        | WIKI_VIEW, KNOWLEDGE_WIKI_READ, KNOWLEDGE_VIEW                           |
| 7  | `frontend/app/fluence/wiki/[slug]/edit/page.tsx`   | WIKI_MANAGE, KNOWLEDGE_WIKI_UPDATE, KNOWLEDGE_MANAGE                     |
| 8  | `frontend/app/fluence/wiki/new/page.tsx`           | WIKI_CREATE, KNOWLEDGE_WIKI_CREATE, KNOWLEDGE_MANAGE                     |
| 9  | `frontend/app/nu-mail/page.tsx`                    | EMAIL_VIEW, EMAIL_SEND (+ existing auth check)                           |
| 10 | `frontend/app/attendance/comp-off/page.tsx`        | ATTENDANCE_VIEW_SELF, ATTENDANCE_VIEW_ALL, ATTENDANCE_MANAGE             |
| 11 | `frontend/app/attendance/shift-swap/page.tsx`      | ATTENDANCE_VIEW_SELF, ATTENDANCE_VIEW_ALL, SHIFT_VIEW, ATTENDANCE_MANAGE |
| 12 | `frontend/app/learning/courses/[id]/play/page.tsx` | TRAINING_VIEW, LMS_COURSE_VIEW, TRAINING_MANAGE                          |
| 13 | `frontend/app/learning/paths/page.tsx`             | TRAINING_VIEW, LMS_COURSE_VIEW, TRAINING_MANAGE                          |
| 14 | `frontend/app/recruitment/interviews/page.tsx`     | RECRUITMENT_VIEW, RECRUITMENT_VIEW_ALL, RECRUITMENT_MANAGE               |
| 15 | `frontend/app/travel/new/page.tsx`                 | TRAVEL_CREATE, TRAVEL_VIEW, TRAVEL_MANAGE (+ existing auth check)        |

## Notes

- All permission constants already existed in `usePermissions.ts` (no new constants added).
- Pages 9 and 15 already had `useAuth()` authentication checks; permission gates were layered on
  top.
- Write pages (edit, new, create) use write-level permissions (MANAGE, CREATE, UPDATE).
- Read pages use view-level permissions (VIEW, READ).
- MODULE:MANAGE hierarchy in `hasPermission()` means users with MANAGE automatically pass VIEW
  checks.
