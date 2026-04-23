#!/usr/bin/env python3
"""
NU-AURA use-case catalog generator.

Produces docs/qa/use-cases.yaml with 1000+ deterministic, uniquely-ID'd use cases
covering the 4 sub-apps × 9 roles × (RBAC, CRUD, workflows, forms, modules,
cross-cutting). Re-run anytime to rebuild.

Run:
    python3 docs/qa/generate-use-cases.py

Output is stable across runs — same inputs → same YAML byte-for-byte.
"""
from __future__ import annotations
from pathlib import Path
from datetime import date

# ---------------------------------------------------------------------------
# Canonical dimensions
# ---------------------------------------------------------------------------
ROLES = [
    "SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "HR_MANAGER",
    "RECRUITMENT_ADMIN", "FINANCE_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE",
]
ROLE_EMAIL = {
    "SUPER_ADMIN": "fayaz.m@nulogic.io",
    "TENANT_ADMIN": "sarankarthick.maran@nulogic.io",
    "HR_ADMIN": "jagadeesh@nulogic.io",
    "HR_MANAGER": "jagadeesh@nulogic.io",
    "RECRUITMENT_ADMIN": "suresh@nulogic.io",
    "FINANCE_ADMIN": "jagadeesh@nulogic.io",
    "MANAGER": "sumit@nulogic.io",
    "TEAM_LEAD": "mani@nulogic.io",
    "EMPLOYEE": "saran@nulogic.io",
}
ROLE_LEVEL = {r: 100 - 5*i for i, r in enumerate(ROLES)}

# Routes — page-level RBAC
ROUTES = [
    ("/me/dashboard", "self"),
    ("/me/profile", "self"),
    ("/me/leave", "self"),
    ("/me/attendance", "self"),
    ("/me/payslips", "self"),
    ("/me/expenses", "self"),
    ("/me/approvals", "self"),
    ("/me/documents", "self"),
    ("/employees", "hr"),
    ("/departments", "hr"),
    ("/attendance", "hr"),
    ("/leave", "hr"),
    ("/payroll", "finance_or_hr"),
    ("/payroll/runs", "finance_or_hr"),
    ("/hire/jobs", "hire"),
    ("/hire/candidates", "hire"),
    ("/hire/pipeline", "hire"),
    ("/hire/agencies", "hire"),
    ("/grow/reviews", "grow"),
    ("/grow/okrs", "grow"),
    ("/grow/feedback", "grow"),
    ("/grow/lms", "grow"),
    ("/fluence", "all"),
    ("/fluence/wiki", "all"),
    ("/fluence/wall", "all"),
    ("/fluence/drive", "all"),
    ("/settings/roles", "super_tenant"),
    ("/settings/permissions", "super_tenant"),
    ("/settings/leave-policies", "hr_admin_plus"),
    ("/settings/payroll-config", "finance_plus"),
    ("/admin/tenants", "super_only"),
    ("/audit", "super_tenant"),
    ("/workflows", "all"),
    ("/helpdesk", "all"),
    ("/analytics", "hr_admin_plus"),
    ("/assets", "hr"),
    ("/contracts", "hr"),
    ("/offboarding", "hr"),
    ("/expenses", "hr"),
    ("/benefits", "hr"),
]

# Access rules per route scope
ACCESS = {
    "self": {r: "allow" for r in ROLES},
    "all":  {r: "allow" for r in ROLES},
    "hr":   {**{r: "allow" for r in ROLES if r != "EMPLOYEE"}, "EMPLOYEE": "deny_redirect"},
    "hire": {"SUPER_ADMIN": "allow", "TENANT_ADMIN": "allow", "HR_ADMIN": "allow",
             "HR_MANAGER": "allow", "RECRUITMENT_ADMIN": "allow", "MANAGER": "allow",
             "FINANCE_ADMIN": "deny_redirect", "TEAM_LEAD": "deny_redirect",
             "EMPLOYEE": "deny_redirect"},
    "grow": {r: "allow" for r in ROLES if r not in ("RECRUITMENT_ADMIN", "FINANCE_ADMIN")}
            | {"RECRUITMENT_ADMIN": "deny_redirect", "FINANCE_ADMIN": "deny_redirect"},
    "finance_or_hr": {"SUPER_ADMIN": "allow", "TENANT_ADMIN": "allow", "HR_ADMIN": "allow",
                      "HR_MANAGER": "allow", "FINANCE_ADMIN": "allow",
                      "RECRUITMENT_ADMIN": "deny_redirect", "MANAGER": "deny_redirect",
                      "TEAM_LEAD": "deny_redirect", "EMPLOYEE": "deny_redirect"},
    "finance_plus": {"SUPER_ADMIN": "allow", "TENANT_ADMIN": "allow", "FINANCE_ADMIN": "allow",
                     "HR_ADMIN": "deny_redirect", "HR_MANAGER": "deny_redirect",
                     "RECRUITMENT_ADMIN": "deny_redirect", "MANAGER": "deny_redirect",
                     "TEAM_LEAD": "deny_redirect", "EMPLOYEE": "deny_redirect"},
    "hr_admin_plus": {"SUPER_ADMIN": "allow", "TENANT_ADMIN": "allow", "HR_ADMIN": "allow",
                      "HR_MANAGER": "deny_redirect", "RECRUITMENT_ADMIN": "deny_redirect",
                      "FINANCE_ADMIN": "deny_redirect", "MANAGER": "deny_redirect",
                      "TEAM_LEAD": "deny_redirect", "EMPLOYEE": "deny_redirect"},
    "super_tenant": {"SUPER_ADMIN": "allow", "TENANT_ADMIN": "allow",
                     **{r: "deny_redirect" for r in ROLES if r not in ("SUPER_ADMIN","TENANT_ADMIN")}},
    "super_only": {"SUPER_ADMIN": "allow",
                   **{r: "deny_redirect" for r in ROLES if r != "SUPER_ADMIN"}},
}

