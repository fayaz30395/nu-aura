F-001 | FIXED | frontend/lib/services/platform/fluence.service.ts | wiki/blog/template getters parse the JSON-string content from the backend into the editor object
F-002 | FIXED | frontend/lib/services/platform/fluence.service.ts | same root cause; edit form now loads the parsed doc and save re-stringifies it
F-003 | FIXED | frontend/lib/services/platform/fluence.service.ts | blog create/update send content as a string and drop empty categoryId; failure toast comes from the global MutationCache handler (lib/queryClient.ts)
F-004 | FIXED | frontend/lib/services/platform/fluence.service.ts | template create/update send content as a string
F-005 | FIXED | frontend/lib/services/platform/fluence.service.ts | search now maps the backend Page<FluenceDocument> to the UI result shape and sends `contentType` (was `type`)
F-006 | FIXED | backend/src/main/resources/db/migration/V349__seed_enable_fluence_feature_flag.sql | seeds enable_fluence for all existing tenants (same pattern as V130); new tenants still need the flag seeded
F-007 | NEEDS-DECISION | none | global MutationCache onError already toasts 400s; not reproducible from code. Whether markup should be rejected at all is a product call
F-008 | FIXED | frontend/app/fluence/wiki/new/page.tsx | invalid-form handler toasts the first validation error (e.g. "Space is required") for Publish and Save Draft
F-009 | NEEDS-DECISION | none | spans 5 screens (templates, drive, analytics, dashboard, /tasks); choose "access message" vs "hide the entry"
F-010 | FIXED | backend/.../api/knowledge/controller/WikiSpaceController.java | pageCount was never populated in WikiSpaceDto; now set via getPageCountBySpace in get/list/active
F-011 | FIXED | frontend/app/helpdesk/page.tsx, frontend/lib/hooks/queries/useHelpdeskSla.ts | SLA tiles hidden and dashboard query disabled without HELPDESK:SLA_MANAGE
F-012 | SKIPPED | none | PostComposer already has max(2000) with an inline error under the textarea; could not reproduce from code
F-013 | FIXED | frontend/app/fluence/wiki/[slug]/page.tsx | status badge uses light variant (was invisible), Version row hidden when backend sends none, "1 view" pluralised
F-014 | FIXED | frontend/app/fluence/my-content/page.tsx | New Page / New Post buttons and empty-state CTAs gated on WIKI_CREATE / BLOG_CREATE
F-015 | FIXED | frontend/app/fluence/templates/new/page.tsx | validation handler used stale `errors`; now reads the errors passed by handleSubmit
F-016 | FIXED | frontend/app/recognition/page.tsx | receiver is now EmployeeSearchAutocomplete (same as wall praise); raw backend toast left as is
F-003 (re-fix) | FIXED | backend BlogPostService.java, util/SlugGenerator.java (new) | blank slug now generated server-side from title (unique per tenant, -2/-3 suffix); update keeps existing slug when none sent
F-004 (re-fix) | FIXED | backend DocumentTemplateService.java | same slug generation from template name
F-005 (re-fix) | FIXED | frontend fluence.service.ts, types/platform/fluence.ts, app/fluence/search/page.tsx | null/invalid updatedAt becomes undefined; date line not rendered