# Entities for CRUD expansion
ENTITIES = [
    ("employee", "/api/v1/employees", "hr"),
    ("department", "/api/v1/departments", "hr"),
    ("leave_request", "/api/v1/leaves", "self_or_hr"),
    ("attendance", "/api/v1/attendance", "self_or_hr"),
    ("payroll_run", "/api/v1/payroll/runs", "finance_or_hr"),
    ("expense", "/api/v1/expenses", "self_or_finance"),
    ("job", "/api/v1/recruitment/jobs", "hire"),
    ("candidate", "/api/v1/recruitment/applicants", "hire"),
    ("review", "/api/v1/reviews", "grow_self"),
    ("okr", "/api/v1/okr", "grow_self"),
    ("wiki_page", "/api/v1/knowledge/wiki/pages", "all"),
    # Asset + contract endpoints are scope-filtered at the service layer for EMPLOYEE
    # (GET returns only self's rows). Use `self_scoped_hr` to reflect that.
    ("asset", "/api/v1/assets", "self_scoped_hr"),
    ("contract", "/api/v1/contracts", "self_scoped_hr"),
    ("role", "/api/v1/roles", "super_tenant"),
    ("permission", "/api/v1/permissions", "super_tenant"),
]

CRUD_OPS = ["create", "read_list", "read_one", "update", "delete"]

# Access matrix for CRUD: role × op
def crud_access(scope: str, op: str, role: str) -> str:
    """Return allow | allow_scoped | deny | allow_self based on scope/op/role."""
    if role == "SUPER_ADMIN":
        return "allow"
    if scope == "hr":
        if role in ("TENANT_ADMIN", "HR_ADMIN"): return "allow"
        if role == "HR_MANAGER" and op in ("create", "read_list", "read_one", "update"): return "allow"
        if role == "HR_MANAGER" and op == "delete": return "deny"
        if role == "MANAGER" and op in ("read_list", "read_one"): return "allow_scoped"
        if role == "TEAM_LEAD" and op in ("read_list", "read_one"): return "allow_scoped"
        return "deny"
    if scope == "self_scoped_hr":
        # Like `hr` for mutation ops, but reads return scope-filtered rows
        # for lower-privilege roles. The backend `@RequiresPermission` passes
        # but the service layer filters by owner_id.
        if role in ("TENANT_ADMIN", "HR_ADMIN", "HR_MANAGER"): return "allow"
        if op in ("read_list", "read_one"):
            if role in ("MANAGER", "TEAM_LEAD"): return "allow_scoped"
            if role in ("EMPLOYEE", "RECRUITMENT_ADMIN", "FINANCE_ADMIN"): return "allow_self"
        return "deny"
    if scope == "all":
        return "allow"
    if scope == "self_or_hr":
        if role in ("TENANT_ADMIN", "HR_ADMIN", "HR_MANAGER"): return "allow"
        if op in ("create", "read_list", "read_one") and role == "EMPLOYEE": return "allow_self"
        return "allow_self" if op != "delete" else "deny"
    if scope == "self_or_finance":
        if role in ("TENANT_ADMIN", "FINANCE_ADMIN"): return "allow"
        if role == "EMPLOYEE" and op != "delete": return "allow_self"
        return "deny" if op in ("delete",) else "allow_self"
    if scope == "finance_or_hr":
        if role in ("TENANT_ADMIN", "HR_ADMIN", "HR_MANAGER", "FINANCE_ADMIN"): return "allow"
        return "deny"
    if scope == "hire":
        if role in ("TENANT_ADMIN", "HR_ADMIN", "HR_MANAGER", "RECRUITMENT_ADMIN"): return "allow"
        if role == "MANAGER" and op in ("read_list", "read_one", "create"): return "allow_scoped"
        return "deny"
    if scope == "grow_self":
        if role in ("TENANT_ADMIN", "HR_ADMIN", "HR_MANAGER"): return "allow"
        if op in ("read_list", "read_one", "update"): return "allow_self"
        if op == "create" and role in ("MANAGER", "TEAM_LEAD"): return "allow_scoped"
        return "deny"
    if scope == "super_tenant":
        if role in ("TENANT_ADMIN",): return "allow"
        return "deny"
    return "deny"

# Workflows — multi-actor sagas.  Each step has an actor and an expected transition.
WORKFLOWS = {
    "leave_request": {
        "title": "Leave request end-to-end",
        "actors": ["EMPLOYEE", "TEAM_LEAD", "HR_MANAGER"],
        "steps": [
            ("apply", "EMPLOYEE", "status=PENDING"),
            ("approve_step1", "TEAM_LEAD", "status=LEAD_APPROVED"),
            ("approve_step2", "HR_MANAGER", "status=APPROVED; balance_decremented"),
            ("notify_requester", "system", "employee_notified"),
            ("audit", "system", "audit_row_written"),
        ],
        "negatives": [
            ("reject_step1", "TEAM_LEAD", "status=REJECTED; balance_intact"),
            ("reject_step2", "HR_MANAGER", "status=REJECTED; balance_intact"),
            ("cancel_before_approval", "EMPLOYEE", "status=CANCELLED"),
            ("cancel_after_step1", "EMPLOYEE", "status=CANCELLED; TL_notified"),
            ("modify_before_approval", "EMPLOYEE", "PENDING with updated fields; approvers re-notified"),
            ("sla_breach_escalation", "system", "escalated to HR_ADMIN after 48h"),
            ("insufficient_balance", "EMPLOYEE", "422 with balance_hint in response"),
            ("overlap_existing_leave", "EMPLOYEE", "409 conflict"),
            ("retroactive_apply_rejected_non_sick", "EMPLOYEE", "422 start_date_past"),
            ("concurrent_approve_different_devices", "TEAM_LEAD", "first_wins; second_409"),
        ],
    },
    "expense_claim": {
        "title": "Expense claim submission and reimbursement",
        "actors": ["EMPLOYEE", "MANAGER", "FINANCE_ADMIN"],
        "steps": [
            ("submit", "EMPLOYEE", "status=PENDING; receipt_stored"),
            ("manager_approve", "MANAGER", "status=MANAGER_APPROVED"),
            ("finance_approve", "FINANCE_ADMIN", "status=APPROVED; queued_for_next_payroll"),
            ("reimburse", "system", "appears_on_payslip"),
        ],
        "negatives": [
            ("reject_manager", "MANAGER", "status=REJECTED"),
            ("reject_finance", "FINANCE_ADMIN", "status=REJECTED"),
            ("receipt_file_too_large", "EMPLOYEE", "413 payload_too_large"),
            ("receipt_wrong_mime", "EMPLOYEE", "415 unsupported_media_type"),
            ("date_older_than_90d", "EMPLOYEE", "422 outside_window"),
            ("amount_zero_or_negative", "EMPLOYEE", "422 amount_invalid"),
            ("currency_not_supported", "EMPLOYEE", "422 currency_unsupported"),
            ("duplicate_submission_detected", "EMPLOYEE", "409 likely_duplicate (same receipt hash)"),
        ],
    },
    "payroll_run": {
        "title": "Monthly payroll run",
        "actors": ["HR_ADMIN", "FINANCE_ADMIN", "TENANT_ADMIN"],
        "steps": [
            ("create_run", "HR_ADMIN", "status=DRAFT"),
            ("dry_run_calculate", "HR_ADMIN", "totals_previewed; formula_dag_evaluated"),
            ("submit_for_approval", "HR_ADMIN", "status=PENDING_APPROVAL"),
            ("finance_approve", "FINANCE_ADMIN", "status=FINANCE_APPROVED"),
            ("tenant_admin_release", "TENANT_ADMIN", "status=RELEASED; payslips_generated; notifications_sent"),
        ],
        "negatives": [
            ("overlap_period", "HR_ADMIN", "409 period_overlap_with_existing_run"),
            ("cutoff_after_period_end", "HR_ADMIN", "422 cutoff_invalid"),
            ("formula_dag_cycle", "HR_ADMIN", "500 or graceful 422 dag_cycle_detected"),
            ("finance_reject_returns_to_draft", "FINANCE_ADMIN", "status=DRAFT"),
            ("tenant_admin_cancel", "TENANT_ADMIN", "status=CANCELLED; audit_entry"),
            ("retry_after_release_blocked", "HR_ADMIN", "403 released_runs_immutable"),
            ("employee_on_unpaid_leave_zero_pay", "system", "row_present_with_zero_net"),
            ("terminated_employee_final_settlement", "system", "settlement_row_created"),
        ],
    },
    "hiring": {
        "title": "Hire a candidate end-to-end",
        "actors": ["MANAGER", "HR_ADMIN", "RECRUITMENT_ADMIN", "TENANT_ADMIN"],
        "steps": [
            ("raise_requisition", "MANAGER", "req_created; chain=[HR_ADMIN,TENANT_ADMIN]"),
            ("hr_admin_approve_req", "HR_ADMIN", "req_status=HR_APPROVED"),
            ("tenant_admin_approve_req", "TENANT_ADMIN", "req_status=APPROVED; posted_on_career_page"),
            ("create_candidate", "RECRUITMENT_ADMIN", "candidate_in_stage=APPLIED"),
            ("advance_to_screen", "RECRUITMENT_ADMIN", "stage=SCREEN"),
            ("advance_to_interview", "RECRUITMENT_ADMIN", "stage=INTERVIEW"),
            ("interviewer_scorecard_submit", "MANAGER", "scorecard_saved; agg_rating_computed"),
            ("advance_to_offer", "RECRUITMENT_ADMIN", "stage=OFFER_DRAFT"),
            ("generate_offer_letter", "HR_ADMIN", "docusign_envelope_created"),
            ("candidate_signs", "external", "offer_status=SIGNED"),
            ("convert_to_employee", "RECRUITMENT_ADMIN", "employee_row_created; onboarding_started"),
        ],
        "negatives": [
            ("reject_requisition_hr", "HR_ADMIN", "req_status=REJECTED; manager_notified"),
            ("withdraw_candidate", "RECRUITMENT_ADMIN", "stage=WITHDRAWN"),
            ("offer_revoked_before_signing", "HR_ADMIN", "envelope_voided"),
            ("duplicate_candidate_same_email", "RECRUITMENT_ADMIN", "409 duplicate_or_merge_prompt"),
        ],
    },
    "onboarding": {
        "title": "New employee onboarding checklist",
        "actors": ["HR_ADMIN", "IT_ADMIN", "EMPLOYEE", "MANAGER"],
        "steps": [
            ("checklist_generated", "system", "template_applied_from_department"),
            ("assign_buddy", "MANAGER", "buddy_notified"),
            ("it_provision_accounts", "HR_ADMIN", "google_workspace+slack_invites_sent"),
            ("assign_assets", "HR_ADMIN", "laptop_assigned; serial_captured"),
            ("collect_documents", "EMPLOYEE", "aadhaar+pan+education_uploaded"),
            ("sign_offer_addendum", "EMPLOYEE", "e_signed"),
            ("first_login", "EMPLOYEE", "ok; password_changed"),
            ("completion", "system", "onboarding_status=COMPLETE"),
        ],
        "negatives": [
            ("missing_documents_blocks_completion", "EMPLOYEE", "status=BLOCKED"),
            ("buddy_assignment_skip_allowed", "HR_ADMIN", "override_reason_required"),
        ],
    },
    "offboarding": {
        "title": "Employee offboarding + F&F settlement",
        "actors": ["HR_ADMIN", "MANAGER", "FINANCE_ADMIN", "EMPLOYEE"],
        "steps": [
            ("initiate", "HR_ADMIN", "workflow_started; last_working_day_set"),
            ("exit_interview_scheduled", "HR_ADMIN", "slot_booked"),
            ("asset_return_checklist", "EMPLOYEE", "items_marked_returned"),
            ("manager_signoff", "MANAGER", "knowledge_transfer_logged"),
            ("ff_settlement_draft", "FINANCE_ADMIN", "settlement_totals_previewed"),
            ("ff_settlement_approve", "FINANCE_ADMIN", "status=APPROVED; queued_for_payment"),
            ("access_revocation", "system", "sso+slack+email_revoked_on_lwd"),
            ("completion", "system", "employee_status=EXITED"),
        ],
        "negatives": [
            ("asset_not_returned_holds_ff", "EMPLOYEE", "ff_status=BLOCKED"),
            ("rehire_prior_exit_employee", "HR_ADMIN", "special_flow_retains_history"),
        ],
    },
    "performance_review": {
        "title": "Performance review cycle (semi-annual)",
        "actors": ["HR_ADMIN", "MANAGER", "EMPLOYEE", "TEAM_LEAD"],
        "steps": [
            ("cycle_created", "HR_ADMIN", "review_cycle_row; participants_enrolled"),
            ("self_review", "EMPLOYEE", "responses_saved"),
            ("peer_360_feedback", "EMPLOYEE", "anonymized_responses_captured"),
            ("manager_review", "MANAGER", "ratings+notes"),
            ("calibration_meeting", "HR_ADMIN", "final_ratings_locked"),
            ("share_with_employee", "MANAGER", "meeting_scheduled"),
            ("employee_acknowledge", "EMPLOYEE", "ack_timestamp"),
            ("close_cycle", "HR_ADMIN", "cycle_archived; heatmap_generated"),
        ],
        "negatives": [
            ("missed_self_review_deadline", "system", "auto_reminders; manager_can_still_submit"),
            ("dispute_rating", "EMPLOYEE", "dispute_ticket_created"),
        ],
    },
    "profile_change": {
        "title": "Self-service profile change with approval",
        "actors": ["EMPLOYEE", "HR_MANAGER"],
        "steps": [
            ("submit_change", "EMPLOYEE", "change_request=PENDING"),
            ("hr_manager_review", "HR_MANAGER", "status=APPROVED; field_updated"),
            ("audit", "system", "before/after_snapshot"),
        ],
        "negatives": [
            ("change_rejected", "HR_MANAGER", "status=REJECTED; reason_required"),
            ("sensitive_field_blocked", "EMPLOYEE", "422 field_not_editable (e.g., salary)"),
        ],
    },
    "attendance_regularization": {
        "title": "Missed-punch attendance regularization",
        "actors": ["EMPLOYEE", "TEAM_LEAD"],
        "steps": [
            ("request_reg", "EMPLOYEE", "req=PENDING"),
            ("team_lead_approve", "TEAM_LEAD", "attendance_corrected"),
        ],
        "negatives": [
            ("out_of_window", "EMPLOYEE", "422 beyond_reg_window (e.g., >7d)"),
            ("team_lead_reject", "TEAM_LEAD", "req=REJECTED"),
        ],
    },
    "wiki_collab": {
        "title": "Fluence wiki collaborative authoring",
        "actors": ["EMPLOYEE", "MANAGER"],
        "steps": [
            ("create_draft", "EMPLOYEE", "page_draft_saved"),
            ("request_review", "EMPLOYEE", "review_assigned_to_manager"),
            ("manager_comments", "MANAGER", "inline_comments_attached"),
            ("publish", "EMPLOYEE", "status=PUBLISHED; version=1"),
            ("edit_publish_new_version", "EMPLOYEE", "version=2; diff_available"),
        ],
        "negatives": [
            ("concurrent_edit_locked", "MANAGER", "edit_lock_seen; 5m_ttl"),
            ("unauthorized_space_access", "EMPLOYEE", "403 not_space_member"),
        ],
    },
}

# Forms with validation rules — expand each rule into its own UC
FORMS = {
    "login": [
        ("empty_email", "422 email_required"),
        ("empty_password", "422 password_required"),
        ("malformed_email", "422 email_format"),
        ("wrong_password", "401 invalid_credentials"),
        ("locked_account", "423 account_locked"),
        ("rate_limit_hit", "429 too_many_requests"),
        ("valid_login", "200; cookies_set"),
        ("sso_google_success", "200; cookies_set"),
    ],
    "create_employee": [
        ("missing_first_name", "422 first_name_required"),
        ("missing_email", "422 email_required"),
        ("duplicate_email_in_tenant", "409 email_exists"),
        ("nonexistent_department", "422 department_not_found"),
        ("start_date_in_past_allowed", "200"),
        ("start_date_too_far_future", "422 start_date_out_of_range"),
        ("invalid_phone_format", "422 phone_format"),
        ("valid_payload", "201"),
    ],
    "leave_apply": [
        ("missing_type", "422 type_required"),
        ("end_before_start", "422 end_before_start"),
        ("start_in_past_non_sick", "422 past_start_date"),
        ("exceeds_balance", "422 insufficient_balance"),
        ("overlap_existing", "409 overlap"),
        ("valid_single_day", "201"),
        ("valid_multi_day", "201"),
        ("half_day_valid", "201"),
    ],
    "expense_submit": [
        ("missing_amount", "422 amount_required"),
        ("negative_amount", "422 amount_invalid"),
        ("receipt_missing", "422 receipt_required"),
        ("receipt_too_large", "413"),
        ("wrong_mime_type", "415"),
        ("date_too_old", "422 window_exceeded"),
        ("date_future", "422 future_date"),
        ("valid_submit", "201"),
    ],
    "password_change": [
        ("current_wrong", "422 current_invalid"),
        ("new_too_short", "422 password_policy"),
        ("new_missing_uppercase", "422 password_policy"),
        ("new_missing_digit", "422 password_policy"),
        ("new_missing_special", "422 password_policy"),
        ("new_equals_current", "422 reuse_blocked"),
        ("new_in_last_5", "422 history_reuse_blocked"),
        ("valid_change", "200; sessions_invalidated_except_current"),
    ],
    "payroll_run_create": [
        ("missing_period_start", "422"),
        ("period_end_before_start", "422"),
        ("overlap_existing_run", "409"),
        ("cutoff_after_period_end", "422"),
        ("valid_dry_run", "200"),
        ("valid_final_submit", "201"),
    ],
    "create_job": [
        ("missing_title", "422"),
        ("headcount_zero", "422 headcount_invalid"),
        ("missing_jd", "422"),
        ("valid_draft", "201"),
        ("publish_without_approval_blocked", "422 approval_required"),
    ],
    "wiki_create_page": [
        ("title_too_long", "422 title_max_200"),
        ("space_not_member", "403"),
        ("parent_page_not_found", "404"),
        ("valid_root_page", "201"),
        ("valid_child_page", "201"),
    ],
}

# Cross-cutting categories
CROSS_CUTTING = {
    "auth_session": [
        ("login_rate_limit", "5/min per IP enforced", "P0"),
        ("account_lockout_5_fails", "15 min lock; unlock_email", "P0"),
        ("refresh_token_rotation", "new access; old refresh blacklisted", "P0"),
        ("csrf_double_submit_required", "403 on missing header", "P0"),
        ("jwt_expired_auto_refresh", "transparent refresh on 401", "P1"),
        ("logout_revokes_refresh", "refresh blacklisted", "P1"),
        ("concurrent_sessions_limit", "configurable max", "P2"),
        ("session_timeout_idle_30m", "redirect to login with returnUrl", "P2"),
        ("password_reset_flow", "email + 1h token", "P1"),
        ("sso_google_link_existing_email", "account linked", "P1"),
        ("sso_revoke_from_google", "session invalidated", "P1"),
        ("mfa_totp_enrollment", "seed generated; verified", "P1"),
        ("mfa_required_after_password_change", "re-enroll forced", "P2"),
        ("remember_me_30d_cookie", "long-lived", "P3"),
    ],
    "tenant_isolation": [
        ("cross_tenant_read_blocked", "404 via RLS", "P0"),
        ("cross_tenant_update_blocked", "404", "P0"),
        ("admin_without_tenant_context_empty", "empty set", "P0"),
        ("audit_trail_captures_tenant_id", "tenant_id in every row", "P1"),
        ("backup_export_scoped_to_tenant", "no other tenant rows", "P0"),
    ],
    "concurrency": [
        ("optimistic_lock_employee_update", "first wins; 409 second", "P1"),
        ("edit_lock_wiki_5m_ttl", "other users see lock", "P2"),
        ("parallel_payroll_run_blocked", "409 overlap", "P0"),
        ("double_submit_leave_debounced", "single row", "P2"),
        ("fluence_crdt_merge", "no data loss on concurrent edit to different fields", "P2"),
    ],
    "observability": [
        ("prometheus_metrics_endpoint", "200 and contains jvm+http", "P2"),
        ("audit_log_every_mutation", "row per POST/PUT/DELETE", "P1"),
        ("structured_error_payload", "{status,error,message,timestamp}", "P2"),
        ("correlation_id_propagation", "x-request-id in all logs", "P2"),
        ("frontend_web_vitals_collected", "LCP/CLS/INP captured", "P3"),
        ("redis_health_liveness", "PING returns PONG", "P1"),
        ("kafka_producer_reachable", "topic exists", "P1"),
    ],
    "performance": [
        ("dashboard_p95_lt_1500ms", "measured over 20 req", "P2"),
        ("employees_list_paged_not_full", "size defaults to 20", "P1"),
        ("heavy_route_payroll_run_lt_3s", "warm", "P2"),
        ("n_plus_one_employees_list", "not observed in query log", "P2"),
        ("no_blocking_io_in_controller", "reactive or @Async where needed", "P3"),
    ],
    "design_system": [
        ("no_banned_tailwind_in_source", "0 matches for banned regex", "P2"),
        ("icon_only_buttons_have_aria_label", "0 violations", "P2"),
        ("focus_visible_ring_present", "keyboard nav visible", "P2"),
        ("shadows_use_css_var_tokens", "no shadow-sm/md/lg raw", "P2"),
        ("colors_use_semantic_tokens", "no raw hex in inline styles", "P2"),
        ("forms_use_rhf_plus_zod", "no useState+fetch forms", "P2"),
        ("spacing_8px_grid", "no p-3/p-5 anomalies", "P3"),
    ],
    "a11y": [
        ("images_alt_text", "decorative use alt=''", "P2"),
        ("form_labels_associated", "htmlFor or aria-labelledby", "P2"),
        ("tabindex_no_positive", "only 0 or -1", "P3"),
        ("keyboard_navigation_full", "every action reachable", "P2"),
        ("color_contrast_aa", "4.5:1 for text", "P2"),
        ("skip_to_main_link", "present on every page", "P3"),
    ],
    "security": [
        ("security_headers_edge_and_backend", "CSP, HSTS, X-Frame-Options", "P0"),
        ("idor_employee_by_id_other_tenant", "404 not 403", "P0"),
        ("sql_injection_search", "parameterized; 400 on quote", "P0"),
        ("xss_reflected_in_search", "escaped", "P0"),
        ("file_upload_sanitized", "content-type sniffed; no script", "P0"),
        ("secrets_not_in_logs", "grep OK on /tmp/backend.log", "P0"),
        ("rate_limit_exports_5_per_5min", "429 on 6th", "P1"),
    ],
    "i18n": [
        ("dates_displayed_tenant_timezone", "IST vs PT correct", "P2"),
        ("number_format_locale_aware", "₹ vs $", "P2"),
        ("rtl_languages_no_layout_break", "visual check", "P3"),
    ],
    "platform": [
        ("waffle_switch_updates_sidebar", "sidebar mirrors active app", "P2"),
        ("breadcrumb_matches_route", "deep link → matching crumbs", "P3"),
        ("dark_mode_toggle_persists", "localStorage + cookie", "P3"),
        ("responsive_desktop_1280_default", "no scrollbar on 1280x800", "P3"),
    ],
}

# Module smoke — 3 checks per module
MODULES_FLAT = [
    ("hrms", m) for m in
    ["employees","departments","attendance","leave","payroll","benefits","assets","contracts","offboarding","expenses"]
] + [
    ("hire", m) for m in
    ["jobs","candidates","pipeline","scorecards","agencies","onboarding","offers","career_page","e_signature"]
] + [
    ("grow", m) for m in
    ["reviews","okrs","goals","feedback_360","lms","training","surveys","wellness","competency"]
] + [
    ("fluence", m) for m in
    ["wiki","blogs","templates","drive","wall","ai_chat","search","spaces"]
]

# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------
def yml_line(s: str, indent: int = 0) -> str:
    return " " * indent + s + "\n"

def yml_kv(k, v, indent=0):
    if isinstance(v, bool): v = str(v).lower()
    return yml_line(f"{k}: {v}", indent)

def safe(s: str) -> str:
    """Wrap string in quotes if it contains YAML-special chars."""
    if any(c in s for c in ":{}[],&*#?|<>=!%@`\"'") or s.startswith("-"):
        return '"' + s.replace('"', '\\"') + '"'
    return s

def gen_header() -> list[str]:
    out = []
    out.append("# NU-AURA end-to-end use case catalog — generated\n")
    out.append("# =====================================================================\n")
    out.append("# DO NOT HAND-EDIT. Regenerate via:\n")
    out.append("#     python3 docs/qa/generate-use-cases.py\n")
    out.append(f"# Generated: {date.today().isoformat()}\n")
    out.append("# Schema: 2.0.0\n")
    out.append("# =====================================================================\n\n")
    out.append("metadata:\n")
    out.append(f'  schema_version: "2.0.0"\n')
    out.append(f'  app: "NU-AURA"\n')
    out.append(f'  sub_apps: [NU-HRMS, NU-Hire, NU-Grow, NU-Fluence]\n')
    out.append(f'  generated: "{date.today().isoformat()}"\n')
    out.append(f'  backend_base: "http://localhost:8080"\n')
    out.append(f'  frontend_base: "http://localhost:3000"\n\n')
    return out

def gen_roles() -> list[str]:
    out = ["roles:\n"]
    for r in ROLES:
        out.append(f"  - code: {r}\n")
        out.append(f"    level: {ROLE_LEVEL[r]}\n")
        out.append(f"    email: {ROLE_EMAIL[r]}\n")
    out.append("\n")
    return out

def gen_rbac_ucs() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-RBAC-* — page-level RBAC (route × role)\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("rbac_use_cases:\n")
    n = 0
    for i, (route, scope) in enumerate(ROUTES, 1):
        access = ACCESS[scope]
        for j, role in enumerate(ROLES, 1):
            n += 1
            uid = f"UC-RBAC-{n:04d}"
            a = access[role]
            sev = "P0" if (a.startswith("deny") and role == "EMPLOYEE") else ("P1" if a.startswith("deny") else "P3")
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(f'{role} navigates {route} expecting {a}')}\n")
            out.append(f"    category: RBAC\n")
            out.append(f"    role: {role}\n")
            out.append(f"    route: {route}\n")
            out.append(f"    expected: {a}\n")
            out.append(f"    api_check: same as route\n")
            out.append(f"    severity_on_fail: {sev}\n")
    out.append("\n")
    return out, n

def gen_crud_ucs() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-CRUD-* — CRUD matrix per entity × op × role\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("crud_use_cases:\n")
    n = 0
    for entity, path, scope in ENTITIES:
        for op in CRUD_OPS:
            for role in ROLES:
                a = crud_access(scope, op, role)
                n += 1
                uid = f"UC-CRUD-{n:04d}"
                sev = "P0" if (a == "deny" and role == "EMPLOYEE" and op in ("read_list","read_one")) else \
                      "P1" if a == "deny" else \
                      "P2" if a == "allow_scoped" else "P3"
                http_expect = (
                    "403" if a == "deny" else
                    "200 (scope-filtered)" if a == "allow_scoped" else
                    "200 (self-only)" if a == "allow_self" else
                    "200" if op in ("read_list","read_one") else
                    "201" if op == "create" else
                    "200" if op == "update" else
                    "204"
                )
                out.append(f"  - id: {uid}\n")
                out.append(f"    title: {safe(f'{role} {op} on {entity}')}\n")
                out.append(f"    category: CRUD\n")
                out.append(f"    role: {role}\n")
                out.append(f"    entity: {entity}\n")
                out.append(f"    operation: {op}\n")
                out.append(f"    api_path: {path}\n")
                out.append(f"    expected_access: {a}\n")
                out.append(f"    http_expect: {safe(http_expect)}\n")
                out.append(f"    severity_on_fail: {sev}\n")
    out.append("\n")
    return out, n

def gen_workflow_ucs() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-WF-* — multi-actor workflow sagas (happy + negative paths)\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("workflow_use_cases:\n")
    n = 0
    for wname, wf in WORKFLOWS.items():
        wtitle = wf["title"]
        for step_name, actor, expect in wf["steps"]:
            n += 1
            uid = f"UC-WF-{n:04d}"
            sev = "P0" if step_name in ("apply","approve_step2","finance_approve","tenant_admin_release",
                                         "create_candidate","convert_to_employee","initiate") else "P1"
            title = f"{wtitle} — step {step_name} as {actor}"
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(title)}\n")
            out.append(f"    category: WORKFLOW\n")
            out.append(f"    workflow: {wname}\n")
            out.append(f"    step: {step_name}\n")
            out.append(f"    actor: {actor}\n")
            out.append(f"    path: happy\n")
            out.append(f"    expect: {safe(expect)}\n")
            out.append(f"    severity_on_fail: {sev}\n")
        for neg_name, actor, expect in wf.get("negatives", []):
            n += 1
            uid = f"UC-WF-{n:04d}"
            title = f"{wtitle} — negative {neg_name} as {actor}"
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(title)}\n")
            out.append(f"    category: WORKFLOW\n")
            out.append(f"    workflow: {wname}\n")
            out.append(f"    step: {neg_name}\n")
            out.append(f"    actor: {actor}\n")
            out.append(f"    path: negative\n")
            out.append(f"    expect: {safe(expect)}\n")
            out.append(f"    severity_on_fail: P1\n")
    out.append("\n")
    return out, n

def gen_form_ucs() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-FORM-* — form validation rules (one UC per field/rule)\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("form_use_cases:\n")
    n = 0
    for form, rules in FORMS.items():
        for rule_name, expect in rules:
            n += 1
            uid = f"UC-FORM-{n:04d}"
            is_valid = rule_name.startswith("valid")
            sev = "P2" if is_valid else "P1"
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(f'{form} — {rule_name}')}\n")
            out.append(f"    category: FORM\n")
            out.append(f"    form: {form}\n")
            out.append(f"    rule: {rule_name}\n")
            out.append(f"    expect: {safe(expect)}\n")
            out.append(f"    severity_on_fail: {sev}\n")
    out.append("\n")
    return out, n

def gen_xc_ucs() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-XC-* — cross-cutting (auth, tenant, perf, security, a11y, design)\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("cross_cutting_use_cases:\n")
    n = 0
    for cat, items in CROSS_CUTTING.items():
        for name, expect, sev in items:
            n += 1
            uid = f"UC-XC-{n:04d}"
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(f'{cat}: {name}')}\n")
            out.append(f"    category: CROSS_CUTTING\n")
            out.append(f"    subcategory: {cat}\n")
            out.append(f"    check: {name}\n")
            out.append(f"    expect: {safe(expect)}\n")
            out.append(f"    severity_on_fail: {sev}\n")
    out.append("\n")
    return out, n

def gen_module_ucs() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-MOD-* — module smoke (load, empty-state, populated) per module\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("module_use_cases:\n")
    n = 0
    for sub, module in MODULES_FLAT:
        for check in ["loads_without_error", "empty_state_shown_when_no_data", "populated_state_renders"]:
            n += 1
            uid = f"UC-MOD-{n:04d}"
            sev = "P1" if check == "loads_without_error" else "P2"
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(f'{sub}/{module} — {check}')}\n")
            out.append(f"    category: MODULE_SMOKE\n")
            out.append(f"    sub_app: {sub}\n")
            out.append(f"    module: {module}\n")
            out.append(f"    check: {check}\n")
            out.append(f"    severity_on_fail: {sev}\n")
    out.append("\n")
    return out, n

def gen_journey_ucs() -> list[str]:
    """Happy-path journey per module per primary role that has access."""
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("# UC-JRN-* — module × role happy-path journey\n")
    out.append("# ---------------------------------------------------------------------\n")
    out.append("journey_use_cases:\n")
    n = 0
    # primary roles that exercise each sub-app
    sub_roles = {
        "hrms": ["HR_ADMIN","HR_MANAGER","MANAGER","TEAM_LEAD","EMPLOYEE","TENANT_ADMIN"],
        "hire": ["RECRUITMENT_ADMIN","HR_ADMIN","MANAGER","TENANT_ADMIN"],
        "grow": ["HR_ADMIN","HR_MANAGER","MANAGER","TEAM_LEAD","EMPLOYEE","TENANT_ADMIN"],
        "fluence": ["EMPLOYEE","MANAGER","HR_ADMIN","TENANT_ADMIN","TEAM_LEAD","RECRUITMENT_ADMIN"],
    }
    for sub, module in MODULES_FLAT:
        for role in sub_roles[sub]:
            n += 1
            uid = f"UC-JRN-{n:04d}"
            out.append(f"  - id: {uid}\n")
            out.append(f"    title: {safe(f'{role} uses {sub}/{module}')}\n")
            out.append(f"    category: JOURNEY\n")
            out.append(f"    sub_app: {sub}\n")
            out.append(f"    module: {module}\n")
            out.append(f"    role: {role}\n")
            out.append(f"    severity_on_fail: P2\n")
    out.append("\n")
    return out, n

def gen_exec_hints() -> list[str]:
    out = ["# ---------------------------------------------------------------------\n"]
    out.append("execution_hints:\n")
    for h in [
        "Filter `rbac_use_cases` for fastest API-only sweeps (9 roles × routes).",
        "Filter `crud_use_cases` when you need entity-scope coverage.",
        "Filter `workflow_use_cases` by `workflow:` key to walk a specific saga.",
        "Filter `form_use_cases` by `form:` key for form-validation regression.",
        "`cross_cutting_use_cases` covers auth, tenant isolation, perf, security, a11y, design, i18n, platform.",
        "`module_use_cases` is the 3-check-per-module smoke layer (fast).",
        "`journey_use_cases` is the role × module happy-path layer.",
        "Each UC has a stable `id:` — reference it in bug sheets as `uc: UC-CRUD-0042`.",
        "`severity_on_fail` is the default when any assertion fails; runner may downgrade with evidence.",
    ]:
        out.append(f"  - {safe(h)}\n")
    return out

def main():
    buf = []
    buf += gen_header()
    buf += gen_roles()
    rbac_lines, n_rbac = gen_rbac_ucs()
    crud_lines, n_crud = gen_crud_ucs()
    wf_lines, n_wf = gen_workflow_ucs()
    form_lines, n_form = gen_form_ucs()
    xc_lines, n_xc = gen_xc_ucs()
    mod_lines, n_mod = gen_module_ucs()
    jrn_lines, n_jrn = gen_journey_ucs()
    buf += rbac_lines + crud_lines + wf_lines + form_lines + xc_lines + mod_lines + jrn_lines
    buf += gen_exec_hints()

    # Counts summary comment at top
    total = n_rbac + n_crud + n_wf + n_form + n_xc + n_mod + n_jrn
    counts = (
        f"# COUNTS — RBAC={n_rbac} CRUD={n_crud} WF={n_wf} FORM={n_form} "
        f"XC={n_xc} MOD={n_mod} JRN={n_jrn}  TOTAL={total}\n"
    )
    # Insert counts after the header comment block (before `metadata:` line)
    merged = "".join(buf)
    merged = merged.replace("# =====================================================================\n\nmetadata:",
                            f"# =====================================================================\n{counts}\nmetadata:")

    out_path = Path(__file__).parent / "use-cases.yaml"
    out_path.write_text(merged)
    print(f"WROTE {out_path}  total_ucs={total}  (RBAC={n_rbac} CRUD={n_crud} WF={n_wf} FORM={n_form} XC={n_xc} MOD={n_mod} JRN={n_jrn})")

if __name__ == "__main__":
    main()
