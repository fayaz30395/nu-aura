--
-- PostgreSQL database dump
--

\
restrict FO8Bv7wheobyBxh5iwCxAjtxFurT1MVs5WZIfUrqpizZmWKFLEG07qPYSvh4vYQ

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET
lock_timeout = 0;
SET
idle_in_transaction_session_timeout = 0;
SET
client_encoding = 'UTF8';
SET
standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET
check_function_bodies = false;
SET
xmloption = content;
SET
client_min_messages = warning;
SET
row_security = off;

DROP
DATABASE IF EXISTS hrms_dev;
--
-- Name: hrms_dev; Type: DATABASE; Schema: -; Owner: hrms
--

CREATE
DATABASE hrms_dev WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER
DATABASE hrms_dev OWNER TO hrms;

\unrestrict
FO8Bv7wheobyBxh5iwCxAjtxFurT1MVs5WZIfUrqpizZmWKFLEG07qPYSvh4vYQ
\connect hrms_dev
\restrict FO8Bv7wheobyBxh5iwCxAjtxFurT1MVs5WZIfUrqpizZmWKFLEG07qPYSvh4vYQ

SET statement_timeout = 0;
SET
lock_timeout = 0;
SET
idle_in_transaction_session_timeout = 0;
SET
client_encoding = 'UTF8';
SET
standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET
check_function_bodies = false;
SET
xmloption = content;
SET
client_min_messages = warning;
SET
row_security = off;

--
-- Name: pm; Type: SCHEMA; Schema: -; Owner: hrms
--

CREATE SCHEMA pm;


ALTER
SCHEMA pm OWNER TO hrms;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE
EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner:
--

COMMENT
ON EXTENSION pgcrypto IS 'cryptographic functions';


SET
default_tablespace = '';

SET
default_table_access_method = heap;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: pm; Owner: hrms
--

CREATE TABLE pm.flyway_schema_history
(
  installed_rank integer                 NOT NULL,
  version        character varying(50),
  description    character varying(200)  NOT NULL,
  type           character varying(20)   NOT NULL,
  script         character varying(1000) NOT NULL,
  checksum       integer,
  installed_by   character varying(100)  NOT NULL,
  installed_on   timestamp without time zone DEFAULT now() NOT NULL,
  execution_time integer                 NOT NULL,
  success        boolean                 NOT NULL
);


ALTER TABLE pm.flyway_schema_history OWNER TO hrms;

--
-- Name: project_comments; Type: TABLE; Schema: pm; Owner: hrms
--

CREATE TABLE pm.project_comments
(
  is_deleted        boolean NOT NULL,
  is_edited         boolean,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  author_id         uuid    NOT NULL,
  created_by        uuid,
  id                uuid    NOT NULL,
  milestone_id      uuid,
  parent_comment_id uuid,
  project_id        uuid    NOT NULL,
  task_id           uuid,
  tenant_id         uuid,
  updated_by        uuid,
  type              character varying(20),
  author_name       character varying(200),
  attachments       character varying(500),
  mentions          character varying(500),
  content           text    NOT NULL,
  CONSTRAINT project_comments_type_check CHECK (((type)::text = ANY ((ARRAY['COMMENT':: character varying, 'STATUS_CHANGE':: character varying, 'ASSIGNMENT':: character varying, 'MENTION':: character varying, 'SYSTEM':: character varying])::text[])
) )
);


ALTER TABLE pm.project_comments OWNER TO hrms;

--
-- Name: project_members; Type: TABLE; Schema: pm; Owner: hrms
--

CREATE TABLE pm.project_members
(
  hours_per_week integer,
  is_active      boolean,
  is_deleted     boolean               NOT NULL,
  joined_date    date,
  left_date      date,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  id             uuid                  NOT NULL,
  project_id     uuid                  NOT NULL,
  tenant_id      uuid,
  updated_by     uuid,
  user_id        uuid                  NOT NULL,
  role           character varying(30) NOT NULL,
  department     character varying(100),
  designation    character varying(100),
  email          character varying(200),
  user_name      character varying(200),
  CONSTRAINT project_members_role_check CHECK (((role)::text = ANY ((ARRAY['OWNER':: character varying, 'PROJECT_MANAGER':: character varying, 'TECH_LEAD':: character varying, 'DEVELOPER':: character varying, 'QA_ENGINEER':: character varying, 'DESIGNER':: character varying, 'ANALYST':: character varying, 'MEMBER':: character varying, 'VIEWER':: character varying])::text[])
) )
);


ALTER TABLE pm.project_members OWNER TO hrms;

--
-- Name: project_milestones; Type: TABLE; Schema: pm; Owner: hrms
--

CREATE TABLE pm.project_milestones
(
  completed_date      date,
  due_date            date,
  is_deleted          boolean                NOT NULL,
  progress_percentage integer,
  sort_order          integer,
  start_date          date,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  owner_id            uuid,
  project_id          uuid                   NOT NULL,
  tenant_id           uuid,
  updated_by          uuid,
  color               character varying(20),
  status              character varying(20)  NOT NULL,
  name                character varying(200) NOT NULL,
  owner_name          character varying(200),
  description         text,
  CONSTRAINT project_milestones_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'OVERDUE':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE pm.project_milestones OWNER TO hrms;

--
-- Name: project_tasks; Type: TABLE; Schema: pm; Owner: hrms
--

CREATE TABLE pm.project_tasks
(
  actual_hours        integer,
  completed_date      date,
  due_date            date,
  estimated_hours     integer,
  is_deleted          boolean                NOT NULL,
  progress_percentage integer,
  sort_order          integer,
  start_date          date,
  story_points        integer,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  assignee_id         uuid,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  milestone_id        uuid,
  parent_task_id      uuid,
  project_id          uuid                   NOT NULL,
  reporter_id         uuid,
  tenant_id           uuid,
  updated_by          uuid,
  color               character varying(20),
  priority            character varying(20)  NOT NULL,
  status              character varying(20)  NOT NULL,
  type                character varying(20),
  task_code           character varying(50)  NOT NULL,
  sprint_name         character varying(100),
  assignee_name       character varying(200),
  reporter_name       character varying(200),
  tags                character varying(500),
  title               character varying(500) NOT NULL,
  description         text,
  CONSTRAINT project_tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT project_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['BACKLOG'::character varying, 'TODO'::character varying, 'IN_PROGRESS'::character varying, 'IN_REVIEW'::character varying, 'BLOCKED'::character varying, 'DONE'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT project_tasks_type_check CHECK (((type)::text = ANY ((ARRAY['EPIC'::character varying, 'STORY'::character varying, 'TASK'::character varying, 'SUBTASK'::character varying, 'BUG'::character varying, 'FEATURE'::character varying, 'IMPROVEMENT'::character varying])::text[])))
);


ALTER TABLE pm.project_tasks OWNER TO hrms;

--
-- Name: projects; Type: TABLE; Schema: pm; Owner: hrms
--

CREATE TABLE pm.projects
(
  budget              numeric(15, 2),
  currency            character varying(3),
  end_date            date,
  is_archived         boolean,
  is_deleted          boolean                NOT NULL,
  progress_percentage integer,
  start_date          date,
  target_end_date     date,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  owner_id            uuid,
  tenant_id           uuid,
  updated_by          uuid,
  color               character varying(20),
  priority            character varying(20)  NOT NULL,
  status              character varying(20)  NOT NULL,
  project_code        character varying(50)  NOT NULL,
  client_name         character varying(200),
  name                character varying(200) NOT NULL,
  owner_name          character varying(200),
  tags                character varying(500),
  description         text,
  CONSTRAINT projects_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['PLANNING'::character varying, 'IN_PROGRESS'::character varying, 'ON_HOLD'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE pm.projects OWNER TO hrms;

--
-- Name: allocation_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.allocation_requests
(
  end_date             date,
  is_deleted           boolean               NOT NULL,
  requested_allocation integer               NOT NULL,
  start_date           date                  NOT NULL,
  created_at           timestamp(6) without time zone NOT NULL,
  resolved_at          timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  approver_id          uuid,
  created_by           uuid,
  employee_id          uuid                  NOT NULL,
  id                   uuid                  NOT NULL,
  project_id           uuid                  NOT NULL,
  requested_by_id      uuid                  NOT NULL,
  tenant_id            uuid                  NOT NULL,
  updated_by           uuid,
  status               character varying(30) NOT NULL,
  role                 character varying(100),
  approval_comment     text,
  rejection_reason     text,
  request_reason       text,
  CONSTRAINT allocation_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying])::text[])
) )
);


ALTER TABLE public.allocation_requests OWNER TO hrms;

--
-- Name: analytics_insights; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.analytics_insights
(
  affected_employees    integer,
  due_date              date,
  impact_score          integer,
  is_deleted            boolean                NOT NULL,
  potential_cost_impact numeric(15, 2),
  valid_until           date,
  created_at            timestamp(6) without time zone NOT NULL,
  generated_at          timestamp(6) without time zone NOT NULL,
  resolved_at           timestamp(6) without time zone,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  assigned_to           uuid,
  created_by            uuid,
  department_id         uuid,
  id                    uuid                   NOT NULL,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  action_items          text,
  category              character varying(255) NOT NULL,
  data_source           character varying(255),
  department_name       character varying(255),
  description           text                   NOT NULL,
  insight_type          character varying(255) NOT NULL,
  recommendation        text,
  resolution_notes      text,
  severity              character varying(255),
  status                character varying(255),
  title                 character varying(255) NOT NULL,
  CONSTRAINT analytics_insights_category_check CHECK (((category)::text = ANY ((ARRAY['ATTRITION':: character varying, 'HIRING':: character varying, 'PERFORMANCE':: character varying, 'COMPENSATION':: character varying, 'ENGAGEMENT':: character varying, 'DIVERSITY':: character varying, 'COMPLIANCE':: character varying, 'COST':: character varying])::text[])
) ),
    CONSTRAINT analytics_insights_insight_type_check CHECK (((insight_type)::text = ANY ((ARRAY['TREND'::character varying, 'ANOMALY'::character varying, 'PREDICTION'::character varying, 'BENCHMARK'::character varying, 'RECOMMENDATION'::character varying, 'ALERT'::character varying])::text[]))),
    CONSTRAINT analytics_insights_severity_check CHECK (((severity)::text = ANY ((ARRAY['INFO'::character varying, 'WARNING'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT analytics_insights_status_check CHECK (((status)::text = ANY ((ARRAY['NEW'::character varying, 'ACKNOWLEDGED'::character varying, 'IN_PROGRESS'::character varying, 'RESOLVED'::character varying, 'DISMISSED'::character varying])::text[])))
);


ALTER TABLE public.analytics_insights OWNER TO hrms;

--
-- Name: analytics_metrics; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.analytics_metrics
(
  metric_date     date                   NOT NULL,
  metric_value    numeric(15, 2)         NOT NULL,
  created_at      timestamp(6) without time zone NOT NULL,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  metric_category character varying(50)  NOT NULL,
  metric_name     character varying(100) NOT NULL,
  dimension1      character varying(255),
  dimension2      character varying(255),
  dimension3      character varying(255),
  CONSTRAINT analytics_metrics_metric_category_check CHECK (((metric_category)::text = ANY ((ARRAY['HEADCOUNT':: character varying, 'ATTRITION':: character varying, 'RECRUITMENT':: character varying, 'ATTENDANCE':: character varying, 'LEAVE':: character varying, 'PERFORMANCE':: character varying, 'TRAINING':: character varying, 'ENGAGEMENT':: character varying, 'COST':: character varying, 'PRODUCTIVITY':: character varying])::text[])
) )
);


ALTER TABLE public.analytics_metrics OWNER TO hrms;

--
-- Name: analytics_snapshots; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.analytics_snapshots
(
  active_employees             integer,
  applications_received        integer,
  attrition_rate               double precision,
  average_age                  double precision,
  average_attendance_rate      double precision,
  average_late_percentage      double precision,
  average_leaves_per_employee  double precision,
  average_performance_rating   double precision,
  average_salary               double precision,
  average_tenure               double precision,
  average_time_to_hire         double precision,
  average_training_hours       double precision,
  candidates_shortlisted       integer,
  cost_per_hire                double precision,
  employees_trained            integer,
  engagement_score             double precision,
  enps                         double precision,
  female_count                 integer,
  high_performers_count        integer,
  is_deleted                   boolean                NOT NULL,
  low_performers_count         integer,
  male_count                   integer,
  median_salary                double precision,
  month                        integer,
  new_joinees                  integer,
  offer_acceptance_rate        double precision,
  offers_accepted              integer,
  offers_extended              integer,
  on_leave_count               integer,
  open_positions               integer,
  other_gender_count           integer,
  quarter                      integer,
  retention_rate               double precision,
  salary_range_max             double precision,
  salary_range_min             double precision,
  satisfaction_score           double precision,
  separations                  integer,
  snapshot_date                date,
  total_headcount              integer,
  total_leaves_taken           integer,
  total_payroll_cost           double precision,
  training_cost                double precision,
  training_sessions_conducted  integer,
  week                         integer,
  year                         integer,
  computed_at                  timestamp(6) without time zone,
  created_at                   timestamp(6) without time zone NOT NULL,
  updated_at                   timestamp(6) without time zone NOT NULL,
  version                      bigint,
  created_by                   uuid,
  id                           uuid                   NOT NULL,
  tenant_id                    uuid                   NOT NULL,
  updated_by                   uuid,
  age_distribution             text,
  department_distribution      text,
  employment_type_distribution text,
  location_distribution        text,
  performance_distribution     text,
  period character varying (255) NOT NULL,
  salary_band_distribution     text,
  snapshot_type                character varying(255) NOT NULL,
  tenure_distribution          text,
  CONSTRAINT analytics_snapshots_period_check CHECK (((period)::text = ANY ((ARRAY['DAILY':: character varying, 'WEEKLY':: character varying, 'MONTHLY':: character varying, 'QUARTERLY':: character varying, 'YEARLY':: character varying])::text[])
) ),
    CONSTRAINT analytics_snapshots_snapshot_type_check CHECK (((snapshot_type)::text = ANY ((ARRAY['WORKFORCE'::character varying, 'HIRING'::character varying, 'ATTRITION'::character varying, 'PERFORMANCE'::character varying, 'COMPENSATION'::character varying, 'ATTENDANCE'::character varying, 'TRAINING'::character varying, 'ENGAGEMENT'::character varying, 'COMPREHENSIVE'::character varying])::text[])))
);


ALTER TABLE public.analytics_snapshots OWNER TO hrms;

--
-- Name: announcement_reads; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.announcement_reads
(
  is_accepted     boolean,
  is_deleted      boolean NOT NULL,
  accepted_at     timestamp(6) without time zone,
  created_at      timestamp(6) without time zone NOT NULL,
  read_at         timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone NOT NULL,
  version         bigint,
  announcement_id uuid    NOT NULL,
  created_by      uuid,
  employee_id     uuid    NOT NULL,
  id              uuid    NOT NULL,
  tenant_id       uuid    NOT NULL,
  updated_by      uuid
);


ALTER TABLE public.announcement_reads OWNER TO hrms;

--
-- Name: announcement_target_departments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.announcement_target_departments
(
  announcement_id uuid NOT NULL,
  department_id   uuid
);


ALTER TABLE public.announcement_target_departments OWNER TO hrms;

--
-- Name: announcement_target_employees; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.announcement_target_employees
(
  announcement_id uuid NOT NULL,
  employee_id     uuid
);


ALTER TABLE public.announcement_target_employees OWNER TO hrms;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.announcements
(
  accepted_count      integer,
  is_deleted          boolean                NOT NULL,
  is_pinned           boolean,
  read_count          integer,
  requires_acceptance boolean,
  send_email          boolean,
  created_at          timestamp(6) without time zone NOT NULL,
  expires_at          timestamp(6) without time zone,
  published_at        timestamp(6) without time zone,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  published_by        uuid,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  priority            character varying(20)  NOT NULL,
  status              character varying(20)  NOT NULL,
  category            character varying(30)  NOT NULL,
  target_audience     character varying(30)  NOT NULL,
  published_by_name   character varying(200),
  attachment_url      character varying(500),
  content             text                   NOT NULL,
  title               character varying(255) NOT NULL,
  wall_post_id        uuid,
  CONSTRAINT announcements_category_check CHECK (((category)::text = ANY ((ARRAY['GENERAL':: character varying, 'POLICY_UPDATE':: character varying, 'EVENT':: character varying, 'HOLIDAY':: character varying, 'ACHIEVEMENT':: character varying, 'URGENT':: character varying, 'BENEFIT':: character varying, 'TRAINING':: character varying, 'SOCIAL':: character varying, 'IT_MAINTENANCE':: character varying, 'HEALTH_SAFETY':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT announcements_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT announcements_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SCHEDULED'::character varying, 'PUBLISHED'::character varying, 'EXPIRED'::character varying, 'ARCHIVED'::character varying])::text[]))),
    CONSTRAINT announcements_target_audience_check CHECK (((target_audience)::text = ANY ((ARRAY['ALL_EMPLOYEES'::character varying, 'SPECIFIC_DEPARTMENTS'::character varying, 'SPECIFIC_EMPLOYEES'::character varying, 'MANAGERS_ONLY'::character varying, 'NEW_JOINERS'::character varying])::text[])))
);


ALTER TABLE public.announcements OWNER TO hrms;

--
-- Name: api_key_scopes; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.api_key_scopes
(
  api_key_id uuid NOT NULL,
  scope      character varying(255)
);


ALTER TABLE public.api_key_scopes OWNER TO hrms;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.api_keys
(
  is_active                 boolean,
  is_deleted                boolean                NOT NULL,
  rate_limit                integer,
  rate_limit_window_seconds integer,
  created_at                timestamp(6) without time zone NOT NULL,
  expires_at                timestamp(6) without time zone,
  last_used_at              timestamp(6) without time zone,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  key_prefix                character varying(10),
  created_by                uuid,
  id                        uuid                   NOT NULL,
  tenant_id                 uuid                   NOT NULL,
  updated_by                uuid,
  last_used_ip              character varying(50),
  name                      character varying(100) NOT NULL,
  description               text,
  key_hash                  character varying(255) NOT NULL
);


ALTER TABLE public.api_keys OWNER TO hrms;

--
-- Name: app_permissions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.app_permissions
(
  display_order        integer,
  is_deleted           boolean                NOT NULL,
  is_system_permission boolean                NOT NULL,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  application_id       uuid                   NOT NULL,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  updated_by           uuid,
  action               character varying(30)  NOT NULL,
  category             character varying(50),
  module               character varying(50)  NOT NULL,
  code                 character varying(100) NOT NULL,
  name                 character varying(100) NOT NULL,
  depends_on           character varying(500),
  description          character varying(500)
);


ALTER TABLE public.app_permissions OWNER TO hrms;

--
-- Name: app_role_permissions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.app_role_permissions
(
  permission_id uuid NOT NULL,
  role_id       uuid NOT NULL
);


ALTER TABLE public.app_role_permissions OWNER TO hrms;

--
-- Name: app_roles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.app_roles
(
  is_default_role boolean                NOT NULL,
  is_deleted      boolean                NOT NULL,
  is_system_role  boolean                NOT NULL,
  level           integer                NOT NULL,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone NOT NULL,
  version         bigint,
  application_id  uuid                   NOT NULL,
  created_by      uuid,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  updated_by      uuid,
  code            character varying(50)  NOT NULL,
  name            character varying(100) NOT NULL,
  description     character varying(500)
);


ALTER TABLE public.app_roles OWNER TO hrms;

--
-- Name: applicants; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.applicants
(
  applied_date             date,
  expected_salary          numeric(15, 2),
  is_deleted               boolean               NOT NULL,
  offered_salary           numeric(15, 2),
  rating                   integer,
  created_at               timestamp(6) without time zone NOT NULL,
  current_stage_entered_at timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  candidate_id             uuid                  NOT NULL,
  created_by               uuid,
  id                       uuid                  NOT NULL,
  job_opening_id           uuid                  NOT NULL,
  resume_file_id           uuid,
  tenant_id                uuid                  NOT NULL,
  updated_by               uuid,
  source                   character varying(30),
  status                   character varying(30) NOT NULL,
  notes                    text,
  rejection_reason         text,
  CONSTRAINT applicants_source_check CHECK (((source)::text = ANY ((ARRAY['WEBSITE':: character varying, 'REFERRAL':: character varying, 'JOB_BOARD':: character varying, 'LINKEDIN':: character varying, 'CAMPUS':: character varying, 'AGENCY':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT applicants_status_check CHECK (((status)::text = ANY ((ARRAY['APPLIED'::character varying, 'SCREENING'::character varying, 'PHONE_SCREEN'::character varying, 'INTERVIEW'::character varying, 'TECHNICAL_ROUND'::character varying, 'HR_ROUND'::character varying, 'OFFER_PENDING'::character varying, 'OFFERED'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'WITHDRAWN'::character varying])::text[])))
);


ALTER TABLE public.applicants OWNER TO hrms;

--
-- Name: approval_delegates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.approval_delegates
(
  can_sub_delegate              boolean NOT NULL,
  end_date                      date    NOT NULL,
  expiry_notification_days      integer NOT NULL,
  is_active                     boolean NOT NULL,
  is_deleted                    boolean NOT NULL,
  max_approval_amount           numeric(38, 2),
  notify_delegate_on_assignment boolean NOT NULL,
  notify_delegator_on_action    boolean NOT NULL,
  revoked                       boolean NOT NULL,
  start_date                    date    NOT NULL,
  created_at                    timestamp(6) without time zone NOT NULL,
  revoked_at                    timestamp(6) without time zone,
  updated_at                    timestamp(6) without time zone NOT NULL,
  version                       bigint,
  created_by                    uuid,
  delegate_id                   uuid    NOT NULL,
  delegator_id                  uuid    NOT NULL,
  department_id                 uuid,
  id                            uuid    NOT NULL,
  revoked_by                    uuid,
  tenant_id                     uuid    NOT NULL,
  updated_by                    uuid,
  workflow_definition_id        uuid,
  delegate_name                 character varying(255),
  delegator_name                character varying(255),
  entity_type                   character varying(255),
  reason                        character varying(255),
  revocation_reason             character varying(255),
  CONSTRAINT approval_delegates_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['LEAVE_REQUEST':: character varying, 'EXPENSE_CLAIM':: character varying, 'TRAVEL_REQUEST':: character varying, 'LOAN_REQUEST':: character varying, 'ASSET_REQUEST':: character varying, 'TIMESHEET':: character varying, 'RESIGNATION':: character varying, 'SALARY_REVISION':: character varying, 'PROMOTION':: character varying, 'TRANSFER':: character varying, 'ONBOARDING':: character varying, 'OFFBOARDING':: character varying, 'DOCUMENT_REQUEST':: character varying, 'POLICY_ACKNOWLEDGMENT':: character varying, 'TRAINING_REQUEST':: character varying, 'REIMBURSEMENT':: character varying, 'OVERTIME':: character varying, 'SHIFT_CHANGE':: character varying, 'WORK_FROM_HOME':: character varying, 'RECRUITMENT_OFFER':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.approval_delegates OWNER TO hrms;

--
-- Name: approval_steps; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.approval_steps
(
  attachments_allowed     boolean                NOT NULL,
  auto_approve_on_timeout boolean                NOT NULL,
  auto_reject_on_timeout  boolean                NOT NULL,
  comments_required       boolean                NOT NULL,
  delegation_allowed      boolean                NOT NULL,
  escalate_after_hours    integer                NOT NULL,
  escalation_enabled      boolean                NOT NULL,
  hierarchy_level         integer                NOT NULL,
  is_deleted              boolean                NOT NULL,
  is_optional             boolean                NOT NULL,
  min_approvals           integer                NOT NULL,
  sla_hours               integer                NOT NULL,
  step_order              integer                NOT NULL,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  department_id           uuid,
  escalate_to_role_id     uuid,
  escalate_to_user_id     uuid,
  id                      uuid                   NOT NULL,
  role_id                 uuid,
  specific_user_id        uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  workflow_definition_id  uuid                   NOT NULL,
  approver_expression     character varying(255),
  approver_type           character varying(255) NOT NULL,
  condition               character varying(255),
  description             character varying(255),
  escalation_template     character varying(255),
  notification_template   character varying(255),
  reminder_template       character varying(255),
  role_name               character varying(255),
  step_name               character varying(255) NOT NULL,
  CONSTRAINT approval_steps_approver_type_check CHECK (((approver_type)::text = ANY ((ARRAY['SPECIFIC_USER':: character varying, 'ROLE':: character varying, 'REPORTING_MANAGER':: character varying, 'SKIP_LEVEL_MANAGER':: character varying, 'DEPARTMENT_HEAD':: character varying, 'HR_MANAGER':: character varying, 'FINANCE_MANAGER':: character varying, 'CEO':: character varying, 'CUSTOM_HIERARCHY':: character varying, 'DYNAMIC':: character varying, 'COMMITTEE':: character varying, 'ANY_OF_ROLE':: character varying])::text[])
) )
);


ALTER TABLE public.approval_steps OWNER TO hrms;

--
-- Name: asset_recoveries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.asset_recoveries
(
  actual_return_date   date,
  assigned_date        date,
  deduction_amount     numeric(12, 2),
  expected_return_date date,
  is_deleted           boolean                NOT NULL,
  is_waived            boolean,
  verification_date    date,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  asset_id             uuid,
  created_by           uuid,
  employee_id          uuid                   NOT NULL,
  exit_process_id      uuid                   NOT NULL,
  id                   uuid                   NOT NULL,
  recovered_by         uuid,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  verified_by          uuid,
  waived_by            uuid,
  asset_name           character varying(255) NOT NULL,
  asset_tag            character varying(255),
  asset_type           character varying(255) NOT NULL,
  condition_on_return  character varying(255),
  damage_description   text,
  remarks              text,
  serial_number        character varying(255),
  status               character varying(255),
  waiver_reason        character varying(255),
  CONSTRAINT asset_recoveries_asset_type_check CHECK (((asset_type)::text = ANY ((ARRAY['LAPTOP':: character varying, 'DESKTOP':: character varying, 'MOBILE_PHONE':: character varying, 'TABLET':: character varying, 'MONITOR':: character varying, 'KEYBOARD_MOUSE':: character varying, 'HEADSET':: character varying, 'WEBCAM':: character varying, 'ID_CARD':: character varying, 'ACCESS_CARD':: character varying, 'PARKING_CARD':: character varying, 'KEYS':: character varying, 'UNIFORM':: character varying, 'SAFETY_EQUIPMENT':: character varying, 'VEHICLE':: character varying, 'CREDIT_CARD':: character varying, 'SIM_CARD':: character varying, 'FURNITURE':: character varying, 'BOOKS_MATERIALS':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT asset_recoveries_condition_on_return_check CHECK (((condition_on_return)::text = ANY ((ARRAY['EXCELLENT'::character varying, 'GOOD'::character varying, 'FAIR'::character varying, 'POOR'::character varying, 'DAMAGED'::character varying, 'NON_FUNCTIONAL'::character varying])::text[]))),
    CONSTRAINT asset_recoveries_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'RETURNED'::character varying, 'DAMAGED'::character varying, 'LOST'::character varying, 'WAIVED'::character varying, 'NOT_APPLICABLE'::character varying])::text[])))
);


ALTER TABLE public.asset_recoveries OWNER TO hrms;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.assets
(
  current_value   numeric(10, 2),
  purchase_cost   numeric(10, 2),
  purchase_date   date,
  warranty_expiry date,
  created_at      timestamp(6) without time zone,
  updated_at      timestamp(6) without time zone,
  version         bigint,
  assigned_to     uuid,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  status          character varying(20),
  asset_code      character varying(50)  NOT NULL,
  category        character varying(50),
  brand           character varying(100),
  model           character varying(100),
  serial_number   character varying(100),
  asset_name      character varying(200) NOT NULL,
  location        character varying(200),
  notes           text,
  CONSTRAINT assets_category_check CHECK (((category)::text = ANY ((ARRAY['LAPTOP':: character varying, 'DESKTOP':: character varying, 'MONITOR':: character varying, 'PHONE':: character varying, 'TABLET':: character varying, 'FURNITURE':: character varying, 'VEHICLE':: character varying, 'SOFTWARE_LICENSE':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT assets_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'ASSIGNED'::character varying, 'IN_MAINTENANCE'::character varying, 'RETIRED'::character varying, 'LOST'::character varying])::text[])))
);


ALTER TABLE public.assets OWNER TO hrms;

--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.attendance_records
(
  attendance_date              date                  NOT NULL,
  break_duration_minutes       integer,
  check_in_distance_meters     integer,
  check_in_latitude            numeric(10, 8),
  check_in_longitude           numeric(11, 8),
  check_in_within_geofence     boolean,
  check_out_distance_meters    integer,
  check_out_latitude           numeric(10, 8),
  check_out_longitude          numeric(11, 8),
  check_out_within_geofence    boolean,
  early_departure_minutes      integer,
  is_deleted                   boolean               NOT NULL,
  is_early_departure           boolean,
  is_half_day                  boolean,
  is_late                      boolean,
  is_overtime                  boolean,
  is_remote_checkin            boolean,
  late_by_minutes              integer,
  overtime_minutes             integer,
  regularization_approved      boolean,
  regularization_requested     boolean,
  work_duration_minutes        integer,
  approved_at                  timestamp(6) without time zone,
  check_in_time                timestamp(6) without time zone,
  check_out_time               timestamp(6) without time zone,
  created_at                   timestamp(6) without time zone NOT NULL,
  updated_at                   timestamp(6) without time zone NOT NULL,
  version                      bigint,
  approved_by                  uuid,
  check_in_office_location_id  uuid,
  check_out_office_location_id uuid,
  created_by                   uuid,
  employee_id                  uuid                  NOT NULL,
  id                           uuid                  NOT NULL,
  shift_id                     uuid,
  tenant_id                    uuid                  NOT NULL,
  updated_by                   uuid,
  check_in_ip                  character varying(50),
  check_in_source              character varying(50),
  check_out_ip                 character varying(50),
  check_out_source             character varying(50),
  status                       character varying(50) NOT NULL,
  check_in_location            text,
  check_out_location           text,
  notes                        text,
  regularization_reason        text,
  CONSTRAINT attendance_records_status_check CHECK (((status)::text = ANY ((ARRAY['PRESENT':: character varying, 'ABSENT':: character varying, 'HALF_DAY':: character varying, 'INCOMPLETE':: character varying, 'ON_LEAVE':: character varying, 'WEEKLY_OFF':: character varying, 'HOLIDAY':: character varying, 'PENDING_REGULARIZATION':: character varying])::text[])
) )
);


ALTER TABLE public.attendance_records OWNER TO hrms;

--
-- Name: attendance_regularization_config; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.attendance_regularization_config
(
  id                         uuid                  DEFAULT gen_random_uuid() NOT NULL,
  tenant_id                  uuid                                            NOT NULL,
  auto_regularize_enabled    boolean               DEFAULT false             NOT NULL,
  auto_regularize_after_days integer               DEFAULT 3                 NOT NULL,
  default_regularize_to      character varying(20) DEFAULT 'PRESENT'::character varying NOT NULL,
  notify_employee            boolean               DEFAULT true              NOT NULL,
  notify_manager             boolean               DEFAULT false             NOT NULL,
  created_at                 timestamp without time zone DEFAULT now() NOT NULL,
  updated_at                 timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendance_regularization_config OWNER TO hrms;

--
-- Name: attendance_time_entries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.attendance_time_entries
(
  duration_minutes     integer,
  is_deleted           boolean               NOT NULL,
  sequence_number      integer,
  check_in_time        timestamp(6) without time zone NOT NULL,
  check_out_time       timestamp(6) without time zone,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  attendance_record_id uuid                  NOT NULL,
  created_by           uuid,
  id                   uuid                  NOT NULL,
  updated_by           uuid,
  check_in_ip          character varying(50),
  check_in_source      character varying(50),
  check_out_ip         character varying(50),
  check_out_source     character varying(50),
  entry_type           character varying(50) NOT NULL,
  check_in_location    text,
  check_out_location   text,
  notes                text,
  CONSTRAINT attendance_time_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['REGULAR':: character varying, 'BREAK':: character varying, 'LUNCH':: character varying, 'MEETING':: character varying, 'CLIENT_VISIT':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.attendance_time_entries OWNER TO hrms;

--
-- Name: attrition_predictions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.attrition_predictions
(
  action_taken          boolean,
  actual_leave_date     date,
  commute_risk          numeric(5, 2),
  compensation_risk     numeric(5, 2),
  confidence_score      numeric(5, 2),
  engagement_risk       numeric(5, 2),
  engagement_score      numeric(5, 2),
  is_deleted            boolean                NOT NULL,
  last_promotion_months integer,
  manager_change_risk   numeric(5, 2),
  manager_tenure_months integer,
  overtime_hours_avg    numeric(5, 2),
  performance_rating    numeric(3, 1),
  performance_risk      numeric(5, 2),
  predicted_leave_date  date,
  prediction_date       date                   NOT NULL,
  promotion_gap_risk    numeric(5, 2),
  risk_score            numeric(5, 2)          NOT NULL,
  salary_percentile     numeric(5, 2),
  tenure_months         integer,
  tenure_risk           numeric(5, 2),
  workload_risk         numeric(5, 2),
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  created_by            uuid,
  employee_id           uuid                   NOT NULL,
  id                    uuid                   NOT NULL,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  actual_outcome        character varying(255),
  recommendations       text,
  risk_level            character varying(255) NOT NULL,
  CONSTRAINT attrition_predictions_actual_outcome_check CHECK (((actual_outcome)::text = ANY ((ARRAY['STAYED':: character varying, 'LEFT_VOLUNTARY':: character varying, 'LEFT_INVOLUNTARY':: character varying, 'UNKNOWN':: character varying])::text[])
) ),
    CONSTRAINT attrition_predictions_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[])))
);


ALTER TABLE public.attrition_predictions OWNER TO hrms;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.audit_logs
(
  is_deleted  boolean                NOT NULL,
  created_at  timestamp(6) without time zone NOT NULL,
  updated_at  timestamp(6) without time zone NOT NULL,
  version     bigint,
  actor_id    uuid                   NOT NULL,
  created_by  uuid,
  entity_id   uuid                   NOT NULL,
  id          uuid                   NOT NULL,
  tenant_id   uuid                   NOT NULL,
  updated_by  uuid,
  action      character varying(20)  NOT NULL,
  ip_address  character varying(50),
  entity_type character varying(100) NOT NULL,
  actor_email character varying(200),
  user_agent  character varying(500),
  changes     text,
  new_value   text,
  old_value   text,
  description text,
  CONSTRAINT audit_logs_action_check CHECK (((action)::text = ANY ((ARRAY['CREATE':: character varying, 'UPDATE':: character varying, 'DELETE':: character varying, 'LOGIN':: character varying, 'LOGOUT':: character varying, 'PASSWORD_CHANGE':: character varying, 'STATUS_CHANGE':: character varying, 'PERMISSION_CHANGE':: character varying])::text[])
) )
);


ALTER TABLE public.audit_logs OWNER TO hrms;

--
-- Name: background_verifications; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.background_verifications
(
  actual_completion_date   date,
  expected_completion_date date,
  initiated_date           date,
  is_deleted               boolean                NOT NULL,
  is_green_channel         boolean,
  priority                 integer,
  review_date              date,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  employee_id              uuid                   NOT NULL,
  id                       uuid                   NOT NULL,
  initiated_by             uuid,
  reviewed_by              uuid,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  vendor_id                uuid,
  candidate_email          character varying(255),
  candidate_name           character varying(255) NOT NULL,
  overall_result           character varying(255),
  review_notes             text,
  status                   character varying(255),
  vendor_name              character varying(255),
  vendor_reference         character varying(255),
  CONSTRAINT background_verifications_overall_result_check CHECK (((overall_result)::text = ANY ((ARRAY['CLEAR':: character varying, 'DISCREPANCY':: character varying, 'INSUFFICIENT':: character varying, 'UNABLE_TO_VERIFY':: character varying, 'PENDING':: character varying])::text[])
) ),
    CONSTRAINT background_verifications_status_check CHECK (((status)::text = ANY ((ARRAY['INITIATED'::character varying, 'IN_PROGRESS'::character varying, 'PENDING_DOCUMENTS'::character varying, 'UNDER_REVIEW'::character varying, 'COMPLETED'::character varying, 'ON_HOLD'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.background_verifications OWNER TO hrms;

--
-- Name: benefit_claim_documents; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.benefit_claim_documents
(
  claim_id     uuid NOT NULL,
  document_url character varying(255)
);


ALTER TABLE public.benefit_claim_documents OWNER TO hrms;

--
-- Name: benefit_claims; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.benefit_claims
(
  admission_date             date,
  appeal_date                date,
  approved_amount            numeric(38, 2),
  claim_date                 date,
  claimed_amount             numeric(38, 2)         NOT NULL,
  copay_amount               numeric(38, 2),
  deductible_applied         numeric(38, 2),
  discharge_date             date,
  eligible_amount            numeric(38, 2),
  is_appealed                boolean                NOT NULL,
  is_deleted                 boolean                NOT NULL,
  is_hospitalization         boolean                NOT NULL,
  number_of_days             integer                NOT NULL,
  payment_date               date,
  pre_authorization_approved boolean                NOT NULL,
  pre_authorization_required boolean                NOT NULL,
  rejected_amount            numeric(38, 2),
  service_date               date,
  approved_at                timestamp(6) without time zone,
  created_at                 timestamp(6) without time zone NOT NULL,
  processed_at               timestamp(6) without time zone,
  updated_at                 timestamp(6) without time zone NOT NULL,
  version                    bigint,
  approved_by                uuid,
  created_by                 uuid,
  dependent_id               uuid,
  employee_id                uuid                   NOT NULL,
  enrollment_id              uuid                   NOT NULL,
  id                         uuid                   NOT NULL,
  processed_by               uuid,
  tenant_id                  uuid                   NOT NULL,
  updated_by                 uuid,
  appeal_reason              character varying(255),
  appeal_status              character varying(255),
  approval_comments          character varying(255),
  bank_account_number        character varying(255),
  bill_number                character varying(255),
  claim_number               character varying(255) NOT NULL,
  claim_type                 character varying(255) NOT NULL,
  claimant_name              character varying(255),
  claimant_relationship      character varying(255),
  description                character varying(255),
  diagnosis_code             character varying(255),
  hospital_name              character varying(255),
  ifsc_code                  character varying(255),
  payment_mode               character varying(255),
  payment_reference          character varying(255),
  pre_authorization_number   character varying(255),
  prescription_number        character varying(255),
  procedure_code             character varying(255),
  processing_comments        character varying(255),
  provider_name              character varying(255),
  provider_type              character varying(255),
  rejection_reason           character varying(255),
  status                     character varying(255) NOT NULL,
  upi_id                     character varying(255),
  CONSTRAINT benefit_claims_appeal_status_check CHECK (((appeal_status)::text = ANY ((ARRAY['DRAFT':: character varying, 'SUBMITTED':: character varying, 'DOCUMENTS_PENDING':: character varying, 'UNDER_REVIEW':: character varying, 'ADDITIONAL_INFO_REQUIRED':: character varying, 'PRE_AUTH_PENDING':: character varying, 'PRE_AUTH_APPROVED':: character varying, 'PRE_AUTH_REJECTED':: character varying, 'APPROVED':: character varying, 'PARTIALLY_APPROVED':: character varying, 'REJECTED':: character varying, 'PAYMENT_INITIATED':: character varying, 'PAYMENT_COMPLETED':: character varying, 'CLOSED':: character varying, 'APPEALED':: character varying, 'APPEAL_APPROVED':: character varying, 'APPEAL_REJECTED':: character varying])::text[])
) ),
    CONSTRAINT benefit_claims_claim_type_check CHECK (((claim_type)::text = ANY ((ARRAY['HOSPITALIZATION'::character varying, 'OUTPATIENT'::character varying, 'PHARMACY'::character varying, 'LAB_TEST'::character varying, 'CONSULTATION'::character varying, 'MATERNITY'::character varying, 'DENTAL'::character varying, 'VISION'::character varying, 'MENTAL_HEALTH'::character varying, 'PREVENTIVE_CARE'::character varying, 'EMERGENCY'::character varying, 'GYM_MEMBERSHIP'::character varying, 'FITNESS_EQUIPMENT'::character varying, 'WELLNESS_PROGRAM'::character varying, 'HEALTH_CHECKUP'::character varying, 'VACCINATION'::character varying, 'CHILDCARE'::character varying, 'ELDER_CARE'::character varying, 'TRANSPORTATION'::character varying, 'EDUCATION'::character varying, 'ACCIDENT'::character varying, 'CRITICAL_ILLNESS'::character varying, 'LIFE_INSURANCE'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT benefit_claims_payment_mode_check CHECK (((payment_mode)::text = ANY ((ARRAY['BANK_TRANSFER'::character varying, 'CHECK'::character varying, 'PAYROLL_CREDIT'::character varying, 'UPI'::character varying, 'DIRECT_SETTLEMENT'::character varying])::text[]))),
    CONSTRAINT benefit_claims_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'DOCUMENTS_PENDING'::character varying, 'UNDER_REVIEW'::character varying, 'ADDITIONAL_INFO_REQUIRED'::character varying, 'PRE_AUTH_PENDING'::character varying, 'PRE_AUTH_APPROVED'::character varying, 'PRE_AUTH_REJECTED'::character varying, 'APPROVED'::character varying, 'PARTIALLY_APPROVED'::character varying, 'REJECTED'::character varying, 'PAYMENT_INITIATED'::character varying, 'PAYMENT_COMPLETED'::character varying, 'CLOSED'::character varying, 'APPEALED'::character varying, 'APPEAL_APPROVED'::character varying, 'APPEAL_REJECTED'::character varying])::text[])))
);


ALTER TABLE public.benefit_claims OWNER TO hrms;

--
-- Name: benefit_dependents; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.benefit_dependents
(
  coverage_end_date           date,
  coverage_start_date         date,
  date_of_birth               date                   NOT NULL,
  has_pre_existing_conditions boolean                NOT NULL,
  is_covered                  boolean                NOT NULL,
  is_deleted                  boolean                NOT NULL,
  is_disabled                 boolean                NOT NULL,
  created_at                  timestamp(6) without time zone NOT NULL,
  updated_at                  timestamp(6) without time zone NOT NULL,
  version                     bigint,
  created_by                  uuid,
  enrollment_id               uuid                   NOT NULL,
  id                          uuid                   NOT NULL,
  tenant_id                   uuid                   NOT NULL,
  updated_by                  uuid,
  address                     character varying(255),
  birth_certificate_document  character varying(255),
  city                        character varying(255),
  country                     character varying(255),
  email                       character varying(255),
  first_name                  character varying(255) NOT NULL,
  gender                      character varying(255),
  last_name                   character varying(255) NOT NULL,
  membership_id               character varying(255),
  national_id                 character varying(255),
  passport_number             character varying(255),
  phone                       character varying(255),
  postal_code                 character varying(255),
  pre_existing_conditions     character varying(255),
  relationship                character varying(255) NOT NULL,
  relationship_proof_document character varying(255),
  state                       character varying(255),
  status                      character varying(255),
  CONSTRAINT benefit_dependents_relationship_check CHECK (((relationship)::text = ANY ((ARRAY['SPOUSE':: character varying, 'CHILD':: character varying, 'PARENT':: character varying, 'PARENT_IN_LAW':: character varying, 'SIBLING':: character varying, 'DOMESTIC_PARTNER':: character varying, 'LEGAL_GUARDIAN':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT benefit_dependents_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING_VERIFICATION'::character varying, 'ACTIVE'::character varying, 'INACTIVE'::character varying, 'REMOVED'::character varying])::text[])))
);


ALTER TABLE public.benefit_dependents OWNER TO hrms;

--
-- Name: benefit_enrollments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.benefit_enrollments
(
  claims_utilized       numeric(38, 2),
  cobra_active          boolean                NOT NULL,
  cobra_end_date        date,
  cobra_premium         numeric(38, 2),
  cobra_start_date      date,
  current_coverage      numeric(38, 2),
  effective_date        date,
  employee_contribution numeric(38, 2),
  employer_contribution numeric(38, 2),
  enrollment_date       date,
  flex_credits_used     numeric(38, 2),
  is_deleted            boolean                NOT NULL,
  out_of_pocket_cost    numeric(38, 2),
  remaining_coverage    numeric(38, 2),
  termination_date      date,
  total_premium         numeric(38, 2),
  waived                boolean                NOT NULL,
  waiver_date           date,
  approved_at           timestamp(6) without time zone,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  approved_by           uuid,
  benefit_plan_id       uuid                   NOT NULL,
  created_by            uuid,
  employee_id           uuid                   NOT NULL,
  id                    uuid                   NOT NULL,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  approval_comments     character varying(255),
  coverage_level        character varying(255),
  membership_id         character varying(255),
  nominee_details       character varying(255),
  policy_card_number    character varying(255),
  selected_options      character varying(255),
  status                character varying(255) NOT NULL,
  waiver_reason         character varying(255),
  CONSTRAINT benefit_enrollments_coverage_level_check CHECK (((coverage_level)::text = ANY ((ARRAY['EMPLOYEE_ONLY':: character varying, 'EMPLOYEE_SPOUSE':: character varying, 'EMPLOYEE_CHILDREN':: character varying, 'FAMILY':: character varying, 'EMPLOYEE_PARENT':: character varying, 'EMPLOYEE_PARENT_IN_LAW':: character varying])::text[])
) ),
    CONSTRAINT benefit_enrollments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'ACTIVE'::character varying, 'SUSPENDED'::character varying, 'TERMINATED'::character varying, 'COBRA_CONTINUATION'::character varying, 'WAIVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.benefit_enrollments OWNER TO hrms;

--
-- Name: benefit_plans; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.benefit_plans
(
  coverage_amount       numeric(12, 2),
  effective_date        date,
  employee_contribution numeric(10, 2),
  employer_contribution numeric(10, 2),
  expiry_date           date,
  is_active             boolean,
  created_at            timestamp(6) without time zone,
  updated_at            timestamp(6) without time zone,
  version               bigint,
  id                    uuid                   NOT NULL,
  provider_id           uuid,
  tenant_id             uuid                   NOT NULL,
  benefit_type          character varying(50),
  plan_code             character varying(50)  NOT NULL,
  plan_name             character varying(200) NOT NULL,
  description           text,
  eligibility_criteria  text,
  CONSTRAINT benefit_plans_benefit_type_check CHECK (((benefit_type)::text = ANY ((ARRAY['HEALTH_INSURANCE':: character varying, 'DENTAL':: character varying, 'VISION':: character varying, 'LIFE_INSURANCE':: character varying, 'RETIREMENT_401K':: character varying, 'PTO':: character varying, 'WELLNESS':: character varying, 'GYM':: character varying, 'EDUCATION':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.benefit_plans OWNER TO hrms;

--
-- Name: benefit_plans_enhanced; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.benefit_plans_enhanced
(
  annual_wellness_allowance        numeric(38, 2),
  cobra_continuation_months        integer                NOT NULL,
  cobra_eligible                   boolean                NOT NULL,
  copay_percentage                 numeric(38, 2),
  counseling_sessions_per_year     integer                NOT NULL,
  coverage_amount                  numeric(38, 2),
  deductible_amount                numeric(38, 2),
  dependents_covered               boolean                NOT NULL,
  effective_from                   date,
  effective_to                     date,
  employee_contribution            numeric(38, 2),
  employee_contribution_percentage numeric(38, 2),
  employer_contribution            numeric(38, 2),
  employer_contribution_percentage numeric(38, 2),
  employer_match_percentage        numeric(38, 2),
  flex_credits_provided            numeric(38, 2),
  gym_membership_included          boolean                NOT NULL,
  is_active                        boolean                NOT NULL,
  is_deleted                       boolean                NOT NULL,
  is_flexible                      boolean                NOT NULL,
  maternity_benefits               boolean                NOT NULL,
  maternity_coverage               numeric(38, 2),
  max_contribution_limit           numeric(38, 2),
  max_dependents                   integer                NOT NULL,
  mental_health_support            boolean                NOT NULL,
  min_service_months               integer                NOT NULL,
  network_hospitals_only           boolean                NOT NULL,
  pre_existing_covered             boolean                NOT NULL,
  pre_existing_waiting_years       integer                NOT NULL,
  premium_amount                   numeric(38, 2),
  room_rent_limit                  numeric(38, 2),
  sum_insured                      numeric(38, 2),
  vesting_period_years             numeric(38, 2),
  waiting_period_days              integer                NOT NULL,
  created_at                       timestamp(6) without time zone NOT NULL,
  updated_at                       timestamp(6) without time zone NOT NULL,
  version                          bigint,
  created_by                       uuid,
  id                               uuid                   NOT NULL,
  tenant_id                        uuid                   NOT NULL,
  updated_by                       uuid,
  category                         character varying(255) NOT NULL,
  description                      character varying(255),
  eligible_departments             character varying(255),
  eligible_grades                  character varying(255),
  flexible_options                 character varying(255),
  name                             character varying(255) NOT NULL,
  plan_type                        character varying(255) NOT NULL,
  policy_number                    character varying(255),
  premium_frequency                character varying(255),
  provider_code                    character varying(255),
  provider_name                    character varying(255),
  CONSTRAINT benefit_plans_enhanced_category_check CHECK (((category)::text = ANY ((ARRAY['HEALTH':: character varying, 'INSURANCE':: character varying, 'RETIREMENT':: character varying, 'WELLNESS':: character varying, 'LIFESTYLE':: character varying, 'FINANCIAL':: character varying, 'FAMILY':: character varying, 'EDUCATION':: character varying])::text[])
) ),
    CONSTRAINT benefit_plans_enhanced_plan_type_check CHECK (((plan_type)::text = ANY ((ARRAY['HEALTH_INSURANCE'::character varying, 'DENTAL_INSURANCE'::character varying, 'VISION_INSURANCE'::character varying, 'LIFE_INSURANCE'::character varying, 'DISABILITY_INSURANCE'::character varying, 'ACCIDENT_INSURANCE'::character varying, 'CRITICAL_ILLNESS'::character varying, 'RETIREMENT_401K'::character varying, 'PENSION'::character varying, 'PROVIDENT_FUND'::character varying, 'GRATUITY'::character varying, 'WELLNESS_ALLOWANCE'::character varying, 'GYM_MEMBERSHIP'::character varying, 'MENTAL_HEALTH'::character varying, 'FLEXIBLE_SPENDING_ACCOUNT'::character varying, 'HEALTH_SAVINGS_ACCOUNT'::character varying, 'TRANSPORTATION'::character varying, 'EDUCATION_ASSISTANCE'::character varying, 'CHILDCARE'::character varying, 'MEAL_ALLOWANCE'::character varying, 'MOBILE_ALLOWANCE'::character varying, 'WORK_FROM_HOME'::character varying, 'STOCK_OPTIONS'::character varying, 'ESOP'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT benefit_plans_enhanced_premium_frequency_check CHECK (((premium_frequency)::text = ANY ((ARRAY['MONTHLY'::character varying, 'QUARTERLY'::character varying, 'SEMI_ANNUALLY'::character varying, 'ANNUALLY'::character varying, 'ONE_TIME'::character varying])::text[])))
);


ALTER TABLE public.benefit_plans_enhanced OWNER TO hrms;

--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.blog_categories
(
  is_deleted  boolean                NOT NULL,
  order_index integer,
  color       character varying(7),
  created_at  timestamp(6) without time zone NOT NULL,
  updated_at  timestamp(6) without time zone NOT NULL,
  version     bigint,
  created_by  uuid,
  id          uuid                   NOT NULL,
  tenant_id   uuid                   NOT NULL,
  updated_by  uuid,
  icon        character varying(50),
  name        character varying(200) NOT NULL,
  slug        character varying(200) NOT NULL,
  description text
);


ALTER TABLE public.blog_categories OWNER TO hrms;

--
-- Name: blog_comments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.blog_comments
(
  is_approved       boolean NOT NULL,
  is_deleted        boolean NOT NULL,
  like_count        integer NOT NULL,
  approved_at       timestamp(6) without time zone,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  approved_by       uuid,
  created_by        uuid,
  id                uuid    NOT NULL,
  parent_comment_id uuid,
  post_id           uuid    NOT NULL,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid,
  content           text    NOT NULL
);


ALTER TABLE public.blog_comments OWNER TO hrms;

--
-- Name: blog_likes; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.blog_likes
(
  is_deleted boolean NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  version    bigint,
  created_by uuid,
  id         uuid    NOT NULL,
  post_id    uuid    NOT NULL,
  tenant_id  uuid    NOT NULL,
  updated_by uuid,
  user_id    uuid    NOT NULL
);


ALTER TABLE public.blog_likes OWNER TO hrms;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.blog_posts
(
  comment_count      integer                NOT NULL,
  is_deleted         boolean                NOT NULL,
  is_featured        boolean                NOT NULL,
  like_count         integer                NOT NULL,
  read_time_minutes  integer,
  view_count         integer                NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  featured_until     timestamp(6) without time zone,
  last_viewed_at     timestamp(6) without time zone,
  published_at       timestamp(6) without time zone,
  scheduled_for      timestamp(6) without time zone,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  category_id        uuid,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  last_viewed_by     uuid,
  published_by       uuid,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  status             character varying(50)  NOT NULL,
  visibility         character varying(50)  NOT NULL,
  featured_image_url character varying(500),
  slug               character varying(500) NOT NULL,
  title              character varying(500) NOT NULL,
  content            jsonb                  NOT NULL,
  excerpt            text,
  CONSTRAINT blog_posts_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'PUBLISHED':: character varying, 'SCHEDULED':: character varying, 'ARCHIVED':: character varying])::text[])
) ),
    CONSTRAINT blog_posts_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'ORGANIZATION'::character varying, 'TEAM'::character varying, 'PRIVATE'::character varying, 'RESTRICTED'::character varying])::text[])))
);


ALTER TABLE public.blog_posts OWNER TO hrms;

--
-- Name: budget_scenarios; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.budget_scenarios
(
  attrition_rate_adjustment numeric(5, 2),
  cost_variance             numeric(15, 2),
  headcount_adjustment      integer,
  hiring_freeze             boolean,
  is_deleted                boolean                NOT NULL,
  is_selected               boolean,
  projected_cost            numeric(15, 2),
  projected_headcount       integer,
  salary_adjustment_percent numeric(5, 2),
  variance_percent          numeric(5, 2),
  created_at                timestamp(6) without time zone NOT NULL,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  base_budget_id            uuid,
  created_by                uuid,
  id                        uuid                   NOT NULL,
  tenant_id                 uuid                   NOT NULL,
  updated_by                uuid,
  description               text,
  name                      character varying(255) NOT NULL,
  notes                     text,
  scenario_type             character varying(255) NOT NULL,
  CONSTRAINT budget_scenarios_scenario_type_check CHECK (((scenario_type)::text = ANY ((ARRAY['GROWTH':: character varying, 'OPTIMIZATION':: character varying, 'REDUCTION':: character varying, 'RESTRUCTURING':: character varying, 'WHAT_IF':: character varying])::text[])
) )
);


ALTER TABLE public.budget_scenarios OWNER TO hrms;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.calendar_events
(
  all_day             boolean,
  is_recurring        boolean,
  reminder_minutes    integer,
  reminder_sent       boolean,
  created_at          timestamp(6) without time zone,
  end_time            timestamp(6) without time zone NOT NULL,
  last_synced_at      timestamp(6) without time zone,
  recurrence_end_date timestamp(6) without time zone,
  start_time          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone,
  created_by          uuid,
  employee_id         uuid                   NOT NULL,
  id                  uuid                   NOT NULL,
  organizer_id        uuid,
  parent_event_id     uuid,
  tenant_id           uuid                   NOT NULL,
  attendee_ids        text,
  color               character varying(255),
  description         text,
  event_type          character varying(255) NOT NULL,
  external_event_id   character varying(255),
  location            character varying(255),
  meeting_link        character varying(255),
  notes               character varying(255),
  recurrence_pattern  character varying(255),
  status              character varying(255) NOT NULL,
  sync_provider       character varying(255),
  sync_status         character varying(255),
  title               character varying(255) NOT NULL,
  visibility          character varying(255),
  CONSTRAINT calendar_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['MEETING':: character varying, 'APPOINTMENT':: character varying, 'TASK':: character varying, 'REMINDER':: character varying, 'OUT_OF_OFFICE':: character varying, 'HOLIDAY':: character varying, 'TRAINING':: character varying, 'INTERVIEW':: character varying, 'REVIEW':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT calendar_events_recurrence_pattern_check CHECK (((recurrence_pattern)::text = ANY ((ARRAY['DAILY'::character varying, 'WEEKLY'::character varying, 'BIWEEKLY'::character varying, 'MONTHLY'::character varying, 'YEARLY'::character varying])::text[]))),
    CONSTRAINT calendar_events_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'CONFIRMED'::character varying, 'TENTATIVE'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying])::text[]))),
    CONSTRAINT calendar_events_sync_provider_check CHECK (((sync_provider)::text = ANY ((ARRAY['GOOGLE'::character varying, 'OUTLOOK'::character varying, 'APPLE'::character varying, 'NONE'::character varying])::text[]))),
    CONSTRAINT calendar_events_sync_status_check CHECK (((sync_status)::text = ANY ((ARRAY['NOT_SYNCED'::character varying, 'SYNCED'::character varying, 'PENDING'::character varying, 'SYNC_ERROR'::character varying])::text[]))),
    CONSTRAINT calendar_events_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'PRIVATE'::character varying, 'CONFIDENTIAL'::character varying])::text[])))
);


ALTER TABLE public.calendar_events OWNER TO hrms;

--
-- Name: candidate_match_scores; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.candidate_match_scores
(
  cultural_fit_score     double precision,
  education_match_score  double precision,
  experience_match_score double precision,
  overall_match_score    double precision NOT NULL,
  skills_match_score     double precision,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone,
  candidate_id           uuid             NOT NULL,
  id                     uuid             NOT NULL,
  job_opening_id         uuid             NOT NULL,
  tenant_id              uuid             NOT NULL,
  ai_model_version       character varying(50),
  recommendation         character varying(50),
  gaps                   text,
  matching_criteria      text,
  strengths              text,
  CONSTRAINT candidate_match_scores_recommendation_check CHECK (((recommendation)::text = ANY ((ARRAY['HIGHLY_RECOMMENDED':: character varying, 'RECOMMENDED':: character varying, 'CONSIDER':: character varying, 'NOT_RECOMMENDED':: character varying])::text[])
) )
);


ALTER TABLE public.candidate_match_scores OWNER TO hrms;

--
-- Name: candidates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.candidates
(
  applied_date          date,
  current_ctc           numeric(38, 2),
  expected_ctc          numeric(38, 2),
  notice_period_days    integer,
  offer_accepted_date   date,
  offer_declined_date   date,
  offer_extended_date   date,
  offered_ctc           numeric(38, 2),
  proposed_joining_date date,
  total_experience      numeric(38, 2),
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone,
  assigned_recruiter_id uuid,
  id                    uuid                   NOT NULL,
  job_opening_id        uuid                   NOT NULL,
  offer_letter_id       uuid,
  tenant_id             uuid                   NOT NULL,
  phone                 character varying(20),
  status                character varying(30)  NOT NULL,
  candidate_code        character varying(50)  NOT NULL,
  current_stage         character varying(60),
  first_name            character varying(100) NOT NULL,
  last_name             character varying(100) NOT NULL,
  source                character varying(100),
  current_company       character varying(200),
  current_designation   character varying(200),
  current_location      character varying(200),
  email                 character varying(200) NOT NULL,
  offered_designation   character varying(200),
  resume_url            character varying(500),
  notes                 text,
  offer_decline_reason  text,
  created_by            uuid,
  updated_by            uuid,
  version               bigint,
  is_deleted            boolean DEFAULT false  NOT NULL
);


ALTER TABLE public.candidates OWNER TO hrms;

--
-- Name: challenge_participants; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.challenge_participants
(
  completion_percentage double precision,
  current_streak        integer,
  goal_achieved         boolean,
  goal_achieved_date    date,
  is_deleted            boolean                NOT NULL,
  last_activity_date    date,
  longest_streak        integer,
  points_earned         integer,
  rank_position         integer,
  total_progress        double precision,
  created_at            timestamp(6) without time zone NOT NULL,
  joined_at             timestamp(6) without time zone,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  challenge_id          uuid                   NOT NULL,
  created_by            uuid,
  employee_id           uuid                   NOT NULL,
  id                    uuid                   NOT NULL,
  team_id               uuid,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  status                character varying(255) NOT NULL,
  team_name             character varying(255),
  CONSTRAINT challenge_participants_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'COMPLETED':: character varying, 'WITHDRAWN':: character varying, 'DISQUALIFIED':: character varying])::text[])
) )
);


ALTER TABLE public.challenge_participants OWNER TO hrms;

--
-- Name: chatbot_conversations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.chatbot_conversations
(
  resolved             boolean,
  satisfaction_rating  integer,
  was_escalated        boolean,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone,
  escalated_to         uuid,
  id                   uuid                  NOT NULL,
  session_id           uuid                  NOT NULL,
  tenant_id            uuid                  NOT NULL,
  user_id              uuid,
  status               character varying(20) NOT NULL,
  intent               character varying(100),
  conversation_history text,
  entities             text,
  CONSTRAINT chatbot_conversations_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'RESOLVED':: character varying, 'ESCALATED':: character varying, 'ABANDONED':: character varying])::text[])
) )
);


ALTER TABLE public.chatbot_conversations OWNER TO hrms;

--
-- Name: comp_off_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.comp_off_requests
(
  attendance_date  date                  NOT NULL,
  comp_off_days    numeric(4, 2)         NOT NULL,
  overtime_minutes integer               NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  reviewed_at      timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  employee_id      uuid                  NOT NULL,
  id               uuid                  NOT NULL,
  leave_balance_id uuid,
  requested_by     uuid                  NOT NULL,
  reviewed_by      uuid,
  tenant_id        uuid                  NOT NULL,
  status           character varying(20) NOT NULL,
  reason           text,
  review_note      text,
  CONSTRAINT comp_off_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'CREDITED':: character varying])::text[])
) )
);


ALTER TABLE public.comp_off_requests OWNER TO hrms;

--
-- Name: comp_time_balances; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.comp_time_balances
(
  at_max_balance  boolean        NOT NULL,
  current_balance numeric(38, 2) NOT NULL,
  fiscal_year     integer        NOT NULL,
  is_deleted      boolean        NOT NULL,
  max_balance     numeric(38, 2),
  total_accrued   numeric(38, 2) NOT NULL,
  total_expired   numeric(38, 2) NOT NULL,
  total_forfeited numeric(38, 2) NOT NULL,
  total_used      numeric(38, 2) NOT NULL,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone NOT NULL,
  version         bigint,
  created_by      uuid,
  employee_id     uuid           NOT NULL,
  id              uuid           NOT NULL,
  tenant_id       uuid           NOT NULL,
  updated_by      uuid
);


ALTER TABLE public.comp_time_balances OWNER TO hrms;

--
-- Name: comp_time_transactions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.comp_time_transactions
(
  balance_after         numeric(38, 2),
  expiry_date           date,
  hours                 numeric(38, 2)         NOT NULL,
  original_accrual_date date,
  overtime_date         date,
  transaction_date      date                   NOT NULL,
  usage_date            date,
  processed_at          timestamp(6) without time zone,
  balance_id            uuid                   NOT NULL,
  id                    uuid                   NOT NULL,
  leave_request_id      uuid,
  overtime_request_id   uuid,
  processed_by          uuid,
  description           character varying(255),
  transaction_type      character varying(255) NOT NULL,
  CONSTRAINT comp_time_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['ACCRUAL':: character varying, 'USAGE':: character varying, 'EXPIRY':: character varying, 'FORFEITURE':: character varying, 'ADJUSTMENT':: character varying, 'CARRYOVER':: character varying, 'PAYOUT':: character varying])::text[])
) )
);


ALTER TABLE public.comp_time_transactions OWNER TO hrms;

--
-- Name: compensation_review_cycles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.compensation_review_cycles
(
  allow_promotions           boolean,
  approval_date              date,
  average_increment_target   numeric(5, 2),
  budget_amount              numeric(15, 2),
  currency                   character varying(3),
  effective_date             date                   NOT NULL,
  end_date                   date                   NOT NULL,
  exclude_notice_period      boolean,
  exclude_probationers       boolean,
  fiscal_year                integer                NOT NULL,
  include_all_employees      boolean,
  is_deleted                 boolean                NOT NULL,
  max_increment_percentage   numeric(5, 2),
  min_increment_percentage   numeric(5, 2),
  min_performance_rating     double precision,
  min_tenure_months          integer,
  require_performance_rating boolean,
  revisions_applied          integer,
  revisions_approved         integer,
  revisions_drafted          integer,
  start_date                 date                   NOT NULL,
  total_employees            integer,
  utilized_amount            numeric(15, 2),
  created_at                 timestamp(6) without time zone NOT NULL,
  updated_at                 timestamp(6) without time zone NOT NULL,
  version                    bigint,
  approved_by                uuid,
  created_by                 uuid,
  id                         uuid                   NOT NULL,
  tenant_id                  uuid                   NOT NULL,
  updated_by                 uuid,
  name                       character varying(200) NOT NULL,
  description                character varying(1000),
  cycle_type                 character varying(255) NOT NULL,
  status                     character varying(255) NOT NULL,
  CONSTRAINT compensation_review_cycles_cycle_type_check CHECK (((cycle_type)::text = ANY ((ARRAY['ANNUAL':: character varying, 'MID_YEAR':: character varying, 'QUARTERLY':: character varying, 'SPECIAL':: character varying, 'AD_HOC':: character varying])::text[])
) ),
    CONSTRAINT compensation_review_cycles_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PLANNING'::character varying, 'IN_PROGRESS'::character varying, 'REVIEW'::character varying, 'APPROVAL'::character varying, 'APPROVED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.compensation_review_cycles OWNER TO hrms;

--
-- Name: compliance_alerts; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.compliance_alerts
(
  due_date            date,
  is_auto_generated   boolean,
  is_deleted          boolean                NOT NULL,
  reminder_count      integer,
  created_at          timestamp(6) without time zone NOT NULL,
  last_reminder_sent  timestamp(6) without time zone,
  resolved_at         timestamp(6) without time zone,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  assigned_to         uuid,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  related_entity_id   uuid,
  resolved_by         uuid,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  description         text,
  priority            character varying(255) NOT NULL,
  related_entity_type character varying(255),
  resolution_notes    character varying(255),
  status              character varying(255),
  title               character varying(255) NOT NULL,
  type                character varying(255) NOT NULL,
  CONSTRAINT compliance_alerts_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT compliance_alerts_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'IN_PROGRESS'::character varying, 'RESOLVED'::character varying, 'DISMISSED'::character varying, 'ESCALATED'::character varying])::text[]))),
    CONSTRAINT compliance_alerts_type_check CHECK (((type)::text = ANY ((ARRAY['POLICY_EXPIRY'::character varying, 'LICENSE_RENEWAL'::character varying, 'TRAINING_DUE'::character varying, 'ACKNOWLEDGMENT_PENDING'::character varying, 'DOCUMENT_EXPIRY'::character varying, 'CHECKLIST_OVERDUE'::character varying, 'REGULATORY_DEADLINE'::character varying, 'AUDIT_FINDING'::character varying, 'CUSTOM'::character varying])::text[])))
);


ALTER TABLE public.compliance_alerts OWNER TO hrms;

--
-- Name: compliance_audit_logs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.compliance_audit_logs
(
  is_deleted        boolean                NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  "timestamp"       timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  entity_id         uuid,
  id                uuid                   NOT NULL,
  performed_by      uuid                   NOT NULL,
  tenant_id         uuid                   NOT NULL,
  updated_by        uuid,
  action            character varying(255) NOT NULL,
  additional_info   text,
  changed_fields    text,
  entity_name       character varying(255),
  entity_type       character varying(255) NOT NULL,
  ip_address        character varying(255),
  new_value         text,
  old_value         text,
  performed_by_name character varying(255),
  severity          character varying(255),
  user_agent        character varying(255),
  CONSTRAINT compliance_audit_logs_action_check CHECK (((action)::text = ANY ((ARRAY['CREATE':: character varying, 'READ':: character varying, 'UPDATE':: character varying, 'DELETE':: character varying, 'LOGIN':: character varying, 'LOGOUT':: character varying, 'LOGIN_FAILED':: character varying, 'PASSWORD_CHANGE':: character varying, 'PASSWORD_RESET':: character varying, 'PERMISSION_CHANGE':: character varying, 'EXPORT':: character varying, 'IMPORT':: character varying, 'APPROVE':: character varying, 'REJECT':: character varying, 'SUBMIT':: character varying, 'CANCEL':: character varying, 'ARCHIVE':: character varying, 'RESTORE':: character varying])::text[])
) ),
    CONSTRAINT compliance_audit_logs_severity_check CHECK (((severity)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[])))
);


ALTER TABLE public.compliance_audit_logs OWNER TO hrms;

--
-- Name: compliance_checklists; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.compliance_checklists
(
  completed_items     integer,
  is_active           boolean,
  is_deleted          boolean                NOT NULL,
  last_completed_date date,
  next_due_date       date,
  total_items         integer,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  assigned_to         uuid,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  category            character varying(255) NOT NULL,
  description         text,
  frequency           character varying(255),
  name                character varying(255) NOT NULL,
  status              character varying(255),
  CONSTRAINT compliance_checklists_category_check CHECK (((category)::text = ANY ((ARRAY['ONBOARDING':: character varying, 'OFFBOARDING':: character varying, 'QUARTERLY_REVIEW':: character varying, 'ANNUAL_AUDIT':: character varying, 'SAFETY':: character varying, 'DATA_PRIVACY':: character varying, 'TRAINING':: character varying, 'DOCUMENTATION':: character varying, 'REGULATORY':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT compliance_checklists_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['ONE_TIME'::character varying, 'WEEKLY'::character varying, 'MONTHLY'::character varying, 'QUARTERLY'::character varying, 'SEMI_ANNUAL'::character varying, 'ANNUAL'::character varying])::text[]))),
    CONSTRAINT compliance_checklists_status_check CHECK (((status)::text = ANY ((ARRAY['NOT_STARTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'OVERDUE'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.compliance_checklists OWNER TO hrms;

--
-- Name: compliance_policies; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.compliance_policies
(
  acknowledgment_frequency_days integer,
  approved_at                   date,
  effective_date                date,
  expiry_date                   date,
  is_deleted                    boolean                NOT NULL,
  policy_version                integer,
  requires_acknowledgment       boolean,
  created_at                    timestamp(6) without time zone NOT NULL,
  updated_at                    timestamp(6) without time zone NOT NULL,
  version                       bigint,
  approved_by                   uuid,
  created_by                    uuid,
  id                            uuid                   NOT NULL,
  tenant_id                     uuid                   NOT NULL,
  updated_by                    uuid,
  category                      character varying(255) NOT NULL,
  code                          character varying(255) NOT NULL,
  description                   text,
  document_url                  character varying(255),
  name                          character varying(255) NOT NULL,
  policy_content                text,
  status                        character varying(255),
  CONSTRAINT compliance_policies_category_check CHECK (((category)::text = ANY ((ARRAY['EMPLOYMENT':: character varying, 'SAFETY':: character varying, 'ANTI_HARASSMENT':: character varying, 'DATA_PRIVACY':: character varying, 'CODE_OF_CONDUCT':: character varying, 'LEAVE':: character varying, 'TRAVEL':: character varying, 'EXPENSE':: character varying, 'IT_SECURITY':: character varying, 'CONFIDENTIALITY':: character varying, 'REMOTE_WORK':: character varying, 'HEALTH':: character varying, 'ENVIRONMENT':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT compliance_policies_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'PUBLISHED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE public.compliance_policies OWNER TO hrms;

--
-- Name: content_views; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.content_views
(
  view_count            integer,
  view_duration_seconds integer,
  created_at            timestamp(6) without time zone NOT NULL,
  last_viewed_at        timestamp(6) without time zone,
  content_id            uuid                  NOT NULL,
  employee_id           uuid                  NOT NULL,
  id                    uuid                  NOT NULL,
  tenant_id             uuid                  NOT NULL,
  content_type          character varying(50) NOT NULL,
  view_source           character varying(50),
  CONSTRAINT content_views_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['WALL_POST':: character varying, 'ANNOUNCEMENT':: character varying, 'DOCUMENT':: character varying, 'COMMENT':: character varying, 'LETTER':: character varying, 'TRAINING_MATERIAL':: character varying, 'POLICY':: character varying, 'NEWS':: character varying, 'EVENT':: character varying])::text[])
) )
);


ALTER TABLE public.content_views OWNER TO hrms;

--
-- Name: contract_reminders; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.contract_reminders
(
  is_completed  boolean,
  is_deleted    boolean               NOT NULL,
  reminder_date date                  NOT NULL,
  created_at    timestamp(6) without time zone NOT NULL,
  notified_at   timestamp(6) without time zone,
  updated_at    timestamp(6) without time zone NOT NULL,
  version       bigint,
  contract_id   uuid                  NOT NULL,
  created_by    uuid,
  id            uuid                  NOT NULL,
  updated_by    uuid,
  reminder_type character varying(50) NOT NULL,
  tenant_id     uuid                  NOT NULL,
  CONSTRAINT contract_reminders_reminder_type_check CHECK (((reminder_type)::text = ANY ((ARRAY['EXPIRY':: character varying, 'RENEWAL':: character varying, 'REVIEW':: character varying])::text[])
) )
);


ALTER TABLE public.contract_reminders OWNER TO hrms;

--
-- Name: contract_signatures; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.contract_signatures
(
  is_deleted          boolean                NOT NULL,
  created_at          timestamp(6) without time zone NOT NULL,
  signed_at           timestamp(6) without time zone,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  contract_id         uuid                   NOT NULL,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  signer_id           uuid,
  updated_by          uuid,
  ip_address          character varying(45),
  signer_role         character varying(50)  NOT NULL,
  status              character varying(50)  NOT NULL,
  signature_image_url character varying(500),
  signer_email        character varying(255) NOT NULL,
  signer_name         character varying(255) NOT NULL,
  CONSTRAINT contract_signatures_signer_role_check CHECK (((signer_role)::text = ANY ((ARRAY['EMPLOYEE':: character varying, 'MANAGER':: character varying, 'HR':: character varying, 'LEGAL':: character varying, 'VENDOR':: character varying])::text[])
) ),
    CONSTRAINT contract_signatures_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SIGNED'::character varying, 'DECLINED'::character varying])::text[])))
);


ALTER TABLE public.contract_signatures OWNER TO hrms;

--
-- Name: contract_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.contract_templates
(
  is_active  boolean,
  is_deleted boolean                NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  version    bigint,
  created_by uuid,
  id         uuid                   NOT NULL,
  tenant_id  uuid                   NOT NULL,
  updated_by uuid,
  type       character varying(50)  NOT NULL,
  name       character varying(255) NOT NULL,
  content    jsonb                  NOT NULL,
  CONSTRAINT contract_templates_type_check CHECK (((type)::text = ANY ((ARRAY['EMPLOYMENT':: character varying, 'VENDOR':: character varying, 'NDA':: character varying, 'SLA':: character varying, 'FREELANCER':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.contract_templates OWNER TO hrms;

--
-- Name: contract_versions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.contract_versions
(
  is_deleted     boolean NOT NULL,
  version_number integer NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  contract_id    uuid    NOT NULL,
  created_by     uuid,
  id             uuid    NOT NULL,
  updated_by     uuid,
  change_notes   text,
  content        jsonb   NOT NULL
);


ALTER TABLE public.contract_versions OWNER TO hrms;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.contracts
(
  auto_renew          boolean,
  currency            character varying(3),
  end_date            date,
  is_deleted          boolean                NOT NULL,
  renewal_period_days integer,
  start_date          date                   NOT NULL,
  value               numeric(15, 2),
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  employee_id         uuid,
  id                  uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  status              character varying(50)  NOT NULL,
  type                character varying(50)  NOT NULL,
  document_url        character varying(500),
  description         text,
  title               character varying(255) NOT NULL,
  vendor_name         character varying(255),
  terms               jsonb,
  CONSTRAINT contracts_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'PENDING_REVIEW':: character varying, 'PENDING_SIGNATURES':: character varying, 'ACTIVE':: character varying, 'EXPIRED':: character varying, 'TERMINATED':: character varying, 'RENEWED':: character varying])::text[])
) ),
    CONSTRAINT contracts_type_check CHECK (((type)::text = ANY ((ARRAY['EMPLOYMENT'::character varying, 'VENDOR'::character varying, 'NDA'::character varying, 'SLA'::character varying, 'FREELANCER'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.contracts OWNER TO hrms;

--
-- Name: currencies; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.currencies
(
  country_code          character varying(2),
  currency_code         character varying(3)   NOT NULL,
  decimal_places        integer,
  exchange_rate_to_base numeric(18, 8),
  is_active             boolean,
  is_base_currency      boolean,
  is_deleted            boolean                NOT NULL,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  symbol                character varying(10),
  created_by            uuid,
  id                    uuid                   NOT NULL,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  currency_name         character varying(255) NOT NULL,
  notes                 text
);


ALTER TABLE public.currencies OWNER TO hrms;

--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.custom_field_definitions
(
  display_order      integer                NOT NULL,
  is_active          boolean                NOT NULL,
  is_deleted         boolean                NOT NULL,
  is_required        boolean                NOT NULL,
  is_searchable      boolean                NOT NULL,
  max_length         integer,
  max_value          double precision,
  min_length         integer,
  min_value          double precision,
  show_in_list       boolean                NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  max_file_size      bigint,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  edit_visibility    character varying(50),
  entity_type        character varying(50)  NOT NULL,
  field_type         character varying(50)  NOT NULL,
  view_visibility    character varying(50),
  field_code         character varying(100) NOT NULL,
  field_group        character varying(100),
  allowed_file_types character varying(200),
  field_name         character varying(200) NOT NULL,
  placeholder        character varying(200),
  description        character varying(500),
  default_value      character varying(1000),
  options            text,
  validation_rules   text,
  CONSTRAINT custom_field_definitions_edit_visibility_check CHECK (((edit_visibility)::text = ANY ((ARRAY['ALL':: character varying, 'SELF':: character varying, 'MANAGER':: character varying, 'HR':: character varying, 'ADMIN_HR':: character varying, 'ADMIN_ONLY':: character varying])::text[])
) ),
    CONSTRAINT custom_field_definitions_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['EMPLOYEE'::character varying, 'DEPARTMENT'::character varying, 'PROJECT'::character varying, 'LEAVE_REQUEST'::character varying, 'EXPENSE'::character varying, 'ASSET'::character varying, 'JOB_OPENING'::character varying, 'CANDIDATE'::character varying])::text[]))),
    CONSTRAINT custom_field_definitions_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['TEXT'::character varying, 'TEXTAREA'::character varying, 'NUMBER'::character varying, 'DATE'::character varying, 'DATETIME'::character varying, 'DROPDOWN'::character varying, 'MULTI_SELECT'::character varying, 'CHECKBOX'::character varying, 'EMAIL'::character varying, 'PHONE'::character varying, 'URL'::character varying, 'FILE'::character varying, 'CURRENCY'::character varying, 'PERCENTAGE'::character varying])::text[]))),
    CONSTRAINT custom_field_definitions_view_visibility_check CHECK (((view_visibility)::text = ANY ((ARRAY['ALL'::character varying, 'SELF'::character varying, 'MANAGER'::character varying, 'HR'::character varying, 'ADMIN_HR'::character varying, 'ADMIN_ONLY'::character varying])::text[])))
);


ALTER TABLE public.custom_field_definitions OWNER TO hrms;

--
-- Name: custom_field_values; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.custom_field_values
(
  boolean_value       boolean,
  currency_code       character varying(3),
  date_value          date,
  is_deleted          boolean               NOT NULL,
  number_value        numeric(19, 4),
  created_at          timestamp(6) without time zone NOT NULL,
  date_time_value     timestamp(6) without time zone,
  file_size           bigint,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  entity_id           uuid                  NOT NULL,
  field_definition_id uuid                  NOT NULL,
  id                  uuid                  NOT NULL,
  tenant_id           uuid                  NOT NULL,
  updated_by          uuid,
  entity_type         character varying(50) NOT NULL,
  file_mime_type      character varying(100),
  file_value          character varying(500),
  file_name           character varying(255),
  multi_select_value  text,
  text_value          text,
  CONSTRAINT custom_field_values_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['EMPLOYEE':: character varying, 'DEPARTMENT':: character varying, 'PROJECT':: character varying, 'LEAVE_REQUEST':: character varying, 'EXPENSE':: character varying, 'ASSET':: character varying, 'JOB_OPENING':: character varying, 'CANDIDATE':: character varying])::text[])
) )
);


ALTER TABLE public.custom_field_values OWNER TO hrms;

--
-- Name: custom_scope_targets; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.custom_scope_targets
(
  is_deleted         boolean               NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                  NOT NULL,
  role_permission_id uuid                  NOT NULL,
  target_id          uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  updated_by         uuid,
  target_type        character varying(20) NOT NULL,
  CONSTRAINT custom_scope_targets_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['EMPLOYEE':: character varying, 'DEPARTMENT':: character varying, 'LOCATION':: character varying])::text[])
) )
);


ALTER TABLE public.custom_scope_targets OWNER TO hrms;

--
-- Name: dashboard_widgets; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.dashboard_widgets
(
  height           integer,
  is_visible       boolean                NOT NULL,
  position_x       integer,
  position_y       integer,
  refresh_interval integer,
  width            integer,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone,
  dashboard_id     uuid                   NOT NULL,
  id               uuid                   NOT NULL,
  tenant_id        uuid                   NOT NULL,
  widget_type      character varying(30)  NOT NULL,
  widget_name      character varying(200) NOT NULL,
  configuration    text,
  data_source      text,
  CONSTRAINT dashboard_widgets_widget_type_check CHECK (((widget_type)::text = ANY ((ARRAY['LINE_CHART':: character varying, 'BAR_CHART':: character varying, 'PIE_CHART':: character varying, 'TABLE':: character varying, 'KPI_CARD':: character varying, 'GAUGE':: character varying, 'HEATMAP':: character varying, 'FUNNEL':: character varying, 'TIMELINE':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.dashboard_widgets OWNER TO hrms;

--
-- Name: dashboards; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.dashboards
(
  is_default     boolean,
  is_public      boolean,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone,
  created_by     uuid,
  id             uuid                   NOT NULL,
  owner_id       uuid,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  dashboard_type character varying(30)  NOT NULL,
  dashboard_name character varying(200) NOT NULL,
  description    text,
  layout_config  text,
  CONSTRAINT dashboards_dashboard_type_check CHECK (((dashboard_type)::text = ANY ((ARRAY['EXECUTIVE':: character varying, 'HR_MANAGER':: character varying, 'DEPARTMENT_MANAGER':: character varying, 'EMPLOYEE':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.dashboards OWNER TO hrms;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.departments
(
  is_active            boolean                NOT NULL,
  is_deleted           boolean                NOT NULL,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  manager_id           uuid,
  parent_department_id uuid,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  cost_center          character varying(20),
  code                 character varying(50)  NOT NULL,
  type                 character varying(50),
  name                 character varying(200) NOT NULL,
  location             character varying(500),
  description          text,
  CONSTRAINT departments_type_check CHECK (((type)::text = ANY ((ARRAY['ENGINEERING':: character varying, 'PRODUCT':: character varying, 'DESIGN':: character varying, 'MARKETING':: character varying, 'SALES':: character varying, 'OPERATIONS':: character varying, 'FINANCE':: character varying, 'HR':: character varying, 'LEGAL':: character varying, 'ADMIN':: character varying, 'SUPPORT':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.departments OWNER TO hrms;

--
-- Name: document_access; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_access
(
  is_active     boolean               NOT NULL,
  is_deleted    boolean               NOT NULL,
  created_at    timestamp(6) without time zone NOT NULL,
  expires_at    timestamp(6) without time zone,
  granted_at    timestamp(6) without time zone NOT NULL,
  updated_at    timestamp(6) without time zone NOT NULL,
  version       bigint,
  created_by    uuid,
  department_id uuid,
  document_id   uuid                  NOT NULL,
  granted_by    uuid                  NOT NULL,
  id            uuid                  NOT NULL,
  role_id       uuid,
  tenant_id     uuid                  NOT NULL,
  updated_by    uuid,
  user_id       uuid,
  access_level  character varying(50) NOT NULL,
  metadata      jsonb,
  CONSTRAINT document_access_access_level_check CHECK (((access_level)::text = ANY ((ARRAY['VIEW':: character varying, 'EDIT':: character varying, 'MANAGE':: character varying, 'APPROVE':: character varying])::text[])
) )
);


ALTER TABLE public.document_access OWNER TO hrms;

--
-- Name: document_approval_tasks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_approval_tasks
(
  approval_level integer               NOT NULL,
  is_deleted     boolean               NOT NULL,
  approved_at    timestamp(6) without time zone,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  approver_id    uuid                  NOT NULL,
  created_by     uuid,
  delegated_to   uuid,
  id             uuid                  NOT NULL,
  tenant_id      uuid                  NOT NULL,
  updated_by     uuid,
  workflow_id    uuid                  NOT NULL,
  status         character varying(50) NOT NULL,
  comments       text,
  metadata       jsonb,
  CONSTRAINT document_approval_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'DELEGATED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.document_approval_tasks OWNER TO hrms;

--
-- Name: document_approval_workflows; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_approval_workflows
(
  approval_level        integer,
  is_deleted            boolean               NOT NULL,
  total_approval_levels integer,
  completed_at          timestamp(6) without time zone,
  created_at            timestamp(6) without time zone NOT NULL,
  initiated_at          timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  created_by            uuid,
  current_approver_id   uuid,
  document_id           uuid                  NOT NULL,
  id                    uuid                  NOT NULL,
  requested_by          uuid                  NOT NULL,
  tenant_id             uuid                  NOT NULL,
  updated_by            uuid,
  workflow_def_id       uuid,
  status                character varying(50) NOT NULL,
  rejection_reason      text,
  CONSTRAINT document_approval_workflows_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'IN_PROGRESS':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.document_approval_workflows OWNER TO hrms;

--
-- Name: document_approvals; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_approvals
(
  approval_level integer,
  approved_at    timestamp(6) without time zone,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone,
  approver_id    uuid                  NOT NULL,
  document_id    uuid                  NOT NULL,
  id             uuid                  NOT NULL,
  tenant_id      uuid                  NOT NULL,
  status         character varying(20) NOT NULL,
  comments       text,
  CONSTRAINT document_approvals_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'DELEGATED':: character varying])::text[])
) )
);


ALTER TABLE public.document_approvals OWNER TO hrms;

--
-- Name: document_categories; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_categories
(
  is_active                boolean                NOT NULL,
  is_mandatory             boolean,
  requires_expiry_tracking boolean,
  retention_period_days    integer,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone,
  created_by               uuid,
  id                       uuid                   NOT NULL,
  parent_category_id       uuid,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  category_code            character varying(50)  NOT NULL,
  category_name            character varying(200) NOT NULL,
  description              text
);


ALTER TABLE public.document_categories OWNER TO hrms;

--
-- Name: document_expiry_tracking; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_expiry_tracking
(
  expiry_date              date    NOT NULL,
  expiry_notification_sent boolean NOT NULL,
  is_deleted               boolean NOT NULL,
  is_notified              boolean NOT NULL,
  reminder_days_before     integer,
  created_at               timestamp(6) without time zone NOT NULL,
  notified_at              timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  document_id              uuid    NOT NULL,
  id                       uuid    NOT NULL,
  tenant_id                uuid    NOT NULL,
  updated_by               uuid
);


ALTER TABLE public.document_expiry_tracking OWNER TO hrms;

--
-- Name: document_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_requests
(
  is_deleted             boolean                NOT NULL,
  priority               integer,
  required_by_date       date,
  created_at             timestamp(6) without time zone NOT NULL,
  document_generated_at  timestamp(6) without time zone,
  processed_at           timestamp(6) without time zone,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  employee_id            uuid                   NOT NULL,
  id                     uuid                   NOT NULL,
  processed_by           uuid,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  addressed_to           character varying(255),
  delivery_address       character varying(255),
  delivery_mode          character varying(255),
  document_type          character varying(255) NOT NULL,
  generated_document_url character varying(255),
  processing_notes       text,
  purpose                text,
  rejection_reason       text,
  status                 character varying(255) NOT NULL,
  CONSTRAINT document_requests_delivery_mode_check CHECK (((delivery_mode)::text = ANY ((ARRAY['DIGITAL':: character varying, 'PHYSICAL':: character varying, 'BOTH':: character varying])::text[])
) ),
    CONSTRAINT document_requests_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['EMPLOYMENT_CERTIFICATE'::character varying, 'SALARY_CERTIFICATE'::character varying, 'EXPERIENCE_LETTER'::character varying, 'RELIEVING_LETTER'::character varying, 'BONAFIDE_CERTIFICATE'::character varying, 'ADDRESS_PROOF_LETTER'::character varying, 'VISA_LETTER'::character varying, 'BANK_LETTER'::character varying, 'SALARY_SLIP'::character varying, 'FORM_16'::character varying, 'APPOINTMENT_LETTER_COPY'::character varying, 'CUSTOM'::character varying])::text[]))),
    CONSTRAINT document_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'GENERATED'::character varying, 'DELIVERED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.document_requests OWNER TO hrms;

--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_templates
(
  is_active          boolean                NOT NULL,
  is_system_template boolean,
  requires_approval  boolean,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  category           character varying(50)  NOT NULL,
  template_code      character varying(50)  NOT NULL,
  file_name_pattern  character varying(200),
  template_name      character varying(200) NOT NULL,
  description        text,
  placeholders       text,
  template_content   text,
  CONSTRAINT document_templates_category_check CHECK (((category)::text = ANY ((ARRAY['OFFER_LETTER':: character varying, 'APPOINTMENT_LETTER':: character varying, 'EXPERIENCE_CERTIFICATE':: character varying, 'RELIEVING_LETTER':: character varying, 'INCREMENT_LETTER':: character varying, 'WARNING_LETTER':: character varying, 'TERMINATION_LETTER':: character varying, 'POLICY_DOCUMENT':: character varying, 'FORM':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.document_templates OWNER TO hrms;

--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.document_versions
(
  is_current     boolean                NOT NULL,
  version_number integer                NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  file_size      bigint,
  created_by     uuid,
  document_id    uuid                   NOT NULL,
  id             uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  checksum       character varying(64),
  file_path      character varying(500) NOT NULL,
  change_summary text
);


ALTER TABLE public.document_versions OWNER TO hrms;

--
-- Name: email_notifications; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.email_notifications
(
  is_deleted      boolean                NOT NULL,
  retry_count     integer,
  created_at      timestamp(6) without time zone NOT NULL,
  scheduled_at    timestamp(6) without time zone,
  sent_at         timestamp(6) without time zone,
  updated_at      timestamp(6) without time zone NOT NULL,
  version         bigint,
  created_by      uuid,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  updated_by      uuid,
  status          character varying(20)  NOT NULL,
  email_type      character varying(50)  NOT NULL,
  recipient_email character varying(100) NOT NULL,
  recipient_name  character varying(200) NOT NULL,
  subject         character varying(500) NOT NULL,
  body            text                   NOT NULL,
  error_message   text,
  metadata        text,
  CONSTRAINT email_notifications_email_type_check CHECK (((email_type)::text = ANY ((ARRAY['LEAVE_APPROVAL':: character varying, 'LEAVE_REJECTION':: character varying, 'BIRTHDAY_REMINDER':: character varying, 'ANNIVERSARY_REMINDER':: character varying, 'PAYSLIP_READY':: character varying, 'ANNOUNCEMENT':: character varying, 'PASSWORD_RESET':: character varying, 'WELCOME':: character varying, 'EXIT_CONFIRMATION':: character varying, 'EXPENSE_APPROVAL':: character varying, 'EXPENSE_REJECTION':: character varying, 'PERFORMANCE_REVIEW_DUE':: character varying, 'ATTENDANCE_ALERT':: character varying, 'DOCUMENT_UPLOAD_REMINDER':: character varying, 'GENERAL':: character varying])::text[])
) ),
    CONSTRAINT email_notifications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SENT'::character varying, 'FAILED'::character varying, 'SCHEDULED'::character varying])::text[])))
);


ALTER TABLE public.email_notifications OWNER TO hrms;

--
-- Name: employee_esi_records; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_esi_records
(
  enrollment_date date,
  exit_date       date,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone,
  created_by      uuid,
  employee_id     uuid                  NOT NULL,
  id              uuid                  NOT NULL,
  tenant_id       uuid                  NOT NULL,
  updated_by      uuid,
  esi_number      character varying(17),
  ip_number       character varying(20),
  status          character varying(20) NOT NULL,
  dispensary_name character varying(200),
  CONSTRAINT employee_esi_records_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'INACTIVE':: character varying, 'EXEMPTED':: character varying])::text[])
) )
);


ALTER TABLE public.employee_esi_records OWNER TO hrms;

--
-- Name: employee_loans; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_loans
(
  approved_date         date,
  disbursement_date     date,
  emi_amount            numeric(12, 2),
  first_emi_date        date,
  interest_rate         numeric(5, 2),
  is_deleted            boolean                NOT NULL,
  is_salary_deduction   boolean,
  last_emi_date         date,
  outstanding_amount    numeric(12, 2),
  principal_amount      numeric(12, 2)         NOT NULL,
  requested_date        date,
  tenure_months         integer,
  total_amount          numeric(12, 2),
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  approved_by           uuid,
  created_by            uuid,
  employee_id           uuid                   NOT NULL,
  guarantor_employee_id uuid,
  id                    uuid                   NOT NULL,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  guarantor_name        character varying(255),
  loan_number           character varying(255),
  loan_type             character varying(255) NOT NULL,
  purpose               text,
  rejected_reason       character varying(255),
  remarks               text,
  status                character varying(255),
  CONSTRAINT employee_loans_loan_type_check CHECK (((loan_type)::text = ANY ((ARRAY['SALARY_ADVANCE':: character varying, 'PERSONAL_LOAN':: character varying, 'EMERGENCY_LOAN':: character varying, 'EDUCATION_LOAN':: character varying, 'HOUSING_LOAN':: character varying, 'VEHICLE_LOAN':: character varying, 'MEDICAL_LOAN':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT employee_loans_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'DISBURSED'::character varying, 'ACTIVE'::character varying, 'CLOSED'::character varying, 'DEFAULTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.employee_loans OWNER TO hrms;

--
-- Name: employee_payroll_records; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_payroll_records
(
  allowances_local                   numeric(15, 2),
  base_salary_local                  numeric(15, 2),
  bonuses_local                      numeric(15, 2),
  employer_other_contributions_local numeric(15, 2),
  employer_social_security_local     numeric(15, 2),
  exchange_rate                      numeric(18, 8),
  gross_pay_base                     numeric(15, 2),
  gross_pay_local                    numeric(15, 2),
  income_tax_local                   numeric(15, 2),
  is_deleted                         boolean              NOT NULL,
  local_currency                     character varying(3) NOT NULL,
  net_pay_base                       numeric(15, 2),
  net_pay_local                      numeric(15, 2),
  other_deductions_local             numeric(15, 2),
  overtime_local                     numeric(15, 2),
  rate_date                          date,
  social_security_local              numeric(15, 2),
  total_deductions_base              numeric(15, 2),
  total_deductions_local             numeric(15, 2),
  total_employer_cost_base           numeric(15, 2),
  total_employer_cost_local          numeric(15, 2),
  created_at                         timestamp(6) without time zone NOT NULL,
  updated_at                         timestamp(6) without time zone NOT NULL,
  version                            bigint,
  created_by                         uuid,
  department_id                      uuid,
  employee_id                        uuid                 NOT NULL,
  id                                 uuid                 NOT NULL,
  location_id                        uuid,
  payroll_run_id                     uuid                 NOT NULL,
  tenant_id                          uuid                 NOT NULL,
  updated_by                         uuid,
  department_name                    character varying(255),
  employee_name                      character varying(255),
  employee_number                    character varying(255),
  error_message                      text,
  location_code                      character varying(255),
  notes                              text,
  status                             character varying(255),
  CONSTRAINT employee_payroll_records_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'CALCULATED':: character varying, 'APPROVED':: character varying, 'PAID':: character varying, 'ERROR':: character varying, 'ON_HOLD':: character varying])::text[])
) )
);


ALTER TABLE public.employee_payroll_records OWNER TO hrms;

--
-- Name: employee_pf_records; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_pf_records
(
  enrollment_date         date,
  exit_date               date,
  is_international_worker boolean,
  previous_pf_balance     numeric(12, 2),
  vpf_percentage          numeric(5, 2),
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone,
  uan_number              character varying(12),
  created_by              uuid,
  employee_id             uuid                  NOT NULL,
  id                      uuid                  NOT NULL,
  tenant_id               uuid                  NOT NULL,
  updated_by              uuid,
  status                  character varying(20) NOT NULL,
  pf_number               character varying(50),
  CONSTRAINT employee_pf_records_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'INACTIVE':: character varying, 'WITHDRAWN':: character varying, 'TRANSFERRED':: character varying])::text[])
) )
);


ALTER TABLE public.employee_pf_records OWNER TO hrms;

--
-- Name: employee_points; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_points
(
  current_balance       integer,
  is_deleted            boolean NOT NULL,
  recognitions_given    integer,
  recognitions_received integer,
  total_points_earned   integer,
  total_points_redeemed integer,
  created_at            timestamp(6) without time zone NOT NULL,
  last_activity_at      timestamp(6) without time zone,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  created_by            uuid,
  employee_id           uuid    NOT NULL,
  id                    uuid    NOT NULL,
  tenant_id             uuid    NOT NULL,
  updated_by            uuid
);


ALTER TABLE public.employee_points OWNER TO hrms;

--
-- Name: employee_profile_update_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_profile_update_requests
(
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id        uuid                                               NOT NULL,
  employee_id      uuid                                               NOT NULL,
  requested_by     uuid                                               NOT NULL,
  status           character varying(20)    DEFAULT 'PENDING'::character varying NOT NULL,
  changes          jsonb                                              NOT NULL,
  review_comment   text,
  reviewed_by      uuid,
  reviewed_at      timestamp with time zone,
  created_at       timestamp with time zone DEFAULT now()             NOT NULL,
  updated_at       timestamp with time zone DEFAULT now()             NOT NULL,
  created_by       uuid,
  last_modified_by uuid,
  version          bigint                   DEFAULT 0,
  is_deleted       boolean                  DEFAULT false             NOT NULL
);


ALTER TABLE public.employee_profile_update_requests OWNER TO hrms;

--
-- Name: employee_referrals; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_referrals
(
  bonus_amount            numeric(12, 2),
  bonus_eligible_date     date,
  bonus_paid_date         date,
  interview_date          date,
  is_deleted              boolean                NOT NULL,
  joining_date            date,
  known_since             date,
  offer_date              date,
  screening_date          date,
  submitted_date          date,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  department_id           uuid,
  hired_employee_id       uuid,
  id                      uuid                   NOT NULL,
  job_id                  uuid,
  referrer_id             uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  bonus_payment_reference character varying(255),
  bonus_status            character varying(255),
  candidate_email         character varying(255) NOT NULL,
  candidate_linkedin      character varying(255),
  candidate_name          character varying(255) NOT NULL,
  candidate_phone         character varying(255),
  job_title               character varying(255),
  processing_notes        text,
  referral_code           character varying(255),
  referrer_notes          text,
  rejection_reason        character varying(255),
  rejection_stage         character varying(255),
  relationship            character varying(255),
  resume_path             character varying(255),
  status                  character varying(255),
  CONSTRAINT employee_referrals_bonus_status_check CHECK (((bonus_status)::text = ANY ((ARRAY['NOT_ELIGIBLE':: character varying, 'PENDING_ELIGIBILITY':: character varying, 'ELIGIBLE':: character varying, 'PROCESSING':: character varying, 'PAID':: character varying])::text[])
) ),
    CONSTRAINT employee_referrals_relationship_check CHECK (((relationship)::text = ANY ((ARRAY['FORMER_COLLEAGUE'::character varying, 'FRIEND'::character varying, 'FAMILY'::character varying, 'CLASSMATE'::character varying, 'PROFESSIONAL_NETWORK'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT employee_referrals_status_check CHECK (((status)::text = ANY ((ARRAY['SUBMITTED'::character varying, 'SCREENING'::character varying, 'INTERVIEW_SCHEDULED'::character varying, 'INTERVIEW_COMPLETED'::character varying, 'OFFER_MADE'::character varying, 'OFFER_ACCEPTED'::character varying, 'JOINED'::character varying, 'REJECTED'::character varying, 'WITHDRAWN'::character varying, 'ON_HOLD'::character varying])::text[])))
);


ALTER TABLE public.employee_referrals OWNER TO hrms;

--
-- Name: employee_skills; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_skills
(
  is_deleted          boolean                NOT NULL,
  is_verified         boolean,
  proficiency_level   integer                NOT NULL,
  years_of_experience double precision,
  created_at          timestamp(6) without time zone NOT NULL,
  last_used           timestamp(6) without time zone,
  updated_at          timestamp(6) without time zone NOT NULL,
  verified_at         timestamp(6) without time zone,
  version             bigint,
  created_by          uuid,
  employee_id         uuid                   NOT NULL,
  id                  uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  verified_by         uuid,
  category            character varying(50),
  skill_name          character varying(100) NOT NULL,
  source              character varying(255)
);


ALTER TABLE public.employee_skills OWNER TO hrms;

--
-- Name: employee_tds_declarations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employee_tds_declarations
(
  hra_exemption            numeric(12, 2),
  lta_exemption            numeric(12, 2),
  other_exemptions         numeric(12, 2),
  previous_employer_income numeric(12, 2),
  previous_employer_tds    numeric(12, 2),
  section_24               numeric(12, 2),
  section_80c              numeric(12, 2),
  section_80d              numeric(12, 2),
  section_80e              numeric(12, 2),
  section_80g              numeric(12, 2),
  approved_at              timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  submitted_at             timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone,
  financial_year           character varying(10) NOT NULL,
  approved_by              uuid,
  created_by               uuid,
  employee_id              uuid                  NOT NULL,
  id                       uuid                  NOT NULL,
  tenant_id                uuid                  NOT NULL,
  updated_by               uuid,
  status                   character varying(20) NOT NULL,
  tax_regime               character varying(20) NOT NULL,
  remarks                  text,
  CONSTRAINT employee_tds_declarations_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'SUBMITTED':: character varying, 'UNDER_REVIEW':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying])::text[])
) ),
    CONSTRAINT employee_tds_declarations_tax_regime_check CHECK (((tax_regime)::text = ANY ((ARRAY['OLD_REGIME'::character varying, 'NEW_REGIME'::character varying])::text[])))
);


ALTER TABLE public.employee_tds_declarations OWNER TO hrms;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employees
(
  confirmation_date        date,
  date_of_birth            date,
  exit_date                date,
  is_deleted               boolean                NOT NULL,
  joining_date             date                   NOT NULL,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  department_id            uuid,
  id                       uuid                   NOT NULL,
  manager_id               uuid,
  office_location_id       uuid,
  team_id                  uuid,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  user_id                  uuid                   NOT NULL,
  emergency_contact_number character varying(20),
  employment_type          character varying(20)  NOT NULL,
  gender                   character varying(20),
  phone_number             character varying(20),
  postal_code              character varying(20),
  status                   character varying(20)  NOT NULL,
  bank_ifsc_code           character varying(50),
  bank_name                character varying(50),
  employee_code            character varying(50)  NOT NULL,
  job_role                 character varying(50),
  level                    character varying(50),
  tax_id                   character varying(50),
  bank_account_number      character varying(100),
  city                     character varying(100),
  country                  character varying(100),
  designation              character varying(100),
  first_name               character varying(100) NOT NULL,
  last_name                character varying(100),
  middle_name              character varying(100),
  state                    character varying(100),
  personal_email           character varying(200),
  address                  text,
  dotted_line_manager1id   uuid,
  dotted_line_manager2id   uuid,
  CONSTRAINT employees_employment_type_check CHECK (((employment_type)::text = ANY ((ARRAY['FULL_TIME':: character varying, 'PART_TIME':: character varying, 'CONTRACT':: character varying, 'INTERN':: character varying, 'CONSULTANT':: character varying])::text[])
) ),
    CONSTRAINT employees_gender_check CHECK (((gender)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying, 'OTHER'::character varying, 'PREFER_NOT_TO_SAY'::character varying])::text[]))),
    CONSTRAINT employees_job_role_check CHECK (((job_role)::text = ANY ((ARRAY['EXECUTIVE'::character varying, 'CEO'::character varying, 'CTO'::character varying, 'CFO'::character varying, 'COO'::character varying, 'ENGINEERING'::character varying, 'SOFTWARE_ENGINEER'::character varying, 'FRONTEND_DEVELOPER'::character varying, 'BACKEND_DEVELOPER'::character varying, 'FULLSTACK_DEVELOPER'::character varying, 'DEVOPS_ENGINEER'::character varying, 'QA_ENGINEER'::character varying, 'DATA_ENGINEER'::character varying, 'MOBILE_DEVELOPER'::character varying, 'SYSTEM_ARCHITECT'::character varying, 'TECH_LEAD'::character varying, 'ENGINEERING_MANAGER'::character varying, 'PRODUCT_MANAGER'::character varying, 'PRODUCT_OWNER'::character varying, 'PRODUCT_ANALYST'::character varying, 'UI_DESIGNER'::character varying, 'UX_DESIGNER'::character varying, 'GRAPHIC_DESIGNER'::character varying, 'PRODUCT_DESIGNER'::character varying, 'DATA_ANALYST'::character varying, 'DATA_SCIENTIST'::character varying, 'BUSINESS_ANALYST'::character varying, 'MARKETING_MANAGER'::character varying, 'CONTENT_WRITER'::character varying, 'SEO_SPECIALIST'::character varying, 'SOCIAL_MEDIA_MANAGER'::character varying, 'DIGITAL_MARKETER'::character varying, 'SALES_REPRESENTATIVE'::character varying, 'SALES_MANAGER'::character varying, 'ACCOUNT_MANAGER'::character varying, 'BUSINESS_DEVELOPMENT'::character varying, 'OPERATIONS_MANAGER'::character varying, 'PROJECT_MANAGER'::character varying, 'SCRUM_MASTER'::character varying, 'PROGRAM_MANAGER'::character varying, 'HR_MANAGER'::character varying, 'HR_GENERALIST'::character varying, 'RECRUITER'::character varying, 'TALENT_ACQUISITION'::character varying, 'HUMAN_RESOURCES'::character varying, 'ACCOUNTANT'::character varying, 'FINANCIAL_ANALYST'::character varying, 'FINANCE_MANAGER'::character varying, 'FINANCE'::character varying, 'ADMIN_ASSISTANT'::character varying, 'OFFICE_MANAGER'::character varying, 'CUSTOMER_SUPPORT'::character varying, 'TECH_SUPPORT'::character varying, 'LEGAL_COUNSEL'::character varying, 'COMPLIANCE_OFFICER'::character varying, 'CONSULTANT'::character varying, 'INTERN'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT employees_level_check CHECK (((level)::text = ANY ((ARRAY['ENTRY'::character varying, 'MID'::character varying, 'SENIOR'::character varying, 'LEAD'::character varying, 'MANAGER'::character varying, 'SENIOR_MANAGER'::character varying, 'DIRECTOR'::character varying, 'VP'::character varying, 'SVP'::character varying, 'CXO'::character varying])::text[]))),
    CONSTRAINT employees_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ON_LEAVE'::character varying, 'ON_NOTICE'::character varying, 'TERMINATED'::character varying, 'RESIGNED'::character varying])::text[])))
);


ALTER TABLE public.employees OWNER TO hrms;

--
-- Name: employment_change_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.employment_change_requests
(
  current_confirmation_date date,
  effective_date            date,
  is_deleted                boolean               NOT NULL,
  new_confirmation_date     date,
  approved_at               timestamp(6) without time zone,
  created_at                timestamp(6) without time zone NOT NULL,
  rejected_at               timestamp(6) without time zone,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  approver_id               uuid,
  created_by                uuid,
  current_department_id     uuid,
  current_manager_id        uuid,
  employee_id               uuid                  NOT NULL,
  id                        uuid                  NOT NULL,
  new_department_id         uuid,
  new_manager_id            uuid,
  requester_id              uuid                  NOT NULL,
  tenant_id                 uuid                  NOT NULL,
  updated_by                uuid,
  current_employment_type   character varying(20),
  current_status            character varying(20),
  new_employment_type       character varying(20),
  new_status                character varying(20),
  status                    character varying(20) NOT NULL,
  change_type               character varying(50) NOT NULL,
  current_job_role          character varying(50),
  current_level             character varying(50),
  new_job_role              character varying(50),
  new_level                 character varying(50),
  reason                    character varying(500),
  rejection_reason          character varying(500),
  current_designation       character varying(255),
  new_designation           character varying(255),
  CONSTRAINT employment_change_requests_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['PROMOTION':: character varying, 'DEMOTION':: character varying, 'TRANSFER':: character varying, 'ROLE_CHANGE':: character varying, 'MANAGER_CHANGE':: character varying, 'STATUS_CHANGE':: character varying, 'CONFIRMATION':: character varying, 'MULTIPLE':: character varying])::text[])
) ),
    CONSTRAINT employment_change_requests_current_employment_type_check CHECK (((current_employment_type)::text = ANY ((ARRAY['FULL_TIME'::character varying, 'PART_TIME'::character varying, 'CONTRACT'::character varying, 'INTERN'::character varying, 'CONSULTANT'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_current_job_role_check CHECK (((current_job_role)::text = ANY ((ARRAY['EXECUTIVE'::character varying, 'CEO'::character varying, 'CTO'::character varying, 'CFO'::character varying, 'COO'::character varying, 'ENGINEERING'::character varying, 'SOFTWARE_ENGINEER'::character varying, 'FRONTEND_DEVELOPER'::character varying, 'BACKEND_DEVELOPER'::character varying, 'FULLSTACK_DEVELOPER'::character varying, 'DEVOPS_ENGINEER'::character varying, 'QA_ENGINEER'::character varying, 'DATA_ENGINEER'::character varying, 'MOBILE_DEVELOPER'::character varying, 'SYSTEM_ARCHITECT'::character varying, 'TECH_LEAD'::character varying, 'ENGINEERING_MANAGER'::character varying, 'PRODUCT_MANAGER'::character varying, 'PRODUCT_OWNER'::character varying, 'PRODUCT_ANALYST'::character varying, 'UI_DESIGNER'::character varying, 'UX_DESIGNER'::character varying, 'GRAPHIC_DESIGNER'::character varying, 'PRODUCT_DESIGNER'::character varying, 'DATA_ANALYST'::character varying, 'DATA_SCIENTIST'::character varying, 'BUSINESS_ANALYST'::character varying, 'MARKETING_MANAGER'::character varying, 'CONTENT_WRITER'::character varying, 'SEO_SPECIALIST'::character varying, 'SOCIAL_MEDIA_MANAGER'::character varying, 'DIGITAL_MARKETER'::character varying, 'SALES_REPRESENTATIVE'::character varying, 'SALES_MANAGER'::character varying, 'ACCOUNT_MANAGER'::character varying, 'BUSINESS_DEVELOPMENT'::character varying, 'OPERATIONS_MANAGER'::character varying, 'PROJECT_MANAGER'::character varying, 'SCRUM_MASTER'::character varying, 'PROGRAM_MANAGER'::character varying, 'HR_MANAGER'::character varying, 'HR_GENERALIST'::character varying, 'RECRUITER'::character varying, 'TALENT_ACQUISITION'::character varying, 'HUMAN_RESOURCES'::character varying, 'ACCOUNTANT'::character varying, 'FINANCIAL_ANALYST'::character varying, 'FINANCE_MANAGER'::character varying, 'FINANCE'::character varying, 'ADMIN_ASSISTANT'::character varying, 'OFFICE_MANAGER'::character varying, 'CUSTOMER_SUPPORT'::character varying, 'TECH_SUPPORT'::character varying, 'LEGAL_COUNSEL'::character varying, 'COMPLIANCE_OFFICER'::character varying, 'CONSULTANT'::character varying, 'INTERN'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_current_level_check CHECK (((current_level)::text = ANY ((ARRAY['ENTRY'::character varying, 'MID'::character varying, 'SENIOR'::character varying, 'LEAD'::character varying, 'MANAGER'::character varying, 'SENIOR_MANAGER'::character varying, 'DIRECTOR'::character varying, 'VP'::character varying, 'SVP'::character varying, 'CXO'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_current_status_check CHECK (((current_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ON_LEAVE'::character varying, 'ON_NOTICE'::character varying, 'TERMINATED'::character varying, 'RESIGNED'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_new_employment_type_check CHECK (((new_employment_type)::text = ANY ((ARRAY['FULL_TIME'::character varying, 'PART_TIME'::character varying, 'CONTRACT'::character varying, 'INTERN'::character varying, 'CONSULTANT'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_new_job_role_check CHECK (((new_job_role)::text = ANY ((ARRAY['EXECUTIVE'::character varying, 'CEO'::character varying, 'CTO'::character varying, 'CFO'::character varying, 'COO'::character varying, 'ENGINEERING'::character varying, 'SOFTWARE_ENGINEER'::character varying, 'FRONTEND_DEVELOPER'::character varying, 'BACKEND_DEVELOPER'::character varying, 'FULLSTACK_DEVELOPER'::character varying, 'DEVOPS_ENGINEER'::character varying, 'QA_ENGINEER'::character varying, 'DATA_ENGINEER'::character varying, 'MOBILE_DEVELOPER'::character varying, 'SYSTEM_ARCHITECT'::character varying, 'TECH_LEAD'::character varying, 'ENGINEERING_MANAGER'::character varying, 'PRODUCT_MANAGER'::character varying, 'PRODUCT_OWNER'::character varying, 'PRODUCT_ANALYST'::character varying, 'UI_DESIGNER'::character varying, 'UX_DESIGNER'::character varying, 'GRAPHIC_DESIGNER'::character varying, 'PRODUCT_DESIGNER'::character varying, 'DATA_ANALYST'::character varying, 'DATA_SCIENTIST'::character varying, 'BUSINESS_ANALYST'::character varying, 'MARKETING_MANAGER'::character varying, 'CONTENT_WRITER'::character varying, 'SEO_SPECIALIST'::character varying, 'SOCIAL_MEDIA_MANAGER'::character varying, 'DIGITAL_MARKETER'::character varying, 'SALES_REPRESENTATIVE'::character varying, 'SALES_MANAGER'::character varying, 'ACCOUNT_MANAGER'::character varying, 'BUSINESS_DEVELOPMENT'::character varying, 'OPERATIONS_MANAGER'::character varying, 'PROJECT_MANAGER'::character varying, 'SCRUM_MASTER'::character varying, 'PROGRAM_MANAGER'::character varying, 'HR_MANAGER'::character varying, 'HR_GENERALIST'::character varying, 'RECRUITER'::character varying, 'TALENT_ACQUISITION'::character varying, 'HUMAN_RESOURCES'::character varying, 'ACCOUNTANT'::character varying, 'FINANCIAL_ANALYST'::character varying, 'FINANCE_MANAGER'::character varying, 'FINANCE'::character varying, 'ADMIN_ASSISTANT'::character varying, 'OFFICE_MANAGER'::character varying, 'CUSTOMER_SUPPORT'::character varying, 'TECH_SUPPORT'::character varying, 'LEGAL_COUNSEL'::character varying, 'COMPLIANCE_OFFICER'::character varying, 'CONSULTANT'::character varying, 'INTERN'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_new_level_check CHECK (((new_level)::text = ANY ((ARRAY['ENTRY'::character varying, 'MID'::character varying, 'SENIOR'::character varying, 'LEAD'::character varying, 'MANAGER'::character varying, 'SENIOR_MANAGER'::character varying, 'DIRECTOR'::character varying, 'VP'::character varying, 'SVP'::character varying, 'CXO'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_new_status_check CHECK (((new_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ON_LEAVE'::character varying, 'ON_NOTICE'::character varying, 'TERMINATED'::character varying, 'RESIGNED'::character varying])::text[]))),
    CONSTRAINT employment_change_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.employment_change_requests OWNER TO hrms;

--
-- Name: engagement_scores; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.engagement_scores
(
  average_sentiment          double precision,
  communication_score        double precision,
  company_benchmark          double precision,
  company_culture_score      double precision,
  compensation_score         double precision,
  detractors                 integer,
  growth_opportunities_score double precision,
  industry_benchmark         double precision,
  job_satisfaction_score     double precision,
  leadership_score           double precision,
  manager_relationship_score double precision,
  negative_responses         integer,
  neutral_responses          integer,
  nps_score                  double precision,
  overall_score              double precision       NOT NULL,
  passives                   integer,
  positive_responses         integer,
  previous_score             double precision,
  promoters                  integer,
  recognition_score          double precision,
  response_rate              double precision,
  score_date                 date                   NOT NULL,
  score_delta                double precision,
  team_collaboration_score   double precision,
  total_eligible             integer,
  total_responses            integer,
  work_environment_score     double precision,
  work_life_balance_score    double precision,
  calculated_at              timestamp(6) without time zone,
  department_id              uuid,
  id                         uuid                   NOT NULL,
  location_id                uuid,
  survey_id                  uuid,
  tenant_id                  uuid                   NOT NULL,
  employment_type            character varying(255),
  grade                      character varying(255),
  score_level                character varying(255) NOT NULL,
  score_type                 character varying(255),
  CONSTRAINT engagement_scores_score_level_check CHECK (((score_level)::text = ANY ((ARRAY['ORGANIZATION':: character varying, 'DEPARTMENT':: character varying, 'LOCATION':: character varying, 'TEAM':: character varying, 'MANAGER':: character varying, 'GRADE':: character varying])::text[])
) ),
    CONSTRAINT engagement_scores_score_type_check CHECK (((score_type)::text = ANY ((ARRAY['ENGAGEMENT'::character varying, 'PULSE'::character varying, 'EXIT'::character varying, 'SATISFACTION'::character varying, 'CUSTOM'::character varying])::text[])))
);


ALTER TABLE public.engagement_scores OWNER TO hrms;

--
-- Name: esi_configs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.esi_configs
(
  effective_from                   date          NOT NULL,
  effective_to                     date,
  employee_contribution_percentage numeric(5, 2) NOT NULL,
  employer_contribution_percentage numeric(5, 2) NOT NULL,
  is_active                        boolean       NOT NULL,
  wage_ceiling                     numeric(10, 2),
  created_at                       timestamp(6) without time zone NOT NULL,
  updated_at                       timestamp(6) without time zone,
  created_by                       uuid,
  id                               uuid          NOT NULL,
  tenant_id                        uuid          NOT NULL,
  updated_by                       uuid
);


ALTER TABLE public.esi_configs OWNER TO hrms;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.exchange_rates
(
  effective_date     date                 NOT NULL,
  expiry_date        date,
  from_currency      character varying(3) NOT NULL,
  is_deleted         boolean              NOT NULL,
  is_manual_override boolean,
  rate               numeric(18, 8)       NOT NULL,
  to_currency        character varying(3) NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                 NOT NULL,
  tenant_id          uuid                 NOT NULL,
  updated_by         uuid,
  notes              text,
  rate_type          character varying(255),
  source             character varying(255),
  CONSTRAINT exchange_rates_rate_type_check CHECK (((rate_type)::text = ANY ((ARRAY['SPOT':: character varying, 'BUDGET':: character varying, 'CONTRACTED':: character varying, 'AVERAGE':: character varying])::text[])
) )
);


ALTER TABLE public.exchange_rates OWNER TO hrms;

--
-- Name: exit_clearances; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.exit_clearances
(
  approved_date   date,
  requested_date  date,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone,
  approver_id     uuid                   NOT NULL,
  exit_process_id uuid                   NOT NULL,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  status          character varying(30)  NOT NULL,
  department      character varying(100) NOT NULL,
  checklist_items text,
  comments        text,
  CONSTRAINT exit_clearances_department_check CHECK (((department)::text = ANY ((ARRAY['IT':: character varying, 'ADMIN':: character varying, 'FINANCE':: character varying, 'HR':: character varying, 'REPORTING_MANAGER':: character varying, 'LIBRARY':: character varying, 'FACILITIES':: character varying])::text[])
) ),
    CONSTRAINT exit_clearances_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'NOT_REQUIRED'::character varying])::text[])))
);


ALTER TABLE public.exit_clearances OWNER TO hrms;

--
-- Name: exit_interviews; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.exit_interviews
(
  actual_date                    date,
  compensation_rating            integer,
  growth_opportunities_rating    integer,
  is_confidential                boolean,
  is_deleted                     boolean NOT NULL,
  management_rating              integer,
  new_salary_increase_percentage integer,
  overall_experience_rating      integer,
  scheduled_date                 date,
  team_culture_rating            integer,
  work_life_balance_rating       integer,
  would_consider_returning       boolean,
  would_recommend_company        boolean,
  created_at                     timestamp(6) without time zone NOT NULL,
  scheduled_time                 timestamp(6) without time zone,
  updated_at                     timestamp(6) without time zone NOT NULL,
  version                        bigint,
  created_by                     uuid,
  employee_id                    uuid    NOT NULL,
  exit_process_id                uuid    NOT NULL,
  id                             uuid    NOT NULL,
  interviewer_id                 uuid,
  tenant_id                      uuid    NOT NULL,
  updated_by                     uuid,
  detailed_reason                text,
  interview_mode                 character varying(255),
  interviewer_notes              text,
  new_employer                   character varying(255),
  new_role                       character varying(255),
  primary_reason_for_leaving     character varying(255),
  public_token                   character varying(255),
  status                         character varying(255),
  suggestions                    text,
  what_could_improve             text,
  what_liked_most                text,
  CONSTRAINT exit_interviews_interview_mode_check CHECK (((interview_mode)::text = ANY ((ARRAY['IN_PERSON':: character varying, 'VIDEO_CALL':: character varying, 'PHONE':: character varying, 'WRITTEN_SURVEY':: character varying])::text[])
) ),
    CONSTRAINT exit_interviews_primary_reason_for_leaving_check CHECK (((primary_reason_for_leaving)::text = ANY ((ARRAY['BETTER_OPPORTUNITY'::character varying, 'COMPENSATION'::character varying, 'CAREER_GROWTH'::character varying, 'WORK_LIFE_BALANCE'::character varying, 'MANAGEMENT_ISSUES'::character varying, 'RELOCATION'::character varying, 'PERSONAL_REASONS'::character varying, 'HEALTH_ISSUES'::character varying, 'HIGHER_EDUCATION'::character varying, 'STARTING_OWN_BUSINESS'::character varying, 'RETIREMENT'::character varying, 'COMPANY_CULTURE'::character varying, 'JOB_SECURITY'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT exit_interviews_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'NO_SHOW'::character varying, 'RESCHEDULED'::character varying])::text[])))
);


ALTER TABLE public.exit_interviews OWNER TO hrms;

--
-- Name: exit_processes; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.exit_processes
(
  buyout_amount            numeric(38, 2),
  exit_interview_date      date,
  exit_interview_scheduled boolean,
  final_settlement_amount  numeric(38, 2),
  last_working_date        date,
  notice_period_days       integer,
  notice_period_served     integer,
  rehire_eligible          boolean,
  resignation_date         date,
  settlement_date          date,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone,
  employee_id              uuid                  NOT NULL,
  hr_spoc_id               uuid,
  id                       uuid                  NOT NULL,
  manager_id               uuid,
  tenant_id                uuid                  NOT NULL,
  exit_type                character varying(30) NOT NULL,
  status                   character varying(30) NOT NULL,
  new_company              character varying(200),
  new_designation          character varying(200),
  exit_interview_feedback  text,
  notes                    text,
  reason_for_leaving       text,
  CONSTRAINT exit_processes_exit_type_check CHECK (((exit_type)::text = ANY ((ARRAY['RESIGNATION':: character varying, 'TERMINATION':: character varying, 'RETIREMENT':: character varying, 'END_OF_CONTRACT':: character varying, 'ABSCONDING':: character varying])::text[])
) ),
    CONSTRAINT exit_processes_status_check CHECK (((status)::text = ANY ((ARRAY['INITIATED'::character varying, 'IN_PROGRESS'::character varying, 'CLEARANCE_PENDING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.exit_processes OWNER TO hrms;

--
-- Name: expense_claims; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.expense_claims
(
  amount            numeric(10, 2)         NOT NULL,
  claim_date        date                   NOT NULL,
  currency          character varying(3),
  is_deleted        boolean                NOT NULL,
  payment_date      date,
  approved_at       timestamp(6) without time zone,
  created_at        timestamp(6) without time zone NOT NULL,
  rejected_at       timestamp(6) without time zone,
  submitted_at      timestamp(6) without time zone,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  approved_by       uuid,
  created_by        uuid,
  employee_id       uuid                   NOT NULL,
  id                uuid                   NOT NULL,
  rejected_by       uuid,
  tenant_id         uuid                   NOT NULL,
  updated_by        uuid,
  status            character varying(20)  NOT NULL,
  category          character varying(50)  NOT NULL,
  claim_number      character varying(50),
  payment_reference character varying(100),
  description       character varying(500) NOT NULL,
  receipt_url       character varying(500),
  rejection_reason  character varying(500),
  notes             character varying(1000),
  CONSTRAINT expense_claims_category_check CHECK (((category)::text = ANY ((ARRAY['TRAVEL':: character varying, 'ACCOMMODATION':: character varying, 'MEALS':: character varying, 'TRANSPORT':: character varying, 'OFFICE_SUPPLIES':: character varying, 'EQUIPMENT':: character varying, 'SOFTWARE':: character varying, 'TRAINING':: character varying, 'MEDICAL':: character varying, 'COMMUNICATION':: character varying, 'ENTERTAINMENT':: character varying, 'RELOCATION':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT expense_claims_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PAID'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.expense_claims OWNER TO hrms;

--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.feature_flags
(
  enabled            boolean                NOT NULL,
  percentage_rollout integer,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  category           character varying(50),
  feature_key        character varying(100) NOT NULL,
  feature_name       character varying(200) NOT NULL,
  description        character varying(500),
  metadata           text
);


ALTER TABLE public.feature_flags OWNER TO hrms;

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.feedback
(
  is_anonymous      boolean,
  is_deleted        boolean NOT NULL,
  is_public         boolean,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  giver_id          uuid    NOT NULL,
  id                uuid    NOT NULL,
  recipient_id      uuid    NOT NULL,
  related_review_id uuid,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid,
  feedback_type     character varying(50),
  category          character varying(100),
  feedback_text     text    NOT NULL,
  CONSTRAINT feedback_feedback_type_check CHECK (((feedback_type)::text = ANY ((ARRAY['PRAISE':: character varying, 'CONSTRUCTIVE':: character varying, 'GENERAL':: character varying, 'REQUEST':: character varying])::text[])
) )
);


ALTER TABLE public.feedback OWNER TO hrms;

--
-- Name: feedback_360_cycles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.feedback_360_cycles
(
  end_date                date                   NOT NULL,
  include_manager_review  boolean,
  include_peer_review     boolean,
  include_self_review     boolean,
  include_upward_review   boolean,
  is_anonymous            boolean,
  is_deleted              boolean                NOT NULL,
  manager_review_deadline date,
  max_peers_allowed       integer,
  min_peers_required      integer,
  nomination_deadline     date,
  peer_review_deadline    date,
  self_review_deadline    date,
  start_date              date                   NOT NULL,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  id                      uuid                   NOT NULL,
  template_id             uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  status                  character varying(30),
  name                    character varying(200) NOT NULL,
  description             text,
  CONSTRAINT feedback_360_cycles_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'NOMINATION_OPEN':: character varying, 'IN_PROGRESS':: character varying, 'REVIEW_COMPLETE':: character varying, 'CLOSED':: character varying])::text[])
) )
);


ALTER TABLE public.feedback_360_cycles OWNER TO hrms;

--
-- Name: feedback_360_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.feedback_360_requests
(
  is_deleted          boolean               NOT NULL,
  nomination_approved boolean,
  reminder_count      integer,
  approved_at         timestamp(6) without time zone,
  created_at          timestamp(6) without time zone NOT NULL,
  reminder_sent_at    timestamp(6) without time zone,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  approved_by         uuid,
  created_by          uuid,
  cycle_id            uuid                  NOT NULL,
  id                  uuid                  NOT NULL,
  nominated_by        uuid,
  reviewer_id         uuid                  NOT NULL,
  subject_employee_id uuid                  NOT NULL,
  tenant_id           uuid                  NOT NULL,
  updated_by          uuid,
  reviewer_type       character varying(30) NOT NULL,
  status              character varying(30),
  CONSTRAINT feedback_360_requests_reviewer_type_check CHECK (((reviewer_type)::text = ANY ((ARRAY['SELF':: character varying, 'MANAGER':: character varying, 'PEER':: character varying, 'DIRECT_REPORT':: character varying, 'EXTERNAL':: character varying])::text[])
) ),
    CONSTRAINT feedback_360_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'NOMINATED'::character varying, 'APPROVED'::character varying, 'IN_PROGRESS'::character varying, 'SUBMITTED'::character varying, 'DECLINED'::character varying])::text[])))
);


ALTER TABLE public.feedback_360_requests OWNER TO hrms;

--
-- Name: feedback_360_responses; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.feedback_360_responses
(
  adaptability_rating     numeric(3, 2),
  communication_rating    numeric(3, 2),
  is_deleted              boolean NOT NULL,
  is_draft                boolean,
  leadership_rating       numeric(3, 2),
  overall_rating          numeric(3, 2),
  problem_solving_rating  numeric(3, 2),
  teamwork_rating         numeric(3, 2),
  technical_skills_rating numeric(3, 2),
  time_management_rating  numeric(3, 2),
  work_quality_rating     numeric(3, 2),
  created_at              timestamp(6) without time zone NOT NULL,
  submitted_at            timestamp(6) without time zone,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  cycle_id                uuid    NOT NULL,
  id                      uuid    NOT NULL,
  request_id              uuid    NOT NULL,
  reviewer_id             uuid    NOT NULL,
  subject_employee_id     uuid    NOT NULL,
  tenant_id               uuid    NOT NULL,
  updated_by              uuid,
  reviewer_type           character varying(30),
  additional_comments     text,
  areas_for_improvement   text,
  custom_responses        text,
  development_suggestions text,
  specific_examples       text,
  strengths               text,
  CONSTRAINT feedback_360_responses_reviewer_type_check CHECK (((reviewer_type)::text = ANY ((ARRAY['SELF':: character varying, 'MANAGER':: character varying, 'PEER':: character varying, 'DIRECT_REPORT':: character varying, 'EXTERNAL':: character varying])::text[])
) )
);


ALTER TABLE public.feedback_360_responses OWNER TO hrms;

--
-- Name: feedback_360_summaries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.feedback_360_summaries
(
  avg_adaptability          numeric(3, 2),
  avg_communication         numeric(3, 2),
  avg_leadership            numeric(3, 2),
  avg_problem_solving       numeric(3, 2),
  avg_teamwork              numeric(3, 2),
  avg_technical_skills      numeric(3, 2),
  avg_time_management       numeric(3, 2),
  avg_work_quality          numeric(3, 2),
  final_rating              numeric(3, 2),
  is_deleted                boolean NOT NULL,
  manager_overall_rating    numeric(3, 2),
  manager_review_completed  boolean,
  peer_avg_rating           numeric(3, 2),
  peer_reviews_completed    integer,
  responses_received        integer,
  self_overall_rating       numeric(3, 2),
  self_review_completed     boolean,
  shared_with_employee      boolean,
  total_reviewers           integer,
  upward_avg_rating         numeric(3, 2),
  upward_reviews_completed  integer,
  created_at                timestamp(6) without time zone NOT NULL,
  generated_at              timestamp(6) without time zone,
  shared_at                 timestamp(6) without time zone,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  created_by                uuid,
  cycle_id                  uuid    NOT NULL,
  id                        uuid    NOT NULL,
  subject_employee_id       uuid    NOT NULL,
  tenant_id                 uuid    NOT NULL,
  updated_by                uuid,
  action_items              text,
  consolidated_improvements text,
  consolidated_strengths    text
);


ALTER TABLE public.feedback_360_summaries OWNER TO hrms;

--
-- Name: file_metadata; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.file_metadata
(
  is_deleted   boolean                NOT NULL,
  created_at   timestamp(6) without time zone NOT NULL,
  file_size    bigint                 NOT NULL,
  updated_at   timestamp(6) without time zone NOT NULL,
  version      bigint,
  created_by   uuid,
  entity_id    uuid,
  id           uuid                   NOT NULL,
  tenant_id    uuid                   NOT NULL,
  updated_by   uuid,
  category     character varying(50),
  checksum     character varying(64),
  content_type character varying(100) NOT NULL,
  entity_type  character varying(100),
  storage_path character varying(500) NOT NULL,
  description  text,
  file_name    character varying(255) NOT NULL,
  CONSTRAINT file_metadata_category_check CHECK (((category)::text = ANY ((ARRAY['EMPLOYEE_DOCUMENT':: character varying, 'PROFILE_PHOTO':: character varying, 'CONTRACT':: character varying, 'CERTIFICATE':: character varying, 'PAYSLIP':: character varying, 'LEAVE_ATTACHMENT':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.file_metadata OWNER TO hrms;

--
-- Name: flex_benefit_allocations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.flex_benefit_allocations
(
  allocation_date       date,
  carryover_amount      numeric(38, 2),
  carryover_from_year   integer        NOT NULL,
  education_allocation  numeric(38, 2),
  education_used        numeric(38, 2),
  expiry_date           date,
  fiscal_year           integer        NOT NULL,
  forfeited_credits     numeric(38, 2),
  health_allocation     numeric(38, 2),
  health_used           numeric(38, 2),
  is_deleted            boolean        NOT NULL,
  lifestyle_allocation  numeric(38, 2),
  lifestyle_used        numeric(38, 2),
  remaining_credits     numeric(38, 2),
  retirement_allocation numeric(38, 2),
  retirement_used       numeric(38, 2),
  total_credits         numeric(38, 2) NOT NULL,
  transport_allocation  numeric(38, 2),
  transport_used        numeric(38, 2),
  used_credits          numeric(38, 2),
  wellness_allocation   numeric(38, 2),
  wellness_used         numeric(38, 2),
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  created_by            uuid,
  employee_id           uuid           NOT NULL,
  id                    uuid           NOT NULL,
  tenant_id             uuid           NOT NULL,
  updated_by            uuid,
  status                character varying(255),
  CONSTRAINT flex_benefit_allocations_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'ACTIVE':: character varying, 'EXHAUSTED':: character varying, 'EXPIRED':: character varying, 'FORFEITED':: character varying])::text[])
) )
);


ALTER TABLE public.flex_benefit_allocations OWNER TO hrms;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.flyway_schema_history
(
  installed_rank integer                 NOT NULL,
  version        character varying(50),
  description    character varying(200)  NOT NULL,
  type           character varying(20)   NOT NULL,
  script         character varying(1000) NOT NULL,
  checksum       integer,
  installed_by   character varying(100)  NOT NULL,
  installed_on   timestamp without time zone DEFAULT now() NOT NULL,
  execution_time integer                 NOT NULL,
  success        boolean                 NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO hrms;

--
-- Name: full_and_final_settlements; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.full_and_final_settlements
(
  advance_recovery       numeric(12, 2),
  approval_date          date,
  asset_damage_deduction numeric(12, 2),
  bonus_amount           numeric(12, 2),
  gratuity_amount        numeric(12, 2),
  is_deleted             boolean NOT NULL,
  is_gratuity_eligible   boolean,
  last_drawn_salary      numeric(12, 2),
  leave_encashment       numeric(12, 2),
  loan_recovery          numeric(12, 2),
  net_payable            numeric(12, 2),
  notice_buyout          numeric(12, 2),
  notice_period_recovery numeric(12, 2),
  other_deductions       numeric(12, 2),
  other_earnings         numeric(12, 2),
  payment_date           date,
  pending_salary         numeric(12, 2),
  reimbursements         numeric(12, 2),
  tax_deduction          numeric(12, 2),
  total_deductions       numeric(12, 2),
  total_earnings         numeric(12, 2),
  years_of_service       numeric(5, 2),
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  approved_by            uuid,
  created_by             uuid,
  employee_id            uuid    NOT NULL,
  exit_process_id        uuid    NOT NULL,
  id                     uuid    NOT NULL,
  prepared_by            uuid,
  tenant_id              uuid    NOT NULL,
  updated_by             uuid,
  payment_mode           character varying(255),
  payment_reference      character varying(255),
  remarks                text,
  status                 character varying(255),
  CONSTRAINT full_and_final_settlements_payment_mode_check CHECK (((payment_mode)::text = ANY ((ARRAY['BANK_TRANSFER':: character varying, 'CHEQUE':: character varying, 'CASH':: character varying, 'DEMAND_DRAFT':: character varying])::text[])
) ),
    CONSTRAINT full_and_final_settlements_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'PROCESSING'::character varying, 'PAID'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.full_and_final_settlements OWNER TO hrms;

--
-- Name: generated_documents; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.generated_documents
(
  is_signed       boolean,
  created_at      timestamp(6) without time zone NOT NULL,
  file_size       bigint,
  updated_at      timestamp(6) without time zone,
  valid_until     timestamp(6) without time zone,
  created_by      uuid,
  employee_id     uuid,
  id              uuid                  NOT NULL,
  template_id     uuid                  NOT NULL,
  tenant_id       uuid                  NOT NULL,
  updated_by      uuid,
  status          character varying(30) NOT NULL,
  document_number character varying(50),
  mime_type       character varying(100),
  file_path       character varying(500),
  generated_data  text,
  signature_data  text,
  CONSTRAINT generated_documents_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'GENERATED':: character varying, 'PENDING_APPROVAL':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'SENT':: character varying, 'SIGNED':: character varying, 'ARCHIVED':: character varying])::text[])
) )
);


ALTER TABLE public.generated_documents OWNER TO hrms;

--
-- Name: generated_letters; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.generated_letters
(
  downloaded_by_employee    boolean,
  effective_date            date,
  expiry_date               date,
  is_deleted                boolean                NOT NULL,
  letter_date               date,
  letter_version            integer,
  sent_to_employee          boolean,
  approved_at               timestamp(6) without time zone,
  created_at                timestamp(6) without time zone NOT NULL,
  downloaded_at             timestamp(6) without time zone,
  generated_at              timestamp(6) without time zone,
  issued_at                 timestamp(6) without time zone,
  sent_at                   timestamp(6) without time zone,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  approved_by               uuid,
  candidate_id              uuid,
  created_by                uuid,
  employee_id               uuid,
  generated_by              uuid,
  id                        uuid                   NOT NULL,
  issued_by                 uuid,
  previous_version_id       uuid,
  template_id               uuid                   NOT NULL,
  tenant_id                 uuid                   NOT NULL,
  updated_by                uuid,
  additional_notes          text,
  approval_comments         text,
  category                  character varying(255) NOT NULL,
  custom_placeholder_values text,
  generated_content         text                   NOT NULL,
  letter_title              character varying(255) NOT NULL,
  pdf_url                   text,
  reference_number          character varying(255) NOT NULL,
  status                    character varying(255) NOT NULL,
  CONSTRAINT generated_letters_category_check CHECK (((category)::text = ANY ((ARRAY['OFFER':: character varying, 'APPOINTMENT':: character varying, 'CONFIRMATION':: character varying, 'PROMOTION':: character varying, 'TRANSFER':: character varying, 'SALARY_REVISION':: character varying, 'WARNING':: character varying, 'TERMINATION':: character varying, 'RESIGNATION_ACCEPTANCE':: character varying, 'EXPERIENCE':: character varying, 'RELIEVING':: character varying, 'SALARY_CERTIFICATE':: character varying, 'EMPLOYMENT_CERTIFICATE':: character varying, 'BONAFIDE':: character varying, 'VISA_SUPPORT':: character varying, 'BANK_LETTER':: character varying, 'ADDRESS_PROOF':: character varying, 'INTERNSHIP':: character varying, 'TRAINING_COMPLETION':: character varying, 'APPRECIATION':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT generated_letters_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'ISSUED'::character varying, 'REVOKED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.generated_letters OWNER TO hrms;

--
-- Name: global_payroll_runs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.global_payroll_runs
(
  base_currency            character varying(3),
  employee_count           integer,
  error_count              integer,
  is_deleted               boolean                NOT NULL,
  location_count           integer,
  pay_period_end           date                   NOT NULL,
  pay_period_start         date                   NOT NULL,
  payment_date             date,
  total_deductions_base    numeric(15, 2),
  total_employer_cost_base numeric(15, 2),
  total_gross_base         numeric(15, 2),
  total_net_base           numeric(15, 2),
  warning_count            integer,
  approved_at              timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  processed_at             timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  approved_by              uuid,
  created_by               uuid,
  id                       uuid                   NOT NULL,
  processed_by             uuid,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  description              character varying(255),
  notes                    text,
  run_code                 character varying(255) NOT NULL,
  status                   character varying(255) NOT NULL,
  CONSTRAINT global_payroll_runs_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'PROCESSING':: character varying, 'PENDING_APPROVAL':: character varying, 'APPROVED':: character varying, 'PAID':: character varying, 'CANCELLED':: character varying, 'ERROR':: character varying])::text[])
) )
);


ALTER TABLE public.global_payroll_runs OWNER TO hrms;

--
-- Name: goals; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.goals
(
  current_value       numeric(19, 2),
  due_date            date                   NOT NULL,
  is_deleted          boolean                NOT NULL,
  progress_percentage integer,
  start_date          date                   NOT NULL,
  target_value        numeric(19, 2),
  weight              integer,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  approved_by         uuid,
  created_by          uuid,
  employee_id         uuid                   NOT NULL,
  id                  uuid                   NOT NULL,
  parent_goal_id      uuid,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  goal_type           character varying(50),
  measurement_unit    character varying(50),
  status              character varying(50),
  category            character varying(100),
  description         text,
  title               character varying(255) NOT NULL,
  CONSTRAINT goals_goal_type_check CHECK (((goal_type)::text = ANY ((ARRAY['OKR':: character varying, 'KPI':: character varying, 'PERSONAL':: character varying, 'TEAM':: character varying])::text[])
) ),
    CONSTRAINT goals_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'ON_HOLD'::character varying])::text[])))
);


ALTER TABLE public.goals OWNER TO hrms;

--
-- Name: headcount_budgets; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.headcount_budgets
(
  actual_attrition      integer,
  actual_headcount      integer,
  actual_hires          integer,
  actual_salary_spend   numeric(15, 2),
  actual_total_spend    numeric(15, 2),
  allocated_budget      numeric(15, 2),
  attrition_rate        numeric(5, 2),
  benefits_budget       numeric(15, 2),
  bonus_budget          numeric(15, 2),
  closing_headcount     integer,
  contingency_budget    numeric(15, 2),
  current_headcount     integer,
  fiscal_year           integer                NOT NULL,
  is_deleted            boolean                NOT NULL,
  opening_headcount     integer,
  other_budget          numeric(15, 2),
  planned_attrition     integer,
  planned_hires         integer,
  planned_transfers_in  integer,
  planned_transfers_out integer,
  recruitment_budget    numeric(15, 2),
  salary_budget         numeric(15, 2),
  total_budget          numeric(15, 2),
  training_budget       numeric(15, 2),
  approved_at           timestamp(6) without time zone,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  currency              character varying(10),
  approved_by           uuid,
  cost_center_id        uuid,
  created_by            uuid,
  department_id         uuid,
  id                    uuid                   NOT NULL,
  submitted_by          uuid,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  approval_notes        text,
  budget_name           character varying(255) NOT NULL,
  cost_center           character varying(255),
  cost_center_code      character varying(255),
  department_name       character varying(255),
  description           text,
  notes                 text,
  quarter               character varying(255),
  status                character varying(255),
  CONSTRAINT headcount_budgets_quarter_check CHECK (((quarter)::text = ANY ((ARRAY['Q1':: character varying, 'Q2':: character varying, 'Q3':: character varying, 'Q4':: character varying, 'ANNUAL':: character varying])::text[])
) ),
    CONSTRAINT headcount_budgets_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'PENDING_APPROVAL'::character varying, 'UNDER_REVIEW'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CLOSED'::character varying])::text[])))
);


ALTER TABLE public.headcount_budgets OWNER TO hrms;

--
-- Name: headcount_positions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.headcount_positions
(
  actual_fill_date    date,
  budgeted_benefits   numeric(12, 2),
  budgeted_salary     numeric(12, 2),
  fte_count           numeric(3, 2),
  is_deleted          boolean                NOT NULL,
  max_salary          numeric(12, 2),
  min_salary          numeric(12, 2),
  planned_fill_date   date,
  planned_start_date  date,
  total_cost          numeric(12, 2),
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  budget_id           uuid                   NOT NULL,
  created_by          uuid,
  current_employee_id uuid,
  hiring_manager_id   uuid,
  id                  uuid                   NOT NULL,
  replacement_for     uuid,
  requisition_id      uuid,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  employment_type     character varying(255),
  job_family          character varying(255),
  job_level           character varying(255),
  justification       text,
  location            character varying(255),
  position_code       character varying(255),
  position_title      character varying(255) NOT NULL,
  position_type       character varying(255) NOT NULL,
  status              character varying(255) NOT NULL,
  CONSTRAINT headcount_positions_position_type_check CHECK (((position_type)::text = ANY ((ARRAY['NEW_ROLE':: character varying, 'REPLACEMENT':: character varying, 'CONVERSION':: character varying, 'UPGRADE':: character varying, 'BACKFILL':: character varying])::text[])
) ),
    CONSTRAINT headcount_positions_status_check CHECK (((status)::text = ANY ((ARRAY['PLANNED'::character varying, 'APPROVED'::character varying, 'OPEN'::character varying, 'IN_PROGRESS'::character varying, 'FILLED'::character varying, 'CANCELLED'::character varying, 'ON_HOLD'::character varying])::text[])))
);


ALTER TABLE public.headcount_positions OWNER TO hrms;

--
-- Name: health_logs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.health_logs
(
  is_deleted     boolean                NOT NULL,
  log_date       date                   NOT NULL,
  points_awarded integer,
  value          double precision       NOT NULL,
  verified       boolean,
  created_at     timestamp(6) without time zone NOT NULL,
  logged_at      timestamp(6) without time zone,
  updated_at     timestamp(6) without time zone NOT NULL,
  verified_at    timestamp(6) without time zone,
  version        bigint,
  created_by     uuid,
  employee_id    uuid                   NOT NULL,
  id             uuid                   NOT NULL,
  participant_id uuid,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  verified_by    uuid,
  metric_type    character varying(255) NOT NULL,
  notes          character varying(255),
  source         character varying(255),
  unit           character varying(255),
  CONSTRAINT health_logs_metric_type_check CHECK (((metric_type)::text = ANY ((ARRAY['STEPS':: character varying, 'DISTANCE_KM':: character varying, 'CALORIES_BURNED':: character varying, 'WORKOUT_MINUTES':: character varying, 'WATER_ML':: character varying, 'SLEEP_HOURS':: character varying, 'HEART_RATE_AVG':: character varying, 'BLOOD_PRESSURE_SYSTOLIC':: character varying, 'BLOOD_PRESSURE_DIASTOLIC':: character varying, 'WEIGHT_KG':: character varying, 'BMI':: character varying, 'MEDITATION_MINUTES':: character varying, 'HEALTHY_MEALS':: character varying, 'SCREEN_FREE_HOURS':: character varying, 'MOOD_SCORE':: character varying, 'STRESS_LEVEL':: character varying, 'ENERGY_LEVEL':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.health_logs OWNER TO hrms;

--
-- Name: holidays; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.holidays
(
  holiday_date           date                   NOT NULL,
  is_deleted             boolean                NOT NULL,
  is_optional            boolean,
  is_restricted          boolean,
  year                   integer                NOT NULL,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  id                     uuid                   NOT NULL,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  holiday_type           character varying(50)  NOT NULL,
  holiday_name           character varying(200) NOT NULL,
  applicable_departments text,
  applicable_locations   text,
  description            text,
  CONSTRAINT holidays_holiday_type_check CHECK (((holiday_type)::text = ANY ((ARRAY['NATIONAL':: character varying, 'REGIONAL':: character varying, 'OPTIONAL':: character varying, 'RESTRICTED':: character varying, 'FESTIVAL':: character varying, 'COMPANY_EVENT':: character varying])::text[])
) )
);


ALTER TABLE public.holidays OWNER TO hrms;

--
-- Name: interviews; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.interviews
(
  duration_minutes         integer,
  rating                   integer,
  created_at               timestamp(6) without time zone NOT NULL,
  scheduled_at             timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone,
  candidate_id             uuid                  NOT NULL,
  id                       uuid                  NOT NULL,
  interviewer_id           uuid,
  job_opening_id           uuid                  NOT NULL,
  tenant_id                uuid                  NOT NULL,
  interview_type           character varying(30),
  result                   character varying(30),
  status                   character varying(30) NOT NULL,
  interview_round          character varying(50),
  location                 character varying(500),
  meeting_link             character varying(500),
  feedback                 text,
  notes                    text,
  created_by               uuid,
  updated_by               uuid,
  version                  bigint,
  is_deleted               boolean DEFAULT false NOT NULL,
  google_meet_link         character varying(500),
  google_calendar_event_id character varying(255),
  CONSTRAINT interviews_interview_round_check CHECK (((interview_round)::text = ANY ((ARRAY['SCREENING':: character varying, 'TECHNICAL_1':: character varying, 'TECHNICAL_2':: character varying, 'HR':: character varying, 'MANAGERIAL':: character varying, 'FINAL':: character varying])::text[])
) )
);


ALTER TABLE public.interviews OWNER TO hrms;

--
-- Name: COLUMN interviews.google_meet_link; Type: COMMENT; Schema: public; Owner: hrms
--

COMMENT
ON COLUMN public.interviews.google_meet_link IS 'Auto-generated Google Meet video link';


--
-- Name: COLUMN interviews.google_calendar_event_id; Type: COMMENT; Schema: public; Owner: hrms
--

COMMENT
ON COLUMN public.interviews.google_calendar_event_id IS 'Google Calendar event ID for sync/update/delete';


--
-- Name: job_board_postings; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.job_board_postings
(
  applications_count integer,
  views_count        integer,
  created_at         timestamp(6) without time zone NOT NULL,
  expires_at         timestamp(6) without time zone,
  last_synced_at     timestamp(6) without time zone,
  posted_at          timestamp(6) without time zone,
  updated_at         timestamp(6) without time zone NOT NULL,
  id                 uuid                  NOT NULL,
  job_opening_id     uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  status             character varying(20) NOT NULL,
  board_name         character varying(50) NOT NULL,
  external_job_id    character varying(200),
  error_message      text,
  external_url       text,
  CONSTRAINT job_board_postings_board_name_check CHECK (((board_name)::text = ANY ((ARRAY['NAUKRI':: character varying, 'INDEED':: character varying, 'LINKEDIN':: character varying, 'SHINE':: character varying, 'MONSTER':: character varying])::text[])
) ),
    CONSTRAINT job_board_postings_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACTIVE'::character varying, 'PAUSED'::character varying, 'EXPIRED'::character varying, 'FAILED'::character varying])::text[])))
);


ALTER TABLE public.job_board_postings OWNER TO hrms;

--
-- Name: job_openings; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.job_openings
(
  closing_date        date,
  is_active           boolean                NOT NULL,
  max_salary          numeric(38, 2),
  min_salary          numeric(38, 2),
  number_of_openings  integer,
  posted_date         date,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone,
  department_id       uuid,
  hiring_manager_id   uuid,
  id                  uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  priority            character varying(20),
  status              character varying(30)  NOT NULL,
  employment_type     character varying(50),
  job_code            character varying(50)  NOT NULL,
  experience_required character varying(100),
  job_title           character varying(200) NOT NULL,
  location            character varying(200),
  job_description     text,
  requirements        text,
  skills_required     text,
  created_by          uuid,
  updated_by          uuid,
  version             bigint,
  is_deleted          boolean DEFAULT false  NOT NULL
);


ALTER TABLE public.job_openings OWNER TO hrms;

--
-- Name: keka_import_history; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.keka_import_history
(
  id             uuid                   NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  created_by     uuid,
  is_deleted     boolean                NOT NULL,
  updated_by     uuid,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  tenant_id      uuid                   NOT NULL,
  created_count  integer DEFAULT 0      NOT NULL,
  duration       bigint                 NOT NULL,
  error_count    integer DEFAULT 0      NOT NULL,
  error_summary  text,
  file_name      character varying(255) NOT NULL,
  mapping_config text,
  skipped_count  integer DEFAULT 0      NOT NULL,
  status         character varying(20)  NOT NULL,
  total_rows     integer                NOT NULL,
  updated_count  integer DEFAULT 0      NOT NULL,
  uploaded_at    timestamp(6) without time zone NOT NULL,
  uploaded_by    character varying(36)  NOT NULL
);


ALTER TABLE public.keka_import_history OWNER TO hrms;

--
-- Name: key_results; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.key_results
(
  confidence_level    integer,
  current_value       numeric(19, 2),
  due_date            date,
  is_deleted          boolean                NOT NULL,
  is_milestone        boolean,
  milestone_order     integer,
  progress_percentage numeric(5, 2),
  start_value         numeric(19, 2),
  target_value        numeric(19, 2)         NOT NULL,
  weight              integer,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  objective_id        uuid                   NOT NULL,
  owner_id            uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  measurement_type    character varying(30),
  status              character varying(30),
  measurement_unit    character varying(50),
  title               character varying(500) NOT NULL,
  description         text,
  last_updated_notes  text,
  CONSTRAINT key_results_measurement_type_check CHECK (((measurement_type)::text = ANY ((ARRAY['PERCENTAGE':: character varying, 'NUMBER':: character varying, 'CURRENCY':: character varying, 'BINARY':: character varying, 'MILESTONE':: character varying])::text[])
) ),
    CONSTRAINT key_results_status_check CHECK (((status)::text = ANY ((ARRAY['NOT_STARTED'::character varying, 'IN_PROGRESS'::character varying, 'ON_TRACK'::character varying, 'AT_RISK'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.key_results OWNER TO hrms;

--
-- Name: knowledge_attachments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.knowledge_attachments
(
  is_deleted   boolean                 NOT NULL,
  created_at   timestamp(6) without time zone NOT NULL,
  file_size    bigint                  NOT NULL,
  updated_at   timestamp(6) without time zone NOT NULL,
  version      bigint,
  content_id   uuid                    NOT NULL,
  created_by   uuid,
  id           uuid                    NOT NULL,
  tenant_id    uuid                    NOT NULL,
  updated_by   uuid,
  uploaded_by  uuid,
  content_type character varying(50)   NOT NULL,
  file_type    character varying(50),
  mime_type    character varying(100),
  file_name    character varying(500)  NOT NULL,
  storage_path character varying(1000) NOT NULL,
  url          character varying(1000),
  CONSTRAINT knowledge_attachments_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['WIKI_PAGE':: character varying, 'BLOG_POST':: character varying, 'TEMPLATE':: character varying])::text[])
) )
);


ALTER TABLE public.knowledge_attachments OWNER TO hrms;

--
-- Name: knowledge_searches; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.knowledge_searches
(
  is_deleted    boolean                NOT NULL,
  results_count integer,
  created_at    timestamp(6) without time zone NOT NULL,
  updated_at    timestamp(6) without time zone NOT NULL,
  version       bigint,
  created_by    uuid,
  id            uuid                   NOT NULL,
  searched_by   uuid,
  tenant_id     uuid                   NOT NULL,
  updated_by    uuid,
  query         character varying(500) NOT NULL
);


ALTER TABLE public.knowledge_searches OWNER TO hrms;

--
-- Name: knowledge_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.knowledge_templates
(
  is_active          boolean                NOT NULL,
  is_deleted         boolean                NOT NULL,
  is_featured        boolean                NOT NULL,
  usage_count        integer                NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  category           character varying(100),
  name               character varying(200) NOT NULL,
  slug               character varying(200) NOT NULL,
  thumbnail_url      character varying(500),
  tags               character varying(1000),
  content            jsonb                  NOT NULL,
  description        text,
  sample_data        jsonb,
  template_variables jsonb
);


ALTER TABLE public.knowledge_templates OWNER TO hrms;

--
-- Name: knowledge_views; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.knowledge_views
(
  duration_seconds integer,
  is_deleted       boolean               NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  content_id       uuid                  NOT NULL,
  created_by       uuid,
  id               uuid                  NOT NULL,
  tenant_id        uuid                  NOT NULL,
  updated_by       uuid,
  user_id          uuid,
  ip_address       character varying(45),
  content_type     character varying(50) NOT NULL,
  user_agent       character varying(1000),
  CONSTRAINT knowledge_views_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['WIKI_PAGE':: character varying, 'BLOG_POST':: character varying])::text[])
) )
);


ALTER TABLE public.knowledge_views OWNER TO hrms;

--
-- Name: leave_balances; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.leave_balances
(
  accrued           numeric(5, 2),
  available         numeric(5, 2),
  carried_forward   numeric(5, 2),
  encashed          numeric(5, 2),
  is_deleted        boolean NOT NULL,
  lapsed            numeric(5, 2),
  last_accrual_date date,
  opening_balance   numeric(5, 2),
  pending           numeric(5, 2),
  used              numeric(5, 2),
  year              integer NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  employee_id       uuid    NOT NULL,
  id                uuid    NOT NULL,
  leave_type_id     uuid    NOT NULL,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid
);


ALTER TABLE public.leave_balances OWNER TO hrms;

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.leave_requests
(
  end_date            date                  NOT NULL,
  is_deleted          boolean               NOT NULL,
  is_half_day         boolean,
  start_date          date                  NOT NULL,
  total_days          numeric(5, 2)         NOT NULL,
  applied_on          timestamp(6) without time zone NOT NULL,
  approved_on         timestamp(6) without time zone,
  cancelled_on        timestamp(6) without time zone,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  approved_by         uuid,
  created_by          uuid,
  employee_id         uuid                  NOT NULL,
  id                  uuid                  NOT NULL,
  leave_type_id       uuid                  NOT NULL,
  tenant_id           uuid                  NOT NULL,
  updated_by          uuid,
  half_day_period     character varying(20),
  request_number      character varying(50) NOT NULL,
  status              character varying(50) NOT NULL,
  cancellation_reason text,
  comments            text,
  document_path       text,
  reason              text                  NOT NULL,
  rejection_reason    text,
  CONSTRAINT leave_requests_half_day_period_check CHECK (((half_day_period)::text = ANY ((ARRAY['MORNING':: character varying, 'AFTERNOON':: character varying])::text[])
) ),
    CONSTRAINT leave_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.leave_requests OWNER TO hrms;

--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.leave_types
(
  accrual_rate             numeric(5, 2),
  annual_quota             numeric(5, 2),
  applicable_after_days    integer,
  is_active                boolean,
  is_carry_forward_allowed boolean,
  is_deleted               boolean                NOT NULL,
  is_encashable            boolean,
  is_paid                  boolean,
  max_carry_forward_days   numeric(5, 2),
  max_consecutive_days     integer,
  max_days_per_request     integer,
  min_days_notice          integer,
  requires_document        boolean,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  id                       uuid                   NOT NULL,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  color_code               character varying(20),
  gender_specific          character varying(20),
  accrual_type             character varying(50),
  leave_code               character varying(50)  NOT NULL,
  leave_name               character varying(100) NOT NULL,
  description              text,
  CONSTRAINT leave_types_accrual_type_check CHECK (((accrual_type)::text = ANY ((ARRAY['MONTHLY':: character varying, 'QUARTERLY':: character varying, 'YEARLY':: character varying, 'NONE':: character varying])::text[])
) ),
    CONSTRAINT leave_types_gender_specific_check CHECK (((gender_specific)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying, 'ALL'::character varying])::text[])))
);


ALTER TABLE public.leave_types OWNER TO hrms;

--
-- Name: letter_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.letter_templates
(
  include_company_logo   boolean,
  include_signature      boolean,
  is_active              boolean,
  is_deleted             boolean                NOT NULL,
  is_system_template     boolean,
  requires_approval      boolean,
  template_version       integer,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  id                     uuid                   NOT NULL,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  available_placeholders text,
  category               character varying(255) NOT NULL,
  code                   character varying(255) NOT NULL,
  css_styles             text,
  description            text,
  footer_html            text,
  header_html            text,
  name                   character varying(255) NOT NULL,
  signatory_designation  character varying(255),
  signatory_name         character varying(255),
  signature_title        character varying(255),
  template_content       text                   NOT NULL,
  CONSTRAINT letter_templates_category_check CHECK (((category)::text = ANY ((ARRAY['OFFER':: character varying, 'APPOINTMENT':: character varying, 'CONFIRMATION':: character varying, 'PROMOTION':: character varying, 'TRANSFER':: character varying, 'SALARY_REVISION':: character varying, 'WARNING':: character varying, 'TERMINATION':: character varying, 'RESIGNATION_ACCEPTANCE':: character varying, 'EXPERIENCE':: character varying, 'RELIEVING':: character varying, 'SALARY_CERTIFICATE':: character varying, 'EMPLOYMENT_CERTIFICATE':: character varying, 'BONAFIDE':: character varying, 'VISA_SUPPORT':: character varying, 'BANK_LETTER':: character varying, 'ADDRESS_PROOF':: character varying, 'INTERNSHIP':: character varying, 'TRAINING_COMPLETION':: character varying, 'APPRECIATION':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.letter_templates OWNER TO hrms;

--
-- Name: lms_certificates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_certificates
(
  completion_date    date,
  expiry_date        date,
  is_active          boolean,
  is_deleted         boolean               NOT NULL,
  score_achieved     integer,
  created_at         timestamp(6) without time zone NOT NULL,
  issued_at          timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  course_id          uuid                  NOT NULL,
  created_by         uuid,
  employee_id        uuid                  NOT NULL,
  enrollment_id      uuid                  NOT NULL,
  id                 uuid                  NOT NULL,
  issued_by          uuid,
  template_id        uuid,
  tenant_id          uuid                  NOT NULL,
  updated_by         uuid,
  certificate_number character varying(50) NOT NULL,
  employee_name      character varying(200),
  issuer_name        character varying(200),
  certificate_url    character varying(1000),
  verification_url   character varying(1000),
  additional_info    text,
  course_title       character varying(255)
);


ALTER TABLE public.lms_certificates OWNER TO hrms;

--
-- Name: lms_content_progress; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_content_progress
(
  current_page           integer,
  is_deleted             boolean NOT NULL,
  progress_percentage    numeric(5, 2),
  time_spent_seconds     integer,
  total_pages            integer,
  video_position_seconds integer,
  completed_at           timestamp(6) without time zone,
  created_at             timestamp(6) without time zone NOT NULL,
  started_at             timestamp(6) without time zone,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  content_id             uuid    NOT NULL,
  created_by             uuid,
  enrollment_id          uuid    NOT NULL,
  id                     uuid    NOT NULL,
  module_id              uuid    NOT NULL,
  tenant_id              uuid    NOT NULL,
  updated_by             uuid,
  status                 character varying(30),
  CONSTRAINT lms_content_progress_status_check CHECK (((status)::text = ANY ((ARRAY['NOT_STARTED':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying])::text[])
) )
);


ALTER TABLE public.lms_content_progress OWNER TO hrms;

--
-- Name: lms_course_enrollments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_course_enrollments
(
  is_deleted               boolean NOT NULL,
  progress_percentage      numeric(5, 2),
  quiz_attempts            integer,
  quiz_passed              boolean,
  quiz_score               numeric(5, 2),
  rating                   numeric(3, 2),
  total_time_spent_minutes integer,
  certificate_issued_at    timestamp(6) without time zone,
  completed_at             timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  due_date                 timestamp(6) without time zone,
  enrolled_at              timestamp(6) without time zone,
  last_accessed_at         timestamp(6) without time zone,
  started_at               timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  certificate_id           uuid,
  course_id                uuid    NOT NULL,
  created_by               uuid,
  employee_id              uuid    NOT NULL,
  enrolled_by              uuid,
  id                       uuid    NOT NULL,
  last_content_id          uuid,
  last_module_id           uuid,
  tenant_id                uuid    NOT NULL,
  updated_by               uuid,
  status                   character varying(30),
  feedback                 text,
  CONSTRAINT lms_course_enrollments_status_check CHECK (((status)::text = ANY ((ARRAY['ENROLLED':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'FAILED':: character varying, 'EXPIRED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.lms_course_enrollments OWNER TO hrms;

--
-- Name: lms_course_modules; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_course_modules
(
  duration_minutes  integer,
  is_deleted        boolean                NOT NULL,
  is_mandatory      boolean,
  order_index       integer,
  unlock_after_days integer,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  course_id         uuid                   NOT NULL,
  created_by        uuid,
  id                uuid                   NOT NULL,
  tenant_id         uuid                   NOT NULL,
  updated_by        uuid,
  description       text,
  title             character varying(255) NOT NULL
);


ALTER TABLE public.lms_course_modules OWNER TO hrms;

--
-- Name: lms_courses; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_courses
(
  avg_rating              numeric(3, 2),
  completion_deadline     date,
  duration_hours          numeric(5, 2),
  enrollment_deadline     date,
  is_certificate_enabled  boolean,
  is_deleted              boolean                NOT NULL,
  is_mandatory            boolean,
  is_self_paced           boolean,
  max_attempts            integer,
  passing_score           integer,
  total_enrollments       integer,
  total_ratings           integer,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  category_id             uuid,
  certificate_template_id uuid,
  created_by              uuid,
  id                      uuid                   NOT NULL,
  instructor_id           uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  difficulty_level        character varying(20),
  status                  character varying(30),
  code                    character varying(100),
  instructor_name         character varying(200),
  preview_video_url       character varying(500),
  short_description       character varying(500),
  tags                    character varying(500),
  thumbnail_url           character varying(500),
  description             text,
  prerequisites           text,
  skills_covered          text,
  title                   character varying(255) NOT NULL,
  CONSTRAINT lms_courses_difficulty_level_check CHECK (((difficulty_level)::text = ANY ((ARRAY['BEGINNER':: character varying, 'INTERMEDIATE':: character varying, 'ADVANCED':: character varying, 'EXPERT':: character varying])::text[])
) ),
    CONSTRAINT lms_courses_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'UNDER_REVIEW'::character varying, 'PUBLISHED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE public.lms_courses OWNER TO hrms;

--
-- Name: lms_learning_path_courses; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_learning_path_courses
(
  is_required boolean NOT NULL,
  order_index integer NOT NULL,
  created_at  timestamp(6) without time zone NOT NULL,
  course_id   uuid    NOT NULL,
  id          uuid    NOT NULL,
  path_id     uuid,
  tenant_id   uuid    NOT NULL
);


ALTER TABLE public.lms_learning_path_courses OWNER TO hrms;

--
-- Name: lms_learning_paths; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_learning_paths
(
  estimated_hours      integer,
  is_deleted           boolean                NOT NULL,
  is_mandatory         boolean                NOT NULL,
  is_published         boolean                NOT NULL,
  total_courses        integer,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  prerequisite_path_id uuid,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  difficulty_level     character varying(30),
  thumbnail_url        character varying(500),
  description          text,
  target_roles         text,
  title                character varying(255) NOT NULL,
  CONSTRAINT lms_learning_paths_difficulty_level_check CHECK (((difficulty_level)::text = ANY ((ARRAY['BEGINNER':: character varying, 'INTERMEDIATE':: character varying, 'ADVANCED':: character varying, 'EXPERT':: character varying])::text[])
) )
);


ALTER TABLE public.lms_learning_paths OWNER TO hrms;

--
-- Name: lms_module_contents; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_module_contents
(
  completion_required     boolean,
  duration_minutes        integer,
  is_deleted              boolean                NOT NULL,
  is_mandatory            boolean,
  order_index             integer,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  id                      uuid                   NOT NULL,
  module_id               uuid                   NOT NULL,
  quiz_id                 uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  document_type           character varying(20),
  content_type            character varying(30)  NOT NULL,
  video_provider          character varying(50),
  document_url            character varying(1000),
  external_url            character varying(1000),
  scorm_package_url       character varying(1000),
  video_url               character varying(1000),
  assignment_instructions text,
  text_content            text,
  title                   character varying(255) NOT NULL,
  CONSTRAINT lms_module_contents_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['VIDEO':: character varying, 'DOCUMENT':: character varying, 'TEXT':: character varying, 'QUIZ':: character varying, 'ASSIGNMENT':: character varying, 'SCORM':: character varying, 'EXTERNAL_LINK':: character varying, 'LIVE_SESSION':: character varying])::text[])
) )
);


ALTER TABLE public.lms_module_contents OWNER TO hrms;

--
-- Name: lms_quiz_attempts; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_quiz_attempts
(
  attempt_number     integer,
  is_deleted         boolean               NOT NULL,
  max_score          integer,
  passed             boolean,
  passing_score      integer,
  score              integer,
  time_taken_seconds integer,
  completed_at       timestamp(6) without time zone,
  created_at         timestamp(6) without time zone NOT NULL,
  started_at         timestamp(6) without time zone,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  attempted_by       uuid,
  created_by         uuid,
  employee_id        uuid                  NOT NULL,
  enrollment_id      uuid                  NOT NULL,
  id                 uuid                  NOT NULL,
  quiz_id            uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  updated_by         uuid,
  status             character varying(30) NOT NULL,
  answers            text,
  feedback           text,
  CONSTRAINT lms_quiz_attempts_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'TIMED_OUT':: character varying, 'ABANDONED':: character varying])::text[])
) )
);


ALTER TABLE public.lms_quiz_attempts OWNER TO hrms;

--
-- Name: lms_quiz_questions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_quiz_questions
(
  correct_answer     boolean,
  is_deleted         boolean               NOT NULL,
  is_mandatory       boolean,
  order_index        integer,
  points             integer,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                  NOT NULL,
  quiz_id            uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  updated_by         uuid,
  question_type      character varying(30) NOT NULL,
  question_image_url character varying(500),
  correct_answers    text,
  explanation        text,
  keywords           text,
  options            text,
  question_text      text                  NOT NULL,
  CONSTRAINT lms_quiz_questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['SINGLE_CHOICE':: character varying, 'MULTIPLE_CHOICE':: character varying, 'TRUE_FALSE':: character varying, 'FILL_BLANK':: character varying, 'ESSAY':: character varying, 'MATCHING':: character varying])::text[])
) )
);


ALTER TABLE public.lms_quiz_questions OWNER TO hrms;

--
-- Name: lms_quizzes; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.lms_quizzes
(
  is_active              boolean,
  is_deleted             boolean                NOT NULL,
  max_attempts           integer,
  passing_score          integer,
  questions_per_attempt  integer,
  show_correct_answers   boolean,
  show_score_immediately boolean,
  shuffle_options        boolean,
  shuffle_questions      boolean,
  time_limit_minutes     integer,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  course_id              uuid,
  created_by             uuid,
  id                     uuid                   NOT NULL,
  module_id              uuid,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  instructions           text,
  title                  character varying(255) NOT NULL
);


ALTER TABLE public.lms_quizzes OWNER TO hrms;

--
-- Name: loan_repayments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.loan_repayments
(
  due_date                  date,
  installment_number        integer,
  interest_amount           numeric(12, 2),
  is_deleted                boolean NOT NULL,
  is_prepayment             boolean,
  late_fee                  numeric(10, 2),
  outstanding_after_payment numeric(12, 2),
  paid_amount               numeric(12, 2),
  payment_date              date,
  principal_amount          numeric(12, 2),
  total_amount              numeric(12, 2),
  created_at                timestamp(6) without time zone NOT NULL,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  created_by                uuid,
  employee_id               uuid    NOT NULL,
  id                        uuid    NOT NULL,
  loan_id                   uuid    NOT NULL,
  payroll_run_id            uuid,
  tenant_id                 uuid    NOT NULL,
  updated_by                uuid,
  payment_mode              character varying(255),
  payment_reference         character varying(255),
  remarks                   character varying(255),
  status                    character varying(255),
  CONSTRAINT loan_repayments_payment_mode_check CHECK (((payment_mode)::text = ANY ((ARRAY['SALARY_DEDUCTION':: character varying, 'BANK_TRANSFER':: character varying, 'CASH':: character varying, 'CHEQUE':: character varying])::text[])
) ),
    CONSTRAINT loan_repayments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PAID'::character varying, 'PARTIAL'::character varying, 'OVERDUE'::character varying, 'WAIVED'::character varying])::text[])))
);


ALTER TABLE public.loan_repayments OWNER TO hrms;

--
-- Name: meeting_action_items; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.meeting_action_items
(
  due_date                date,
  is_carried_over         boolean,
  is_deleted              boolean                NOT NULL,
  reminder_sent           boolean,
  completed_at            timestamp(6) without time zone,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  assignee_id             uuid                   NOT NULL,
  carried_from_meeting_id uuid,
  created_by              uuid,
  id                      uuid                   NOT NULL,
  meeting_id              uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  assignee_role           character varying(20),
  priority                character varying(20),
  status                  character varying(20)  NOT NULL,
  title                   character varying(300) NOT NULL,
  completion_notes        text,
  description             text,
  CONSTRAINT meeting_action_items_assignee_role_check CHECK (((assignee_role)::text = ANY ((ARRAY['MANAGER':: character varying, 'EMPLOYEE':: character varying])::text[])
) ),
    CONSTRAINT meeting_action_items_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT meeting_action_items_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'CARRIED_OVER'::character varying])::text[])))
);


ALTER TABLE public.meeting_action_items OWNER TO hrms;

--
-- Name: meeting_agenda_items; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.meeting_agenda_items
(
  duration_minutes integer,
  is_deleted       boolean                NOT NULL,
  is_discussed     boolean,
  item_order       integer                NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  added_by_id      uuid                   NOT NULL,
  created_by       uuid,
  id               uuid                   NOT NULL,
  meeting_id       uuid                   NOT NULL,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  added_by         character varying(20)  NOT NULL,
  priority         character varying(20),
  category         character varying(30),
  title            character varying(300) NOT NULL,
  description      text,
  discussion_notes text,
  CONSTRAINT meeting_agenda_items_added_by_check CHECK (((added_by)::text = ANY ((ARRAY['MANAGER':: character varying, 'EMPLOYEE':: character varying])::text[])
) ),
    CONSTRAINT meeting_agenda_items_category_check CHECK (((category)::text = ANY ((ARRAY['WORK_UPDATES'::character varying, 'BLOCKERS'::character varying, 'FEEDBACK'::character varying, 'CAREER_GROWTH'::character varying, 'GOALS'::character varying, 'WELLBEING'::character varying, 'RECOGNITION'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT meeting_agenda_items_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[])))
);


ALTER TABLE public.meeting_agenda_items OWNER TO hrms;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.milestones
(
  is_celebrated        boolean,
  is_deleted           boolean                NOT NULL,
  milestone_date       date,
  notification_sent    boolean,
  wishes_count         integer,
  years_completed      integer,
  celebrated_at        timestamp(6) without time zone,
  created_at           timestamp(6) without time zone NOT NULL,
  notification_sent_at timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  employee_id          uuid                   NOT NULL,
  id                   uuid                   NOT NULL,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  description          text,
  title                character varying(255) NOT NULL,
  type                 character varying(255) NOT NULL,
  CONSTRAINT milestones_type_check CHECK (((type)::text = ANY ((ARRAY['BIRTHDAY':: character varying, 'WORK_ANNIVERSARY':: character varying, 'JOINING':: character varying, 'PROMOTION':: character varying, 'PROJECT_COMPLETION':: character varying, 'CERTIFICATION':: character varying, 'AWARD':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.milestones OWNER TO hrms;

--
-- Name: monthly_statutory_contributions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.monthly_statutory_contributions
(
  eps_contribution          numeric(10, 2),
  esi_employee_contribution numeric(10, 2),
  esi_employer_contribution numeric(10, 2),
  esi_wage                  numeric(10, 2),
  gross_salary              numeric(12, 2),
  month                     integer NOT NULL,
  pf_employee_contribution  numeric(10, 2),
  pf_employer_contribution  numeric(10, 2),
  pf_wage                   numeric(10, 2),
  professional_tax          numeric(10, 2),
  tds_deducted              numeric(10, 2),
  vpf_contribution          numeric(10, 2),
  year                      integer NOT NULL,
  created_at                timestamp(6) without time zone NOT NULL,
  updated_at                timestamp(6) without time zone,
  employee_id               uuid    NOT NULL,
  id                        uuid    NOT NULL,
  payslip_id                uuid    NOT NULL,
  tenant_id                 uuid    NOT NULL
);


ALTER TABLE public.monthly_statutory_contributions OWNER TO hrms;

--
-- Name: multi_channel_notifications; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.multi_channel_notifications
(
  is_deleted       boolean                NOT NULL,
  is_group_summary boolean,
  retry_count      integer,
  created_at       timestamp(6) without time zone NOT NULL,
  delivered_at     timestamp(6) without time zone,
  last_retry_at    timestamp(6) without time zone,
  read_at          timestamp(6) without time zone,
  scheduled_at     timestamp(6) without time zone,
  sent_at          timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  id               uuid                   NOT NULL,
  recipient_id     uuid                   NOT NULL,
  reference_id     uuid,
  template_id      uuid,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  subject          character varying(500),
  action_url       character varying(255),
  body             text,
  channel          character varying(255) NOT NULL,
  context_data     text,
  error_message    character varying(255),
  external_id      character varying(255),
  group_key        character varying(255),
  icon             character varying(255),
  priority         character varying(255) NOT NULL,
  recipient_email  character varying(255),
  recipient_name   character varying(255),
  recipient_phone  character varying(255),
  reference_type   character varying(255),
  status           character varying(255) NOT NULL,
  template_code    character varying(255),
  title            character varying(255),
  CONSTRAINT multi_channel_notifications_channel_check CHECK (((channel)::text = ANY ((ARRAY['EMAIL':: character varying, 'SMS':: character varying, 'PUSH':: character varying, 'IN_APP':: character varying, 'SLACK':: character varying, 'TEAMS':: character varying, 'WHATSAPP':: character varying, 'WEBHOOK':: character varying])::text[])
) ),
    CONSTRAINT multi_channel_notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT multi_channel_notifications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'QUEUED'::character varying, 'SENT'::character varying, 'DELIVERED'::character varying, 'READ'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.multi_channel_notifications OWNER TO hrms;

--
-- Name: notification_channel_configs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.notification_channel_configs
(
  exponential_backoff      boolean,
  is_deleted               boolean                NOT NULL,
  is_enabled               boolean,
  max_retries              integer,
  rate_limit_per_day       integer,
  rate_limit_per_hour      integer,
  rate_limit_per_minute    integer,
  retry_delay_seconds      integer,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  id                       uuid                   NOT NULL,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  channel                  character varying(255) NOT NULL,
  config_json              text,
  email_from_address       character varying(255),
  email_from_name          character varying(255),
  email_reply_to           character varying(255),
  provider                 character varying(255),
  push_sender_id           character varying(255),
  push_server_key          character varying(255),
  slack_bot_token          character varying(255),
  slack_default_channel    character varying(255),
  slack_workspace_id       character varying(255),
  sms_from_number          character varying(255),
  teams_tenant_id          character varying(255),
  teams_webhook_url        character varying(255),
  webhook_headers          text,
  webhook_secret           character varying(255),
  webhook_url              character varying(255),
  whatsapp_business_id     character varying(255),
  whatsapp_phone_number_id character varying(255),
  CONSTRAINT notification_channel_configs_channel_check CHECK (((channel)::text = ANY ((ARRAY['EMAIL':: character varying, 'SMS':: character varying, 'PUSH':: character varying, 'IN_APP':: character varying, 'SLACK':: character varying, 'TEAMS':: character varying, 'WHATSAPP':: character varying, 'WEBHOOK':: character varying])::text[])
) )
);


ALTER TABLE public.notification_channel_configs OWNER TO hrms;

--
-- Name: notification_template_channels; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.notification_template_channels
(
  template_id uuid NOT NULL,
  channel     character varying(255),
  CONSTRAINT notification_template_channels_channel_check CHECK (((channel)::text = ANY ((ARRAY['EMAIL':: character varying, 'SMS':: character varying, 'PUSH':: character varying, 'IN_APP':: character varying, 'SLACK':: character varying, 'TEAMS':: character varying, 'WHATSAPP':: character varying, 'WEBHOOK':: character varying])::text[])
) )
);


ALTER TABLE public.notification_template_channels OWNER TO hrms;

--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.notification_templates
(
  email_html           boolean,
  is_active            boolean,
  is_deleted           boolean                NOT NULL,
  is_system_template   boolean,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  in_app_title         character varying(200),
  push_title           character varying(200),
  email_subject        character varying(500),
  push_body            character varying(500),
  sms_body             character varying(500),
  in_app_body          character varying(1000),
  category             character varying(255) NOT NULL,
  code                 character varying(255) NOT NULL,
  default_priority     character varying(255) NOT NULL,
  description          character varying(255),
  email_body           text,
  event_type           character varying(255) NOT NULL,
  in_app_action_url    character varying(255),
  in_app_icon          character varying(255),
  name                 character varying(255) NOT NULL,
  push_action          character varying(255),
  push_icon            character varying(255),
  slack_message        text,
  teams_message        text,
  webhook_payload      text,
  whatsapp_body        text,
  whatsapp_template_id character varying(255),
  CONSTRAINT notification_templates_default_priority_check CHECK (((default_priority)::text = ANY ((ARRAY['LOW':: character varying, 'NORMAL':: character varying, 'HIGH':: character varying, 'URGENT':: character varying])::text[])
) )
);


ALTER TABLE public.notification_templates OWNER TO hrms;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.notifications
(
  is_deleted          boolean                NOT NULL,
  is_read             boolean                NOT NULL,
  created_at          timestamp(6) without time zone NOT NULL,
  read_at             timestamp(6) without time zone,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  related_entity_id   uuid,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  user_id             uuid                   NOT NULL,
  priority            character varying(20)  NOT NULL,
  type                character varying(50)  NOT NULL,
  related_entity_type character varying(100),
  title               character varying(200) NOT NULL,
  action_url          character varying(500),
  message             text                   NOT NULL,
  metadata            text,
  CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'NORMAL':: character varying, 'HIGH':: character varying, 'URGENT':: character varying])::text[])
) ),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['LEAVE_APPROVED'::character varying, 'LEAVE_REJECTED'::character varying, 'LEAVE_PENDING'::character varying, 'ATTENDANCE_MARKED'::character varying, 'ATTENDANCE_ALERT'::character varying, 'PAYROLL_GENERATED'::character varying, 'DOCUMENT_UPLOADED'::character varying, 'DOCUMENT_REQUIRED'::character varying, 'ANNOUNCEMENT'::character varying, 'BIRTHDAY'::character varying, 'ANNIVERSARY'::character varying, 'PERFORMANCE_REVIEW_DUE'::character varying, 'EXPENSE_APPROVED'::character varying, 'EXPENSE_REJECTED'::character varying, 'SHIFT_ASSIGNED'::character varying, 'SHIFT_CHANGED'::character varying, 'ROLE_UPDATED'::character varying, 'SYSTEM_ALERT'::character varying, 'TASK_ASSIGNED'::character varying, 'GENERAL'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO hrms;

--
-- Name: nu_applications; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.nu_applications
(
  display_order integer,
  is_deleted    boolean                NOT NULL,
  is_system_app boolean                NOT NULL,
  created_at    timestamp(6) without time zone NOT NULL,
  updated_at    timestamp(6) without time zone NOT NULL,
  version       bigint,
  created_by    uuid,
  id            uuid                   NOT NULL,
  updated_by    uuid,
  app_version   character varying(20),
  code          character varying(20)  NOT NULL,
  status        character varying(20)  NOT NULL,
  api_base_path character varying(100),
  name          character varying(100) NOT NULL,
  base_url      character varying(200),
  icon_url      character varying(200),
  description   character varying(1000),
  CONSTRAINT nu_applications_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'INACTIVE':: character varying, 'MAINTENANCE':: character varying, 'DEPRECATED':: character varying])::text[])
) )
);


ALTER TABLE public.nu_applications OWNER TO hrms;

--
-- Name: objectives; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.objectives
(
  end_date                     date                   NOT NULL,
  is_deleted                   boolean                NOT NULL,
  is_stretch_goal              boolean,
  last_check_in_date           date,
  progress_percentage          numeric(5, 2),
  start_date                   date                   NOT NULL,
  weight                       integer,
  created_at                   timestamp(6) without time zone NOT NULL,
  updated_at                   timestamp(6) without time zone NOT NULL,
  version                      bigint,
  aligned_to_company_objective uuid,
  approved_by                  uuid,
  created_by                   uuid,
  cycle_id                     uuid,
  department_id                uuid,
  id                           uuid                   NOT NULL,
  owner_id                     uuid                   NOT NULL,
  parent_objective_id          uuid,
  team_id                      uuid,
  tenant_id                    uuid                   NOT NULL,
  updated_by                   uuid,
  check_in_frequency           character varying(20),
  visibility                   character varying(20),
  objective_level              character varying(30),
  status                       character varying(30),
  title                        character varying(500) NOT NULL,
  description                  text,
  CONSTRAINT objectives_objective_level_check CHECK (((objective_level)::text = ANY ((ARRAY['COMPANY':: character varying, 'DEPARTMENT':: character varying, 'TEAM':: character varying, 'INDIVIDUAL':: character varying])::text[])
) ),
    CONSTRAINT objectives_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'ACTIVE'::character varying, 'ON_TRACK'::character varying, 'AT_RISK'::character varying, 'BEHIND'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.objectives OWNER TO hrms;

--
-- Name: office_locations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.office_locations
(
  allow_remote_checkin   boolean,
  geofence_radius_meters integer                NOT NULL,
  is_active              boolean,
  is_deleted             boolean                NOT NULL,
  is_geofence_enabled    boolean,
  is_headquarters        boolean,
  latitude               numeric(10, 8)         NOT NULL,
  longitude              numeric(11, 8)         NOT NULL,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  id                     uuid                   NOT NULL,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  zip_code               character varying(20),
  location_code          character varying(50)  NOT NULL,
  timezone               character varying(50),
  working_days           character varying(50),
  city                   character varying(100),
  country                character varying(100),
  location_name          character varying(100) NOT NULL,
  state                  character varying(100),
  address                text
);


ALTER TABLE public.office_locations OWNER TO hrms;

--
-- Name: okr_check_ins; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.okr_check_ins
(
  confidence_level  integer,
  is_deleted        boolean NOT NULL,
  new_progress      numeric(5, 2),
  new_value         numeric(19, 2),
  previous_progress numeric(5, 2),
  previous_value    numeric(19, 2),
  check_in_date     timestamp(6) without time zone NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  employee_id       uuid    NOT NULL,
  id                uuid    NOT NULL,
  key_result_id     uuid,
  objective_id      uuid,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid,
  check_in_type     character varying(30),
  blockers          text,
  next_steps        text,
  notes             text,
  CONSTRAINT okr_check_ins_check_in_type_check CHECK (((check_in_type)::text = ANY ((ARRAY['PROGRESS_UPDATE':: character varying, 'STATUS_CHANGE':: character varying, 'WEEKLY_REVIEW':: character varying, 'FINAL_REVIEW':: character varying])::text[])
) )
);


ALTER TABLE public.okr_check_ins OWNER TO hrms;

--
-- Name: onboarding_checklist_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.onboarding_checklist_templates
(
  estimated_days integer,
  is_active      boolean,
  is_default     boolean,
  is_deleted     boolean                NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  department_id  uuid,
  id             uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  applicable_for character varying(255),
  description    text,
  job_level      character varying(255),
  name           character varying(255) NOT NULL,
  CONSTRAINT onboarding_checklist_templates_applicable_for_check CHECK (((applicable_for)::text = ANY ((ARRAY['ALL':: character varying, 'DEPARTMENT_SPECIFIC':: character varying, 'ROLE_SPECIFIC':: character varying, 'LEVEL_SPECIFIC':: character varying])::text[])
) )
);


ALTER TABLE public.onboarding_checklist_templates OWNER TO hrms;

--
-- Name: onboarding_documents; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.onboarding_documents
(
  expiry_date      date,
  is_deleted       boolean                NOT NULL,
  is_mandatory     boolean,
  uploaded_date    date,
  verified_date    date,
  created_at       timestamp(6) without time zone NOT NULL,
  file_size        bigint,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  employee_id      uuid                   NOT NULL,
  id               uuid                   NOT NULL,
  process_id       uuid                   NOT NULL,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  verified_by      uuid,
  document_name    character varying(255) NOT NULL,
  document_type    character varying(255) NOT NULL,
  file_name        character varying(255),
  file_path        character varying(255),
  mime_type        character varying(255),
  rejection_reason character varying(255),
  remarks          text,
  status           character varying(255),
  CONSTRAINT onboarding_documents_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['ID_PROOF':: character varying, 'ADDRESS_PROOF':: character varying, 'EDUCATION_CERTIFICATE':: character varying, 'EXPERIENCE_LETTER':: character varying, 'RELIEVING_LETTER':: character varying, 'SALARY_SLIP':: character varying, 'PAN_CARD':: character varying, 'PASSPORT':: character varying, 'VISA':: character varying, 'BANK_DETAILS':: character varying, 'OFFER_LETTER_SIGNED':: character varying, 'NDA':: character varying, 'EMERGENCY_CONTACT':: character varying, 'MEDICAL_CERTIFICATE':: character varying, 'PHOTO':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT onboarding_documents_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'UPLOADED'::character varying, 'VERIFIED'::character varying, 'REJECTED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.onboarding_documents OWNER TO hrms;

--
-- Name: onboarding_processes; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.onboarding_processes
(
  actual_completion_date   date,
  completion_percentage    integer,
  expected_completion_date date,
  start_date               date,
  created_at               timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone,
  version                  bigint,
  assigned_buddy_id        uuid,
  employee_id              uuid NOT NULL,
  id                       uuid NOT NULL,
  tenant_id                uuid NOT NULL,
  process_type             character varying(20),
  status                   character varying(20),
  notes                    text,
  CONSTRAINT onboarding_processes_process_type_check CHECK (((process_type)::text = ANY ((ARRAY['ONBOARDING':: character varying, 'OFFBOARDING':: character varying])::text[])
) ),
    CONSTRAINT onboarding_processes_status_check CHECK (((status)::text = ANY ((ARRAY['NOT_STARTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.onboarding_processes OWNER TO hrms;

--
-- Name: onboarding_tasks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.onboarding_tasks
(
  completed_date       date,
  due_date             date,
  is_deleted           boolean                NOT NULL,
  is_mandatory         boolean,
  order_sequence       integer,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  assigned_to          uuid,
  completed_by         uuid,
  created_by           uuid,
  dependent_on_task_id uuid,
  employee_id          uuid                   NOT NULL,
  id                   uuid                   NOT NULL,
  process_id           uuid                   NOT NULL,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  category             character varying(255),
  description          text,
  priority             character varying(255),
  remarks              text,
  status               character varying(255),
  task_name            character varying(255) NOT NULL,
  CONSTRAINT onboarding_tasks_category_check CHECK (((category)::text = ANY ((ARRAY['DOCUMENTATION':: character varying, 'IT_SETUP':: character varying, 'HR_FORMALITIES':: character varying, 'TRAINING':: character varying, 'TEAM_INTRODUCTION':: character varying, 'WORKSPACE_SETUP':: character varying, 'ACCESS_PERMISSIONS':: character varying, 'COMPLIANCE':: character varying, 'BENEFITS_ENROLLMENT':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT onboarding_tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT onboarding_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'SKIPPED'::character varying, 'BLOCKED'::character varying])::text[])))
);


ALTER TABLE public.onboarding_tasks OWNER TO hrms;

--
-- Name: onboarding_template_tasks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.onboarding_template_tasks
(
  estimated_days_from_start integer,
  is_deleted                boolean                NOT NULL,
  is_mandatory              boolean,
  order_sequence            integer,
  created_at                timestamp(6) without time zone NOT NULL,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  created_by                uuid,
  id                        uuid                   NOT NULL,
  template_id               uuid                   NOT NULL,
  tenant_id                 uuid                   NOT NULL,
  updated_by                uuid,
  category                  character varying(255),
  description               text,
  priority                  character varying(255),
  task_name                 character varying(255) NOT NULL,
  CONSTRAINT onboarding_template_tasks_category_check CHECK (((category)::text = ANY ((ARRAY['DOCUMENTATION':: character varying, 'IT_SETUP':: character varying, 'HR_FORMALITIES':: character varying, 'TRAINING':: character varying, 'TEAM_INTRODUCTION':: character varying, 'WORKSPACE_SETUP':: character varying, 'ACCESS_PERMISSIONS':: character varying, 'COMPLIANCE':: character varying, 'BENEFITS_ENROLLMENT':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT onboarding_template_tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[])))
);


ALTER TABLE public.onboarding_template_tasks OWNER TO hrms;

--
-- Name: one_on_one_meetings; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.one_on_one_meetings
(
  duration_minutes        integer,
  employee_rating         integer,
  end_time                time(6) without time zone,
  is_deleted              boolean                NOT NULL,
  is_recurring            boolean,
  meeting_date            date                   NOT NULL,
  recurrence_end_date     date,
  reminder_minutes_before integer,
  reminder_sent           boolean,
  start_time              time(6) without time zone NOT NULL,
  actual_end_time         timestamp(6) without time zone,
  actual_start_time       timestamp(6) without time zone,
  cancelled_at            timestamp(6) without time zone,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  cancelled_by            uuid,
  created_by              uuid,
  employee_id             uuid                   NOT NULL,
  id                      uuid                   NOT NULL,
  manager_id              uuid                   NOT NULL,
  parent_meeting_id       uuid,
  rescheduled_from        uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  recurrence_pattern      character varying(20),
  status                  character varying(20)  NOT NULL,
  meeting_type            character varying(30),
  location                character varying(200),
  title                   character varying(200) NOT NULL,
  cancellation_reason     character varying(500),
  meeting_link            character varying(500),
  description             text,
  employee_feedback       text,
  employee_notes          text,
  manager_notes           text,
  meeting_summary         text,
  shared_notes            text,
  CONSTRAINT one_on_one_meetings_meeting_type_check CHECK (((meeting_type)::text = ANY ((ARRAY['REGULAR':: character varying, 'PERFORMANCE':: character varying, 'GOAL_REVIEW':: character varying, 'CAREER':: character varying, 'FEEDBACK':: character varying, 'ONBOARDING':: character varying, 'PROBATION':: character varying, 'EXIT':: character varying])::text[])
) ),
    CONSTRAINT one_on_one_meetings_recurrence_pattern_check CHECK (((recurrence_pattern)::text = ANY ((ARRAY['WEEKLY'::character varying, 'BI_WEEKLY'::character varying, 'MONTHLY'::character varying, 'QUARTERLY'::character varying])::text[]))),
    CONSTRAINT one_on_one_meetings_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'RESCHEDULED'::character varying, 'NO_SHOW'::character varying])::text[])))
);


ALTER TABLE public.one_on_one_meetings OWNER TO hrms;

--
-- Name: organization_units; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.organization_units
(
  employee_count integer,
  is_active      boolean,
  is_deleted     boolean                NOT NULL,
  level          integer,
  sort_order     integer,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  head_id        uuid,
  id             uuid                   NOT NULL,
  parent_id      uuid,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  code           character varying(255) NOT NULL,
  cost_center    character varying(255),
  description    text,
  location       character varying(255),
  name           character varying(255) NOT NULL,
  path           character varying(255),
  type           character varying(255) NOT NULL,
  CONSTRAINT organization_units_type_check CHECK (((type)::text = ANY ((ARRAY['COMPANY':: character varying, 'DIVISION':: character varying, 'DEPARTMENT':: character varying, 'TEAM':: character varying, 'UNIT':: character varying, 'PROJECT':: character varying, 'BRANCH':: character varying, 'REGION':: character varying])::text[])
) )
);


ALTER TABLE public.organization_units OWNER TO hrms;

--
-- Name: overtime_policies; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.overtime_policies
(
  auto_approve_limit_hours    numeric(5, 2),
  comp_time_allowed           boolean,
  comp_time_expiry_days       integer,
  comp_time_multiplier        numeric(3, 2),
  consecutive_day_multiplier  numeric(3, 2),
  consecutive_day_threshold   integer,
  count_break_time            boolean,
  daily_max_ot_hours          numeric(5, 2),
  daily_ot_multiplier         numeric(3, 2),
  daily_threshold_hours       numeric(5, 2),
  double_time_multiplier      numeric(3, 2),
  double_time_threshold_hours numeric(5, 2),
  holiday_ot_multiplier       numeric(3, 2),
  is_active                   boolean,
  is_default                  boolean,
  max_comp_time_balance       numeric(5, 2),
  minimum_ot_minutes          integer,
  night_shift_ot_multiplier   numeric(3, 2),
  requires_pre_approval       boolean,
  round_to_nearest_minutes    integer,
  weekend_ot_multiplier       numeric(3, 2),
  weekly_max_ot_hours         numeric(5, 2),
  weekly_ot_multiplier        numeric(3, 2),
  weekly_threshold_hours      numeric(5, 2),
  created_at                  timestamp(6) without time zone NOT NULL,
  updated_at                  timestamp(6) without time zone NOT NULL,
  version                     bigint,
  created_by                  uuid,
  department_id               uuid,
  id                          uuid                   NOT NULL,
  tenant_id                   uuid                   NOT NULL,
  updated_by                  uuid,
  policy_code                 character varying(50)  NOT NULL,
  policy_name                 character varying(100) NOT NULL,
  description                 text
);


ALTER TABLE public.overtime_policies OWNER TO hrms;

--
-- Name: overtime_rate_tiers; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.overtime_rate_tiers
(
  hours_threshold integer                NOT NULL,
  multiplier      numeric(38, 2)         NOT NULL,
  tier_order      integer                NOT NULL,
  id              uuid                   NOT NULL,
  policy_id       uuid                   NOT NULL,
  tier_name       character varying(255) NOT NULL,
  tier_type       character varying(255),
  CONSTRAINT overtime_rate_tiers_tier_type_check CHECK (((tier_type)::text = ANY ((ARRAY['STANDARD':: character varying, 'EXTENDED':: character varying, 'DOUBLE_TIME':: character varying, 'WEEKEND':: character varying, 'HOLIDAY':: character varying, 'NIGHT':: character varying])::text[])
) )
);


ALTER TABLE public.overtime_rate_tiers OWNER TO hrms;

--
-- Name: overtime_records; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.overtime_records
(
  actual_hours         numeric(5, 2)         NOT NULL,
  auto_calculated      boolean,
  effective_hours      numeric(5, 2)         NOT NULL,
  is_pre_approved      boolean,
  multiplier           numeric(3, 2)         NOT NULL,
  overtime_date        date                  NOT NULL,
  overtime_hours       numeric(5, 2)         NOT NULL,
  processed_in_payroll boolean,
  regular_hours        numeric(5, 2)         NOT NULL,
  approved_at          timestamp(6) without time zone,
  created_at           timestamp(6) without time zone NOT NULL,
  processed_at         timestamp(6) without time zone,
  rejected_at          timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  approved_by          uuid,
  attendance_record_id uuid,
  created_by           uuid,
  employee_id          uuid                  NOT NULL,
  id                   uuid                  NOT NULL,
  payroll_run_id       uuid,
  rejected_by          uuid,
  shift_id             uuid,
  tenant_id            uuid                  NOT NULL,
  updated_by           uuid,
  overtime_type        character varying(20) NOT NULL,
  status               character varying(20) NOT NULL,
  notes                text,
  rejection_reason     text,
  CONSTRAINT overtime_records_overtime_type_check CHECK (((overtime_type)::text = ANY ((ARRAY['REGULAR':: character varying, 'WEEKEND':: character varying, 'HOLIDAY':: character varying, 'NIGHT':: character varying, 'EXTENDED':: character varying])::text[])
) ),
    CONSTRAINT overtime_records_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PROCESSED'::character varying, 'PAID'::character varying])::text[])))
);


ALTER TABLE public.overtime_records OWNER TO hrms;

--
-- Name: overtime_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.overtime_requests
(
  actual_end_time      time(6) without time zone,
  actual_hours         numeric(38, 2),
  actual_start_time    time(6) without time zone,
  approved_amount      numeric(38, 2),
  base_hourly_rate     numeric(38, 2),
  calculated_amount    numeric(38, 2),
  comp_time_hours      numeric(38, 2),
  is_deleted           boolean                NOT NULL,
  is_holiday           boolean                NOT NULL,
  is_night_shift       boolean                NOT NULL,
  is_weekend           boolean                NOT NULL,
  overtime_date        date                   NOT NULL,
  overtime_multiplier  numeric(38, 2),
  payment_date         date,
  planned_end_time     time(6) without time zone,
  planned_hours        numeric(38, 2),
  planned_start_time   time(6) without time zone,
  processed_in_payroll boolean                NOT NULL,
  take_as_comp_time    boolean                NOT NULL,
  approved_at          timestamp(6) without time zone,
  created_at           timestamp(6) without time zone NOT NULL,
  rejected_at          timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  approved_by          uuid,
  created_by           uuid,
  employee_id          uuid                   NOT NULL,
  id                   uuid                   NOT NULL,
  payroll_run_id       uuid,
  policy_id            uuid,
  project_id           uuid,
  rejected_by          uuid,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  approval_comments    character varying(255),
  holiday_name         character varying(255),
  project_code         character varying(255),
  reason               character varying(255) NOT NULL,
  rejection_reason     character varying(255),
  request_number       character varying(255) NOT NULL,
  request_type         character varying(255) NOT NULL,
  status               character varying(255) NOT NULL,
  task_description     character varying(255),
  CONSTRAINT overtime_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['PRE_APPROVAL':: character varying, 'POST_FACTO':: character varying, 'AUTOMATIC':: character varying])::text[])
) ),
    CONSTRAINT overtime_requests_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying, 'PAYMENT_PENDING'::character varying, 'PAID'::character varying, 'CONVERTED_TO_COMP_TIME'::character varying])::text[])))
);


ALTER TABLE public.overtime_requests OWNER TO hrms;

--
-- Name: payment_batches; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payment_batches
(
  failed_count      integer,
  is_deleted        boolean                NOT NULL,
  success_count     integer,
  total_amount      numeric(15, 2)         NOT NULL,
  transaction_count integer                NOT NULL,
  completed_at      timestamp(6) without time zone,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  completed_by      uuid,
  created_by        uuid,
  id                uuid                   NOT NULL,
  initiated_by      uuid                   NOT NULL,
  payroll_run_id    uuid,
  tenant_id         uuid                   NOT NULL,
  updated_by        uuid,
  status            character varying(50)  NOT NULL,
  type              character varying(50)  NOT NULL,
  batch_ref         character varying(100) NOT NULL,
  metadata          jsonb,
  CONSTRAINT payment_batches_status_check CHECK (((status)::text = ANY ((ARRAY['INITIATED':: character varying, 'PROCESSING':: character varying, 'COMPLETED':: character varying, 'PARTIAL_SUCCESS':: character varying, 'FAILED':: character varying, 'CANCELLED':: character varying])::text[])
) ),
    CONSTRAINT payment_batches_type_check CHECK (((type)::text = ANY ((ARRAY['PAYROLL'::character varying, 'EXPENSE_REIMBURSEMENT'::character varying, 'LOAN'::character varying, 'BENEFIT_PAYMENT'::character varying])::text[])))
);


ALTER TABLE public.payment_batches OWNER TO hrms;

--
-- Name: payment_configs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payment_configs
(
  is_active         boolean                NOT NULL,
  is_deleted        boolean                NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  id                uuid                   NOT NULL,
  tenant_id         uuid                   NOT NULL,
  updated_by        uuid,
  provider          character varying(50)  NOT NULL,
  api_key_encrypted text                   NOT NULL,
  config_key        character varying(255) NOT NULL,
  merchant_id       character varying(255),
  metadata          jsonb,
  webhook_secret    text,
  CONSTRAINT payment_configs_provider_check CHECK (((provider)::text = ANY ((ARRAY['RAZORPAY':: character varying, 'STRIPE':: character varying, 'BANK_TRANSFER':: character varying, 'PAYPAL':: character varying])::text[])
) )
);


ALTER TABLE public.payment_configs OWNER TO hrms;

--
-- Name: payment_refunds; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payment_refunds
(
  amount             numeric(15, 2)         NOT NULL,
  is_deleted         boolean                NOT NULL,
  completed_at       timestamp(6) without time zone,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  initiated_by       uuid                   NOT NULL,
  tenant_id          uuid                   NOT NULL,
  transaction_id     uuid                   NOT NULL,
  updated_by         uuid,
  status             character varying(50)  NOT NULL,
  refund_ref         character varying(100) NOT NULL,
  external_refund_id character varying(255),
  metadata           jsonb,
  reason             text,
  CONSTRAINT payment_refunds_status_check CHECK (((status)::text = ANY ((ARRAY['INITIATED':: character varying, 'PROCESSING':: character varying, 'COMPLETED':: character varying, 'FAILED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.payment_refunds OWNER TO hrms;

--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payment_transactions
(
  amount                   numeric(15, 2)         NOT NULL,
  currency                 character varying(3)   NOT NULL,
  is_deleted               boolean                NOT NULL,
  completed_at             timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  initiated_at             timestamp(6) without time zone NOT NULL,
  refunded_at              timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  recipient_ifsc           character varying(11),
  created_by               uuid,
  employee_id              uuid,
  expense_claim_id         uuid,
  id                       uuid                   NOT NULL,
  loan_id                  uuid,
  payroll_run_id           uuid,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  provider                 character varying(50)  NOT NULL,
  status                   character varying(50)  NOT NULL,
  type                     character varying(50)  NOT NULL,
  transaction_ref          character varying(100) NOT NULL,
  external_ref             character varying(255),
  failed_reason            text,
  metadata                 jsonb,
  recipient_account_number character varying(255),
  recipient_name           character varying(255),
  CONSTRAINT payment_transactions_provider_check CHECK (((provider)::text = ANY ((ARRAY['RAZORPAY':: character varying, 'STRIPE':: character varying, 'BANK_TRANSFER':: character varying, 'PAYPAL':: character varying])::text[])
) ),
    CONSTRAINT payment_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['INITIATED'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying, 'PARTIAL_REFUND'::character varying, 'REVERSED'::character varying])::text[]))),
    CONSTRAINT payment_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['PAYROLL'::character varying, 'EXPENSE_REIMBURSEMENT'::character varying, 'LOAN'::character varying, 'BENEFIT_PAYMENT'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.payment_transactions OWNER TO hrms;

--
-- Name: payment_webhooks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payment_webhooks
(
  processed         boolean                NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  processed_at      timestamp(6) without time zone,
  updated_at        timestamp(6) without time zone NOT NULL,
  id                uuid                   NOT NULL,
  tenant_id         uuid                   NOT NULL,
  provider          character varying(50)  NOT NULL,
  status            character varying(50)  NOT NULL,
  event_type        character varying(100) NOT NULL,
  error_message     text,
  external_event_id character varying(255),
  payload           jsonb                  NOT NULL
);


ALTER TABLE public.payment_webhooks OWNER TO hrms;

--
-- Name: payroll_locations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payroll_locations
(
  base_income_tax_rate          numeric(5, 2),
  country_code                  character varying(2)   NOT NULL,
  income_tax_applicable         boolean,
  is_active                     boolean,
  is_deleted                    boolean                NOT NULL,
  local_currency                character varying(3)   NOT NULL,
  max_working_hours_week        integer,
  min_wage                      numeric(12, 2),
  overtime_multiplier           numeric(3, 2),
  pay_day                       integer,
  social_security_applicable    boolean,
  social_security_employee_rate numeric(5, 2),
  social_security_employer_rate numeric(5, 2),
  statutory_bonus_applicable    boolean,
  created_at                    timestamp(6) without time zone NOT NULL,
  updated_at                    timestamp(6) without time zone NOT NULL,
  version                       bigint,
  created_by                    uuid,
  id                            uuid                   NOT NULL,
  tenant_id                     uuid                   NOT NULL,
  updated_by                    uuid,
  compliance_notes              text,
  country_name                  character varying(255),
  location_code                 character varying(255) NOT NULL,
  location_name                 character varying(255) NOT NULL,
  min_wage_unit                 character varying(255),
  pay_frequency                 character varying(255),
  region                        character varying(255),
  timezone                      character varying(255),
  CONSTRAINT payroll_locations_pay_frequency_check CHECK (((pay_frequency)::text = ANY ((ARRAY['WEEKLY':: character varying, 'BIWEEKLY':: character varying, 'SEMIMONTHLY':: character varying, 'MONTHLY':: character varying])::text[])
) )
);


ALTER TABLE public.payroll_locations OWNER TO hrms;

--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payroll_runs
(
  is_deleted       boolean               NOT NULL,
  pay_period_month integer               NOT NULL,
  pay_period_year  integer               NOT NULL,
  payroll_date     date                  NOT NULL,
  total_employees  integer,
  approved_at      timestamp(6) without time zone,
  created_at       timestamp(6) without time zone NOT NULL,
  processed_at     timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  approved_by      uuid,
  created_by       uuid,
  id               uuid                  NOT NULL,
  processed_by     uuid,
  tenant_id        uuid                  NOT NULL,
  updated_by       uuid,
  status           character varying(20) NOT NULL,
  remarks          text,
  CONSTRAINT payroll_runs_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'PROCESSING':: character varying, 'PROCESSED':: character varying, 'APPROVED':: character varying, 'LOCKED':: character varying])::text[])
) )
);


ALTER TABLE public.payroll_runs OWNER TO hrms;

--
-- Name: payslips; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.payslips
(
  basic_salary            numeric(12, 2) NOT NULL,
  conveyance_allowance    numeric(12, 2),
  employee_esi            numeric(10, 2),
  employee_pf             numeric(10, 2),
  employer_esi            numeric(10, 2),
  employer_pf             numeric(10, 2),
  gross_salary            numeric(12, 2) NOT NULL,
  hra                     numeric(12, 2),
  income_tax              numeric(12, 2),
  is_deleted              boolean        NOT NULL,
  leave_days              integer,
  medical_allowance       numeric(12, 2),
  net_salary              numeric(12, 2) NOT NULL,
  other_allowances        numeric(12, 2),
  other_deductions        numeric(12, 2),
  pay_date                date           NOT NULL,
  pay_period_month        integer        NOT NULL,
  pay_period_year         integer        NOT NULL,
  present_days            integer,
  professional_tax        numeric(12, 2),
  provident_fund          numeric(12, 2),
  special_allowance       numeric(12, 2),
  tds_monthly             numeric(10, 2),
  total_deductions        numeric(12, 2) NOT NULL,
  working_days            integer,
  created_at              timestamp(6) without time zone NOT NULL,
  statutory_calculated_at timestamp(6) without time zone,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  employee_id             uuid           NOT NULL,
  id                      uuid           NOT NULL,
  payroll_run_id          uuid           NOT NULL,
  pdf_file_id             uuid,
  tenant_id               uuid           NOT NULL,
  updated_by              uuid
);


ALTER TABLE public.payslips OWNER TO hrms;

--
-- Name: peer_recognitions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.peer_recognitions
(
  is_public   boolean,
  created_at  timestamp(6) without time zone NOT NULL,
  badge_id    uuid,
  giver_id    uuid NOT NULL,
  id          uuid NOT NULL,
  receiver_id uuid NOT NULL,
  tenant_id   uuid NOT NULL,
  message     text NOT NULL
);


ALTER TABLE public.peer_recognitions OWNER TO hrms;

--
-- Name: performance_improvement_plans; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.performance_improvement_plans
(
  end_date           date    NOT NULL,
  is_deleted         boolean NOT NULL,
  start_date         date    NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  employee_id        uuid    NOT NULL,
  id                 uuid    NOT NULL,
  manager_id         uuid    NOT NULL,
  tenant_id          uuid    NOT NULL,
  updated_by         uuid,
  check_in_frequency character varying(20),
  status             character varying(20),
  close_notes        text,
  goals              text,
  reason             text,
  CONSTRAINT performance_improvement_plans_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'COMPLETED':: character varying, 'EXTENDED':: character varying, 'TERMINATED':: character varying])::text[])
) )
);


ALTER TABLE public.performance_improvement_plans OWNER TO hrms;

--
-- Name: performance_reviews; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.performance_reviews
(
  final_rating             integer,
  goal_achievement_percent integer,
  increment_recommendation numeric(5, 2),
  is_deleted               boolean NOT NULL,
  manager_rating           integer,
  overall_rating           numeric(3, 2),
  promotion_recommended    boolean,
  review_period_end        date,
  review_period_start      date,
  self_rating              integer,
  completed_at             timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  submitted_at             timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  employee_id              uuid    NOT NULL,
  id                       uuid    NOT NULL,
  review_cycle_id          uuid,
  reviewer_id              uuid    NOT NULL,
  tenant_id                uuid    NOT NULL,
  updated_by               uuid,
  review_type              character varying(50),
  status                   character varying(50),
  achievements             text,
  areas_for_improvement    text,
  employee_comments        text,
  goals_for_next_period    text,
  manager_comments         text,
  overall_comments         text,
  strengths                text,
  CONSTRAINT performance_reviews_review_type_check CHECK (((review_type)::text = ANY ((ARRAY['SELF':: character varying, 'MANAGER':: character varying, 'PEER':: character varying, 'UPWARD':: character varying, 'THREE_SIXTY':: character varying])::text[])
) ),
    CONSTRAINT performance_reviews_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'IN_REVIEW'::character varying, 'COMPLETED'::character varying, 'ACKNOWLEDGED'::character varying])::text[])))
);


ALTER TABLE public.performance_reviews OWNER TO hrms;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.permissions
(
  is_deleted  boolean                NOT NULL,
  created_at  timestamp(6) without time zone NOT NULL,
  updated_at  timestamp(6) without time zone NOT NULL,
  version     bigint,
  created_by  uuid,
  id          uuid                   NOT NULL,
  updated_by  uuid,
  action      character varying(20)  NOT NULL,
  resource    character varying(50)  NOT NULL,
  code        character varying(100) NOT NULL,
  name        character varying(100) NOT NULL,
  description character varying(500)
);


ALTER TABLE public.permissions OWNER TO hrms;

--
-- Name: pip_check_ins; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.pip_check_ins
(
  check_in_date    date    NOT NULL,
  is_deleted       boolean NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  id               uuid    NOT NULL,
  pip_id           uuid    NOT NULL,
  tenant_id        uuid    NOT NULL,
  updated_by       uuid,
  goal_updates     text,
  manager_comments text,
  progress_notes   text
);


ALTER TABLE public.pip_check_ins OWNER TO hrms;

--
-- Name: policy_acknowledgments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.policy_acknowledgments
(
  is_deleted        boolean NOT NULL,
  policy_version    integer NOT NULL,
  acknowledged_at   timestamp(6) without time zone,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  employee_id       uuid    NOT NULL,
  id                uuid    NOT NULL,
  policy_id         uuid    NOT NULL,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid,
  digital_signature text,
  ip_address        character varying(255),
  user_agent        character varying(255)
);


ALTER TABLE public.policy_acknowledgments OWNER TO hrms;

--
-- Name: poll_options; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.poll_options
(
  display_order integer,
  id            uuid                   NOT NULL,
  post_id       uuid                   NOT NULL,
  tenant_id     uuid                   NOT NULL,
  option_text   character varying(255) NOT NULL
);


ALTER TABLE public.poll_options OWNER TO hrms;

--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.poll_votes
(
  created_at     timestamp(6) without time zone NOT NULL,
  employee_id    uuid NOT NULL,
  id             uuid NOT NULL,
  poll_option_id uuid NOT NULL,
  tenant_id      uuid NOT NULL
);


ALTER TABLE public.poll_votes OWNER TO hrms;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.positions
(
  filled_count           integer,
  headcount              integer,
  is_active              boolean,
  is_critical            boolean,
  is_deleted             boolean                NOT NULL,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  department_id          uuid,
  id                     uuid                   NOT NULL,
  reports_to_position_id uuid,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  code                   character varying(255) NOT NULL,
  description            text,
  grade_max              character varying(255),
  grade_min              character varying(255),
  job_family             character varying(255),
  level                  character varying(255),
  location               character varying(255),
  required_skills        text,
  responsibilities       text,
  title                  character varying(255) NOT NULL,
  CONSTRAINT positions_job_family_check CHECK (((job_family)::text = ANY ((ARRAY['ENGINEERING':: character varying, 'PRODUCT':: character varying, 'DESIGN':: character varying, 'DATA':: character varying, 'SALES':: character varying, 'MARKETING':: character varying, 'FINANCE':: character varying, 'HR':: character varying, 'OPERATIONS':: character varying, 'LEGAL':: character varying, 'CUSTOMER_SUCCESS':: character varying, 'IT':: character varying, 'ADMIN':: character varying, 'EXECUTIVE':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT positions_level_check CHECK (((level)::text = ANY ((ARRAY['ENTRY'::character varying, 'JUNIOR'::character varying, 'MID'::character varying, 'SENIOR'::character varying, 'LEAD'::character varying, 'MANAGER'::character varying, 'SENIOR_MANAGER'::character varying, 'DIRECTOR'::character varying, 'VP'::character varying, 'SVP'::character varying, 'C_LEVEL'::character varying, 'EXECUTIVE'::character varying])::text[])))
);


ALTER TABLE public.positions OWNER TO hrms;

--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.post_comments
(
  is_deleted        boolean,
  likes_count       integer,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone,
  author_id         uuid NOT NULL,
  created_by        uuid,
  id                uuid NOT NULL,
  parent_comment_id uuid,
  post_id           uuid NOT NULL,
  tenant_id         uuid NOT NULL,
  updated_by        uuid,
  content           text NOT NULL
);


ALTER TABLE public.post_comments OWNER TO hrms;

--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.post_reactions
(
  created_at    timestamp(6) without time zone NOT NULL,
  comment_id    uuid,
  employee_id   uuid                   NOT NULL,
  id            uuid                   NOT NULL,
  post_id       uuid,
  tenant_id     uuid                   NOT NULL,
  reaction_type character varying(255) NOT NULL,
  CONSTRAINT post_reactions_reaction_type_check CHECK (((reaction_type)::text = ANY ((ARRAY['LIKE':: character varying, 'LOVE':: character varying, 'CELEBRATE':: character varying, 'INSIGHTFUL':: character varying, 'CURIOUS':: character varying])::text[])
) )
);


ALTER TABLE public.post_reactions OWNER TO hrms;

--
-- Name: preboarding_candidates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.preboarding_candidates
(
  address_proof_uploaded   boolean,
  completion_percentage    integer,
  date_of_birth            date,
  education_docs_uploaded  boolean,
  expected_joining_date    date                   NOT NULL,
  id_proof_uploaded        boolean,
  offer_letter_signed      boolean,
  photo_uploaded           boolean,
  created_at               timestamp(6) without time zone,
  token_expires_at         timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone,
  version                  bigint,
  department_id            uuid,
  employee_id              uuid,
  id                       uuid                   NOT NULL,
  reporting_manager_id     uuid,
  tenant_id                uuid                   NOT NULL,
  emergency_contact_number character varying(20),
  phone_number             character varying(20),
  postal_code              character varying(20),
  status                   character varying(20)  NOT NULL,
  bank_ifsc_code           character varying(50),
  tax_id                   character varying(50),
  bank_account_number      character varying(100),
  bank_name                character varying(100),
  city                     character varying(100),
  country                  character varying(100),
  designation              character varying(100),
  emergency_contact_name   character varying(100),
  first_name               character varying(100) NOT NULL,
  last_name                character varying(100),
  state                    character varying(100),
  email                    character varying(200) NOT NULL,
  access_token             character varying(255) NOT NULL,
  address                  text,
  CONSTRAINT preboarding_candidates_status_check CHECK (((status)::text = ANY ((ARRAY['INVITED':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'CONVERTED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.preboarding_candidates OWNER TO hrms;

--
-- Name: probation_evaluations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.probation_evaluations
(
  acknowledged_date       date,
  attendance_rating       double precision,
  communication_rating    double precision,
  employee_acknowledged   boolean,
  evaluation_date         date                   NOT NULL,
  is_deleted              boolean                NOT NULL,
  is_final_evaluation     boolean,
  overall_rating          double precision,
  performance_rating      double precision,
  teamwork_rating         double precision,
  technical_skills_rating double precision,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  evaluator_id            uuid                   NOT NULL,
  id                      uuid                   NOT NULL,
  probation_period_id     uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  recommendation_reason   character varying(1000),
  areas_for_improvement   character varying(2000),
  employee_comments       character varying(2000),
  goals_for_next_period   character varying(2000),
  manager_comments        character varying(2000),
  strengths               character varying(2000),
  evaluation_type         character varying(255) NOT NULL,
  recommendation          character varying(255) NOT NULL,
  CONSTRAINT probation_evaluations_evaluation_type_check CHECK (((evaluation_type)::text = ANY ((ARRAY['WEEKLY':: character varying, 'BI_WEEKLY':: character varying, 'MONTHLY':: character varying, 'QUARTERLY':: character varying, 'MID_PROBATION':: character varying, 'FINAL':: character varying])::text[])
) ),
    CONSTRAINT probation_evaluations_recommendation_check CHECK (((recommendation)::text = ANY ((ARRAY['CONFIRM'::character varying, 'EXTEND'::character varying, 'TERMINATE'::character varying, 'NEEDS_IMPROVEMENT'::character varying, 'ON_TRACK'::character varying])::text[])))
);


ALTER TABLE public.probation_evaluations OWNER TO hrms;

--
-- Name: probation_periods; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.probation_periods
(
  confirmation_date         date,
  duration_months           integer                NOT NULL,
  end_date                  date                   NOT NULL,
  evaluation_frequency_days integer,
  extension_count           integer,
  final_rating              double precision,
  is_deleted                boolean                NOT NULL,
  next_evaluation_date      date,
  original_end_date         date                   NOT NULL,
  start_date                date                   NOT NULL,
  termination_date          date,
  total_extension_days      integer,
  created_at                timestamp(6) without time zone NOT NULL,
  updated_at                timestamp(6) without time zone NOT NULL,
  version                   bigint,
  confirmation_letter_id    uuid,
  created_by                uuid,
  employee_id               uuid                   NOT NULL,
  hr_id                     uuid,
  id                        uuid                   NOT NULL,
  manager_id                uuid,
  tenant_id                 uuid                   NOT NULL,
  updated_by                uuid,
  termination_reason        character varying(1000),
  notes                     character varying(2000),
  status                    character varying(255) NOT NULL,
  CONSTRAINT probation_periods_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'EXTENDED':: character varying, 'CONFIRMED':: character varying, 'FAILED':: character varying, 'TERMINATED':: character varying, 'ON_HOLD':: character varying])::text[])
) )
);


ALTER TABLE public.probation_periods OWNER TO hrms;

--
-- Name: professional_tax_slabs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.professional_tax_slabs
(
  deduction_month integer,
  effective_from  date                 NOT NULL,
  effective_to    date,
  is_active       boolean              NOT NULL,
  max_salary      numeric(10, 2),
  min_salary      numeric(10, 2)       NOT NULL,
  tax_amount      numeric(10, 2)       NOT NULL,
  state_code      character varying(5) NOT NULL,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone,
  created_by      uuid,
  id              uuid                 NOT NULL,
  tenant_id       uuid                 NOT NULL,
  updated_by      uuid
);


ALTER TABLE public.professional_tax_slabs OWNER TO hrms;

--
-- Name: profile_update_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.profile_update_requests
(
  auto_approved           boolean,
  is_deleted              boolean                NOT NULL,
  created_at              timestamp(6) without time zone NOT NULL,
  reviewed_at             timestamp(6) without time zone,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  employee_id             uuid                   NOT NULL,
  id                      uuid                   NOT NULL,
  reviewed_by             uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  category                character varying(255) NOT NULL,
  current_value           text,
  field_name              character varying(255) NOT NULL,
  reason                  text,
  rejection_reason        text,
  requested_value         text,
  review_comments         text,
  status                  character varying(255) NOT NULL,
  supporting_document_url text,
  CONSTRAINT profile_update_requests_category_check CHECK (((category)::text = ANY ((ARRAY['PERSONAL_INFO':: character varying, 'CONTACT_INFO':: character varying, 'EMERGENCY_CONTACT':: character varying, 'BANK_DETAILS':: character varying, 'ADDRESS':: character varying, 'EDUCATION':: character varying, 'CERTIFICATION':: character varying, 'SKILL':: character varying, 'DOCUMENT':: character varying])::text[])
) ),
    CONSTRAINT profile_update_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'UNDER_REVIEW'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'AUTO_APPROVED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.profile_update_requests OWNER TO hrms;

--
-- Name: project_employees; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.project_employees
(
  allocation_percentage integer,
  end_date              date,
  is_active             boolean NOT NULL,
  is_deleted            boolean NOT NULL,
  start_date            date    NOT NULL,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  created_by            uuid,
  employee_id           uuid    NOT NULL,
  id                    uuid    NOT NULL,
  project_id            uuid    NOT NULL,
  tenant_id             uuid    NOT NULL,
  updated_by            uuid,
  role                  character varying(100)
);


ALTER TABLE public.project_employees OWNER TO hrms;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.project_members
(
  allocation_percentage numeric(5, 2),
  billing_rate          numeric(10, 2),
  can_approve_time      boolean               NOT NULL,
  cost_rate             numeric(10, 2),
  end_date              date,
  is_active             boolean               NOT NULL,
  start_date            date                  NOT NULL,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone,
  employee_id           uuid                  NOT NULL,
  id                    uuid                  NOT NULL,
  project_id            uuid                  NOT NULL,
  tenant_id             uuid                  NOT NULL,
  role                  character varying(30) NOT NULL,
  notes                 text,
  CONSTRAINT project_members_role_check CHECK (((role)::text = ANY ((ARRAY['PROJECT_MANAGER':: character varying, 'TEAM_LEAD':: character varying, 'DEVELOPER':: character varying, 'SENIOR_DEVELOPER':: character varying, 'JUNIOR_DEVELOPER':: character varying, 'QA_ENGINEER':: character varying, 'DESIGNER':: character varying, 'BUSINESS_ANALYST':: character varying, 'ARCHITECT':: character varying, 'CONSULTANT':: character varying, 'MEMBER':: character varying])::text[])
) )
);


ALTER TABLE public.project_members OWNER TO hrms;

--
-- Name: project_time_entries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.project_time_entries
(
  billed_amount   numeric(15, 2),
  billing_rate    numeric(10, 2),
  hours_worked    numeric(5, 2)         NOT NULL,
  is_billable     boolean               NOT NULL,
  work_date       date                  NOT NULL,
  approved_at     timestamp(6) without time zone,
  created_at      timestamp(6) without time zone NOT NULL,
  submitted_at    timestamp(6) without time zone,
  updated_at      timestamp(6) without time zone,
  approved_by     uuid,
  employee_id     uuid                  NOT NULL,
  id              uuid                  NOT NULL,
  project_id      uuid                  NOT NULL,
  tenant_id       uuid                  NOT NULL,
  entry_type      character varying(20) NOT NULL,
  status          character varying(20) NOT NULL,
  task_name       character varying(200),
  description     text,
  rejected_reason text,
  CONSTRAINT project_time_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['REGULAR':: character varying, 'OVERTIME':: character varying, 'MEETING':: character varying, 'TRAINING':: character varying, 'SUPPORT':: character varying, 'DEVELOPMENT':: character varying, 'TESTING':: character varying, 'DOCUMENTATION':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT project_time_entries_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'BILLED'::character varying])::text[])))
);


ALTER TABLE public.project_time_entries OWNER TO hrms;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.projects
(
  budget             numeric(15, 2),
  currency           character varying(3),
  end_date           date,
  expected_end_date  date,
  is_deleted         boolean                NOT NULL,
  start_date         date                   NOT NULL,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  project_manager_id uuid,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  priority           character varying(20)  NOT NULL,
  status             character varying(20)  NOT NULL,
  project_code       character varying(50)  NOT NULL,
  client_name        character varying(200),
  name               character varying(200) NOT NULL,
  description        text,
  CONSTRAINT projects_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PLANNED'::character varying, 'IN_PROGRESS'::character varying, 'ON_HOLD'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO hrms;

--
-- Name: provident_fund_configs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.provident_fund_configs
(
  effective_from                   date          NOT NULL,
  effective_to                     date,
  employee_contribution_percentage numeric(5, 2) NOT NULL,
  employer_contribution_percentage numeric(5, 2) NOT NULL,
  eps_contribution_percentage      numeric(5, 2),
  is_active                        boolean       NOT NULL,
  is_vpf_allowed                   boolean,
  max_vpf_percentage               numeric(5, 2),
  wage_ceiling                     numeric(10, 2),
  created_at                       timestamp(6) without time zone NOT NULL,
  updated_at                       timestamp(6) without time zone,
  created_by                       uuid,
  id                               uuid          NOT NULL,
  tenant_id                        uuid          NOT NULL,
  updated_by                       uuid
);


ALTER TABLE public.provident_fund_configs OWNER TO hrms;

--
-- Name: psa_invoices; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.psa_invoices
(
  billable_amount      numeric(15, 2)        NOT NULL,
  billing_period_end   date                  NOT NULL,
  billing_period_start date                  NOT NULL,
  due_date             date,
  invoice_date         date                  NOT NULL,
  tax_amount           numeric(15, 2),
  total_amount         numeric(15, 2)        NOT NULL,
  total_hours          double precision,
  created_at           timestamp(6) without time zone NOT NULL,
  paid_at              timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone,
  client_id            uuid                  NOT NULL,
  created_by           uuid,
  id                   uuid                  NOT NULL,
  project_id           uuid                  NOT NULL,
  tenant_id            uuid                  NOT NULL,
  updated_by           uuid,
  status               character varying(30) NOT NULL,
  invoice_number       character varying(50) NOT NULL,
  notes                text,
  CONSTRAINT psa_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'SENT':: character varying, 'PARTIALLY_PAID':: character varying, 'PAID':: character varying, 'OVERDUE':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.psa_invoices OWNER TO hrms;

--
-- Name: psa_project_allocations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.psa_project_allocations
(
  allocation_percentage integer,
  billing_rate          numeric(10, 2),
  end_date              date,
  is_active             boolean NOT NULL,
  start_date            date    NOT NULL,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone,
  created_by            uuid,
  employee_id           uuid    NOT NULL,
  id                    uuid    NOT NULL,
  project_id            uuid    NOT NULL,
  tenant_id             uuid    NOT NULL,
  updated_by            uuid,
  role_name             character varying(100)
);


ALTER TABLE public.psa_project_allocations OWNER TO hrms;

--
-- Name: psa_projects; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.psa_projects
(
  billing_rate       numeric(10, 2),
  budget             numeric(15, 2),
  end_date           date,
  is_billable        boolean                NOT NULL,
  start_date         date,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone,
  client_id          uuid,
  created_by         uuid,
  id                 uuid                   NOT NULL,
  project_manager_id uuid,
  tenant_id          uuid                   NOT NULL,
  updated_by         uuid,
  billing_type       character varying(30)  NOT NULL,
  status             character varying(30)  NOT NULL,
  project_code       character varying(50)  NOT NULL,
  project_name       character varying(200) NOT NULL,
  description        text,
  CONSTRAINT psa_projects_billing_type_check CHECK (((billing_type)::text = ANY ((ARRAY['TIME_AND_MATERIAL':: character varying, 'FIXED_PRICE':: character varying, 'NON_BILLABLE':: character varying, 'RETAINER':: character varying])::text[])
) ),
    CONSTRAINT psa_projects_status_check CHECK (((status)::text = ANY ((ARRAY['PLANNED'::character varying, 'ACTIVE'::character varying, 'ON_HOLD'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.psa_projects OWNER TO hrms;

--
-- Name: psa_time_entries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.psa_time_entries
(
  entry_date       date             NOT NULL,
  hours            double precision NOT NULL,
  is_billable      boolean          NOT NULL,
  is_overtime      boolean,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone,
  employee_id      uuid             NOT NULL,
  id               uuid             NOT NULL,
  project_id       uuid             NOT NULL,
  task_id          uuid,
  tenant_id        uuid             NOT NULL,
  timesheet_id     uuid             NOT NULL,
  activity_type    character varying(50),
  work_description text,
  CONSTRAINT psa_time_entries_activity_type_check CHECK (((activity_type)::text = ANY ((ARRAY['DEVELOPMENT':: character varying, 'TESTING':: character varying, 'DESIGN':: character varying, 'DOCUMENTATION':: character varying, 'MEETING':: character varying, 'CODE_REVIEW':: character varying, 'PLANNING':: character varying, 'SUPPORT':: character varying, 'RESEARCH':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.psa_time_entries OWNER TO hrms;

--
-- Name: psa_timesheets; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.psa_timesheets
(
  billable_hours     double precision,
  non_billable_hours double precision,
  total_hours        double precision      NOT NULL,
  week_end_date      date                  NOT NULL,
  week_start_date    date                  NOT NULL,
  approved_at        timestamp(6) without time zone,
  created_at         timestamp(6) without time zone NOT NULL,
  submitted_at       timestamp(6) without time zone,
  updated_at         timestamp(6) without time zone,
  approved_by        uuid,
  employee_id        uuid                  NOT NULL,
  id                 uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  status             character varying(30) NOT NULL,
  rejection_reason   text,
  CONSTRAINT psa_timesheets_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'SUBMITTED':: character varying, 'UNDER_REVIEW':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying])::text[])
) )
);


ALTER TABLE public.psa_timesheets OWNER TO hrms;

--
-- Name: pulse_survey_answers; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.pulse_survey_answers
(
  boolean_value    boolean,
  is_deleted       boolean NOT NULL,
  is_skipped       boolean,
  numeric_value    integer,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  id               uuid    NOT NULL,
  question_id      uuid    NOT NULL,
  response_id      uuid    NOT NULL,
  survey_id        uuid    NOT NULL,
  tenant_id        uuid    NOT NULL,
  updated_by       uuid,
  selected_options text,
  text_value       text
);


ALTER TABLE public.pulse_survey_answers OWNER TO hrms;

--
-- Name: pulse_survey_questions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.pulse_survey_questions
(
  is_active      boolean,
  is_deleted     boolean               NOT NULL,
  is_required    boolean,
  max_value      integer,
  min_value      integer,
  question_order integer               NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  id             uuid                  NOT NULL,
  survey_id      uuid                  NOT NULL,
  tenant_id      uuid                  NOT NULL,
  updated_by     uuid,
  category       character varying(30),
  question_type  character varying(30) NOT NULL,
  max_label      character varying(100),
  min_label      character varying(100),
  help_text      character varying(500),
  options        text,
  question_text  text                  NOT NULL,
  CONSTRAINT pulse_survey_questions_category_check CHECK (((category)::text = ANY ((ARRAY['ENGAGEMENT':: character varying, 'MANAGEMENT':: character varying, 'WORK_ENVIRONMENT':: character varying, 'GROWTH':: character varying, 'RECOGNITION':: character varying, 'COMMUNICATION':: character varying, 'WORK_LIFE_BALANCE':: character varying, 'COMPENSATION':: character varying, 'TEAM_DYNAMICS':: character varying, 'COMPANY_CULTURE':: character varying])::text[])
) ),
    CONSTRAINT pulse_survey_questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['RATING'::character varying, 'NPS'::character varying, 'LIKERT'::character varying, 'SINGLE_CHOICE'::character varying, 'MULTIPLE_CHOICE'::character varying, 'TEXT'::character varying, 'YES_NO'::character varying, 'EMOJI'::character varying])::text[])))
);


ALTER TABLE public.pulse_survey_questions OWNER TO hrms;

--
-- Name: pulse_survey_responses; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.pulse_survey_responses
(
  is_deleted         boolean               NOT NULL,
  overall_score      double precision,
  time_spent_seconds integer,
  created_at         timestamp(6) without time zone NOT NULL,
  started_at         timestamp(6) without time zone,
  submitted_at       timestamp(6) without time zone,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  created_by         uuid,
  employee_id        uuid,
  id                 uuid                  NOT NULL,
  survey_id          uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  updated_by         uuid,
  status             character varying(20) NOT NULL,
  device_type        character varying(30),
  ip_address         character varying(50),
  browser            character varying(100),
  CONSTRAINT pulse_survey_responses_status_check CHECK (((status)::text = ANY ((ARRAY['INVITED':: character varying, 'IN_PROGRESS':: character varying, 'SUBMITTED':: character varying, 'SKIPPED':: character varying])::text[])
) )
);


ALTER TABLE public.pulse_survey_responses OWNER TO hrms;

--
-- Name: pulse_surveys; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.pulse_surveys
(
  average_score        real,
  end_date             date                   NOT NULL,
  is_anonymous         boolean,
  is_deleted           boolean                NOT NULL,
  is_mandatory         boolean,
  next_occurrence_date date,
  reminder_days_before integer,
  reminder_enabled     boolean,
  start_date           date                   NOT NULL,
  total_invited        integer,
  total_questions      integer,
  total_responses      integer,
  closed_at            timestamp(6) without time zone,
  created_at           timestamp(6) without time zone NOT NULL,
  published_at         timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  closed_by            uuid,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  published_by         uuid,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  frequency            character varying(20),
  status               character varying(20)  NOT NULL,
  survey_type          character varying(30)  NOT NULL,
  title                character varying(200) NOT NULL,
  description          text,
  target_departments   text,
  target_locations     text,
  CONSTRAINT pulse_surveys_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['ONE_TIME':: character varying, 'WEEKLY':: character varying, 'BI_WEEKLY':: character varying, 'MONTHLY':: character varying, 'QUARTERLY':: character varying, 'HALF_YEARLY':: character varying, 'YEARLY':: character varying])::text[])
) ),
    CONSTRAINT pulse_surveys_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SCHEDULED'::character varying, 'ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT pulse_surveys_survey_type_check CHECK (((survey_type)::text = ANY ((ARRAY['ENGAGEMENT'::character varying, 'SATISFACTION'::character varying, 'ONBOARDING'::character varying, 'EXIT'::character varying, 'WELLNESS'::character varying, 'CULTURE'::character varying, 'MANAGER_FEEDBACK'::character varying, 'CUSTOM'::character varying])::text[])))
);


ALTER TABLE public.pulse_surveys OWNER TO hrms;

--
-- Name: recognition_badges; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.recognition_badges
(
  is_active       boolean,
  is_deleted      boolean                NOT NULL,
  is_system_badge boolean,
  points_value    integer,
  sort_order      integer,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone NOT NULL,
  version         bigint,
  created_by      uuid,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  updated_by      uuid,
  icon_url        character varying(500),
  badge_name      character varying(255) NOT NULL,
  category        character varying(255),
  code            character varying(255) NOT NULL,
  color           character varying(255),
  description     text,
  level           character varying(255),
  CONSTRAINT recognition_badges_category_check CHECK (((category)::text = ANY ((ARRAY['TEAMWORK':: character varying, 'INNOVATION':: character varying, 'CUSTOMER_FOCUS':: character varying, 'LEADERSHIP':: character varying, 'PROBLEM_SOLVING':: character varying, 'GOING_EXTRA_MILE':: character varying, 'MENTORSHIP':: character varying, 'QUALITY':: character varying, 'INITIATIVE':: character varying, 'COLLABORATION':: character varying, 'COMMUNICATION':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT recognition_badges_level_check CHECK (((level)::text = ANY ((ARRAY['BRONZE'::character varying, 'SILVER'::character varying, 'GOLD'::character varying, 'PLATINUM'::character varying, 'DIAMOND'::character varying])::text[])))
);


ALTER TABLE public.recognition_badges OWNER TO hrms;

--
-- Name: recognition_reactions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.recognition_reactions
(
  is_deleted     boolean                NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  reacted_at     timestamp(6) without time zone,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  employee_id    uuid                   NOT NULL,
  id             uuid                   NOT NULL,
  recognition_id uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  reaction_type  character varying(255) NOT NULL,
  CONSTRAINT recognition_reactions_reaction_type_check CHECK (((reaction_type)::text = ANY ((ARRAY['LIKE':: character varying, 'CELEBRATE':: character varying, 'LOVE':: character varying, 'INSIGHTFUL':: character varying, 'CURIOUS':: character varying])::text[])
) )
);


ALTER TABLE public.recognition_reactions OWNER TO hrms;

--
-- Name: recognitions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.recognitions
(
  comments_count integer,
  is_anonymous   boolean,
  is_approved    boolean,
  is_deleted     boolean                NOT NULL,
  is_public      boolean,
  likes_count    integer,
  points_awarded integer,
  approved_at    timestamp(6) without time zone,
  created_at     timestamp(6) without time zone NOT NULL,
  recognized_at  timestamp(6) without time zone,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  approved_by    uuid,
  badge_id       uuid,
  created_by     uuid,
  giver_id       uuid                   NOT NULL,
  id             uuid                   NOT NULL,
  receiver_id    uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  category       character varying(255),
  message        text,
  title          character varying(255) NOT NULL,
  type           character varying(255) NOT NULL,
  wall_post_id   uuid,
  CONSTRAINT recognitions_category_check CHECK (((category)::text = ANY ((ARRAY['TEAMWORK':: character varying, 'INNOVATION':: character varying, 'CUSTOMER_FOCUS':: character varying, 'LEADERSHIP':: character varying, 'PROBLEM_SOLVING':: character varying, 'GOING_EXTRA_MILE':: character varying, 'MENTORSHIP':: character varying, 'QUALITY':: character varying, 'INITIATIVE':: character varying, 'COLLABORATION':: character varying, 'COMMUNICATION':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT recognitions_type_check CHECK (((type)::text = ANY ((ARRAY['KUDOS'::character varying, 'APPRECIATION'::character varying, 'ACHIEVEMENT'::character varying, 'MILESTONE'::character varying, 'SPOT_AWARD'::character varying, 'PEER_NOMINATION'::character varying, 'MANAGER_RECOGNITION'::character varying, 'TEAM_RECOGNITION'::character varying])::text[])))
);


ALTER TABLE public.recognitions OWNER TO hrms;

--
-- Name: referral_policies; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.referral_policies
(
  base_bonus_amount          numeric(12, 2),
  effective_from             date,
  effective_to               date,
  is_active                  boolean,
  is_deleted                 boolean                NOT NULL,
  joining_bonus_percentage   numeric(5, 2),
  max_referrals_per_month    integer,
  min_service_months         integer,
  probation_eligible         boolean,
  retention_bonus_percentage numeric(5, 2),
  retention_period_months    integer,
  same_department_allowed    boolean,
  self_referral_allowed      boolean,
  created_at                 timestamp(6) without time zone NOT NULL,
  updated_at                 timestamp(6) without time zone NOT NULL,
  version                    bigint,
  created_by                 uuid,
  department_id              uuid,
  id                         uuid                   NOT NULL,
  tenant_id                  uuid                   NOT NULL,
  updated_by                 uuid,
  applicable_for             character varying(255),
  description                text,
  job_level                  character varying(255),
  name                       character varying(255) NOT NULL,
  CONSTRAINT referral_policies_applicable_for_check CHECK (((applicable_for)::text = ANY ((ARRAY['ALL':: character varying, 'DEPARTMENT_SPECIFIC':: character varying, 'LEVEL_SPECIFIC':: character varying])::text[])
) )
);


ALTER TABLE public.referral_policies OWNER TO hrms;

--
-- Name: report_definitions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.report_definitions
(
  is_active        boolean                NOT NULL,
  is_system_report boolean,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone,
  created_by       uuid,
  id               uuid                   NOT NULL,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  output_format    character varying(20),
  access_level     character varying(30),
  category         character varying(50)  NOT NULL,
  report_code      character varying(50)  NOT NULL,
  report_name      character varying(200) NOT NULL,
  description      text,
  parameters       text,
  query_template   text,
  CONSTRAINT report_definitions_access_level_check CHECK (((access_level)::text = ANY ((ARRAY['ADMIN_ONLY':: character varying, 'MANAGER':: character varying, 'HR':: character varying, 'EMPLOYEE':: character varying, 'PUBLIC':: character varying])::text[])
) ),
    CONSTRAINT report_definitions_category_check CHECK (((category)::text = ANY ((ARRAY['HEADCOUNT'::character varying, 'ATTENDANCE'::character varying, 'LEAVE'::character varying, 'PAYROLL'::character varying, 'PERFORMANCE'::character varying, 'RECRUITMENT'::character varying, 'TRAINING'::character varying, 'TURNOVER'::character varying, 'COMPLIANCE'::character varying, 'CUSTOM'::character varying])::text[]))),
    CONSTRAINT report_definitions_output_format_check CHECK (((output_format)::text = ANY ((ARRAY['PDF'::character varying, 'EXCEL'::character varying, 'CSV'::character varying, 'JSON'::character varying, 'HTML'::character varying])::text[])))
);


ALTER TABLE public.report_definitions OWNER TO hrms;

--
-- Name: report_executions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.report_executions
(
  row_count            integer,
  completed_at         timestamp(6) without time zone,
  execution_time_ms    bigint,
  file_size            bigint,
  started_at           timestamp(6) without time zone NOT NULL,
  executed_by          uuid,
  id                   uuid                  NOT NULL,
  report_definition_id uuid                  NOT NULL,
  scheduled_report_id  uuid,
  tenant_id            uuid                  NOT NULL,
  execution_type       character varying(20) NOT NULL,
  status               character varying(20) NOT NULL,
  error_message        text,
  file_path            character varying(255),
  parameters           text,
  CONSTRAINT report_executions_execution_type_check CHECK (((execution_type)::text = ANY ((ARRAY['AD_HOC':: character varying, 'SCHEDULED':: character varying, 'API':: character varying])::text[])
) ),
    CONSTRAINT report_executions_status_check CHECK (((status)::text = ANY ((ARRAY['RUNNING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.report_executions OWNER TO hrms;

--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.report_templates
(
  is_deleted       boolean,
  sort_direction   character varying(4),
  created_at       timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone,
  created_by       uuid,
  id               uuid                   NOT NULL,
  tenant_id        uuid                   NOT NULL,
  module           character varying(50)  NOT NULL,
  sort_by          character varying(50),
  name             character varying(100) NOT NULL,
  description      character varying(500),
  filters          text,
  selected_columns text                   NOT NULL
);


ALTER TABLE public.report_templates OWNER TO hrms;

--
-- Name: resource_conflict_log; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.resource_conflict_log
(
  id                   uuid                  DEFAULT gen_random_uuid() NOT NULL,
  tenant_id            uuid                                            NOT NULL,
  employee_id          uuid                                            NOT NULL,
  project_id_a         uuid                                            NOT NULL,
  project_id_b         uuid                                            NOT NULL,
  overlap_start_date   date                                            NOT NULL,
  overlap_end_date     date,
  total_allocation_pct numeric(5, 2),
  detected_at          timestamp without time zone DEFAULT now() NOT NULL,
  resolved_at          timestamp without time zone,
  resolved_by          uuid,
  status               character varying(20) DEFAULT 'OPEN'::character varying NOT NULL
);


ALTER TABLE public.resource_conflict_log OWNER TO hrms;

--
-- Name: resume_parsing_results; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.resume_parsing_results
(
  confidence_score       double precision,
  total_experience_years integer,
  created_at             timestamp(6) without time zone NOT NULL,
  candidate_id           uuid,
  created_by             uuid,
  id                     uuid NOT NULL,
  job_application_id     uuid,
  tenant_id              uuid NOT NULL,
  phone                  character varying(50),
  parsing_model          character varying(100),
  email                  character varying(200),
  full_name              character varying(200),
  file_path              character varying(500),
  certifications         text,
  education              text,
  parsed_data            text,
  skills                 text,
  work_experience        text
);


ALTER TABLE public.resume_parsing_results OWNER TO hrms;

--
-- Name: review_competencies; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.review_competencies
(
  is_deleted      boolean                NOT NULL,
  rating          numeric(3, 2),
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone NOT NULL,
  version         bigint,
  created_by      uuid,
  id              uuid                   NOT NULL,
  review_id       uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  updated_by      uuid,
  category        character varying(100),
  competency_name character varying(200) NOT NULL,
  comments        text,
  CONSTRAINT review_competencies_category_check CHECK (((category)::text = ANY ((ARRAY['TECHNICAL':: character varying, 'BEHAVIORAL':: character varying, 'LEADERSHIP':: character varying, 'DOMAIN':: character varying, 'PROBLEM_SOLVING':: character varying])::text[])
) )
);


ALTER TABLE public.review_competencies OWNER TO hrms;

--
-- Name: review_cycles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.review_cycles
(
  end_date                date,
  is_deleted              boolean                NOT NULL,
  manager_review_deadline date,
  self_review_deadline    date,
  start_date              date,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  id                      uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  cycle_type              character varying(50),
  status                  character varying(50),
  cycle_name              character varying(200) NOT NULL,
  description             text,
  CONSTRAINT review_cycles_cycle_type_check CHECK (((cycle_type)::text = ANY ((ARRAY['ANNUAL':: character varying, 'QUARTERLY':: character varying, 'PROBATION':: character varying, 'MID_YEAR':: character varying, 'PROJECT_END':: character varying])::text[])
) ),
    CONSTRAINT review_cycles_status_check CHECK (((status)::text = ANY ((ARRAY['PLANNING'::character varying, 'DRAFT'::character varying, 'ACTIVE'::character varying, 'SELF_ASSESSMENT'::character varying, 'MANAGER_REVIEW'::character varying, 'CALIBRATION'::character varying, 'RATINGS_PUBLISHED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.review_cycles OWNER TO hrms;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.role_permissions
(
  is_deleted    boolean               NOT NULL,
  created_at    timestamp(6) without time zone NOT NULL,
  updated_at    timestamp(6) without time zone NOT NULL,
  version       bigint,
  created_by    uuid,
  id            uuid                  NOT NULL,
  permission_id uuid                  NOT NULL,
  role_id       uuid                  NOT NULL,
  tenant_id     uuid                  NOT NULL,
  updated_by    uuid,
  scope         character varying(20) NOT NULL,
  CONSTRAINT role_permissions_scope_check CHECK (((scope)::text = ANY ((ARRAY['ALL':: character varying, 'LOCATION':: character varying, 'DEPARTMENT':: character varying, 'TEAM':: character varying, 'SELF':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.role_permissions OWNER TO hrms;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.roles
(
  is_deleted     boolean                NOT NULL,
  is_system_role boolean                NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  id             uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  code           character varying(50)  NOT NULL,
  name           character varying(100) NOT NULL,
  description    character varying(500)
);


ALTER TABLE public.roles OWNER TO hrms;

--
-- Name: roster_entries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.roster_entries
(
  acknowledged_date date,
  is_acknowledged   boolean,
  is_deleted        boolean NOT NULL,
  is_overtime       boolean,
  is_published      boolean,
  work_date         date    NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  employee_id       uuid    NOT NULL,
  id                uuid    NOT NULL,
  roster_id         uuid    NOT NULL,
  shift_id          uuid    NOT NULL,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid,
  day_type          character varying(255),
  notes             character varying(255),
  CONSTRAINT roster_entries_day_type_check CHECK (((day_type)::text = ANY ((ARRAY['WORKING':: character varying, 'WEEKLY_OFF':: character varying, 'HOLIDAY':: character varying, 'LEAVE':: character varying, 'COMP_OFF':: character varying, 'TRAINING':: character varying])::text[])
) )
);


ALTER TABLE public.roster_entries OWNER TO hrms;

--
-- Name: rosters; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.rosters
(
  end_date         date                   NOT NULL,
  is_deleted       boolean                NOT NULL,
  is_recurring     boolean,
  published_date   date,
  recurrence_weeks integer,
  start_date       date                   NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  department_id    uuid,
  id               uuid                   NOT NULL,
  published_by     uuid,
  team_id          uuid,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  name             character varying(255) NOT NULL,
  notes            text,
  pattern_type     character varying(255),
  status           character varying(255),
  CONSTRAINT rosters_pattern_type_check CHECK (((pattern_type)::text = ANY ((ARRAY['FIXED':: character varying, 'ROTATING':: character varying, 'FLEXIBLE':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT rosters_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'PUBLISHED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE public.rosters OWNER TO hrms;

--
-- Name: salary_revisions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.salary_revisions
(
  approved_date        date,
  currency             character varying(3),
  effective_date       date                   NOT NULL,
  increment_amount     numeric(12, 2),
  increment_percentage numeric(5, 2),
  is_deleted           boolean                NOT NULL,
  letter_generated     boolean,
  new_salary           numeric(12, 2)         NOT NULL,
  payroll_processed    boolean,
  performance_rating   double precision,
  previous_salary      numeric(12, 2)         NOT NULL,
  proposed_date        date,
  reviewed_date        date,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  approved_by          uuid,
  created_by           uuid,
  employee_id          uuid                   NOT NULL,
  id                   uuid                   NOT NULL,
  letter_id            uuid,
  proposed_by          uuid,
  review_cycle_id      uuid,
  reviewed_by          uuid,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  new_level            character varying(50),
  previous_level       character varying(50),
  new_designation      character varying(100),
  previous_designation character varying(100),
  approver_comments    character varying(1000),
  rejection_reason     character varying(1000),
  reviewer_comments    character varying(1000),
  justification        character varying(2000),
  revision_type        character varying(255) NOT NULL,
  status               character varying(255) NOT NULL,
  CONSTRAINT salary_revisions_revision_type_check CHECK (((revision_type)::text = ANY ((ARRAY['ANNUAL_INCREMENT':: character varying, 'PROMOTION':: character varying, 'ROLE_CHANGE':: character varying, 'MARKET_ADJUSTMENT':: character varying, 'PERFORMANCE_BONUS':: character varying, 'SPECIAL_INCREMENT':: character varying, 'PROBATION_CONFIRMATION':: character varying, 'RETENTION':: character varying, 'CORRECTION':: character varying])::text[])
) ),
    CONSTRAINT salary_revisions_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_REVIEW'::character varying, 'REVIEWED'::character varying, 'PENDING_APPROVAL'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'APPLIED'::character varying])::text[])))
);


ALTER TABLE public.salary_revisions OWNER TO hrms;

--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.salary_structures
(
  basic_salary         numeric(12, 2) NOT NULL,
  conveyance_allowance numeric(12, 2),
  effective_date       date           NOT NULL,
  end_date             date,
  hra                  numeric(12, 2),
  income_tax           numeric(12, 2),
  is_active            boolean        NOT NULL,
  is_deleted           boolean        NOT NULL,
  medical_allowance    numeric(12, 2),
  other_allowances     numeric(12, 2),
  other_deductions     numeric(12, 2),
  professional_tax     numeric(12, 2),
  provident_fund       numeric(12, 2),
  special_allowance    numeric(12, 2),
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  employee_id          uuid           NOT NULL,
  id                   uuid           NOT NULL,
  tenant_id            uuid           NOT NULL,
  updated_by           uuid
);


ALTER TABLE public.salary_structures OWNER TO hrms;

--
-- Name: scheduled_reports; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.scheduled_reports
(
  day_of_month         integer,
  day_of_week          integer,
  is_active            boolean                NOT NULL,
  time_of_day          time(6) without time zone,
  created_at           timestamp(6) without time zone NOT NULL,
  last_run_at          timestamp(6) without time zone,
  next_run_at          timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  report_definition_id uuid                   NOT NULL,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  frequency            character varying(20)  NOT NULL,
  schedule_name        character varying(200) NOT NULL,
  parameters           text,
  recipients           text,
  CONSTRAINT scheduled_reports_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['DAILY':: character varying, 'WEEKLY':: character varying, 'MONTHLY':: character varying, 'QUARTERLY':: character varying, 'YEARLY':: character varying])::text[])
) )
);


ALTER TABLE public.scheduled_reports OWNER TO hrms;

--
-- Name: sentiment_analysis; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.sentiment_analysis
(
  confidence_score double precision,
  sentiment_score  double precision,
  created_at       timestamp(6) without time zone NOT NULL,
  id               uuid                  NOT NULL,
  source_id        uuid                  NOT NULL,
  tenant_id        uuid                  NOT NULL,
  sentiment        character varying(20) NOT NULL,
  ai_model_version character varying(50),
  source_type      character varying(50) NOT NULL,
  emotions         text,
  key_phrases      text,
  text_content     text,
  topics           text,
  CONSTRAINT sentiment_analysis_sentiment_check CHECK (((sentiment)::text = ANY ((ARRAY['POSITIVE':: character varying, 'NEUTRAL':: character varying, 'NEGATIVE':: character varying, 'MIXED':: character varying])::text[])
) ),
    CONSTRAINT sentiment_analysis_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['SURVEY_RESPONSE'::character varying, 'EXIT_INTERVIEW'::character varying, 'FEEDBACK'::character varying, 'REVIEW_COMMENT'::character varying, 'SOCIAL_POST'::character varying, 'HELPDESK_TICKET'::character varying])::text[])))
);


ALTER TABLE public.sentiment_analysis OWNER TO hrms;

--
-- Name: shift_assignments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.shift_assignments
(
  assignment_date    date                  NOT NULL,
  effective_from     date                  NOT NULL,
  effective_to       date,
  is_recurring       boolean,
  created_at         timestamp(6) without time zone NOT NULL,
  updated_at         timestamp(6) without time zone NOT NULL,
  version            bigint,
  assigned_by        uuid,
  created_by         uuid,
  employee_id        uuid                  NOT NULL,
  id                 uuid                  NOT NULL,
  shift_id           uuid                  NOT NULL,
  tenant_id          uuid                  NOT NULL,
  updated_by         uuid,
  assignment_type    character varying(20) NOT NULL,
  status             character varying(20) NOT NULL,
  recurrence_pattern character varying(50),
  notes              text,
  CONSTRAINT shift_assignments_assignment_type_check CHECK (((assignment_type)::text = ANY ((ARRAY['PERMANENT':: character varying, 'TEMPORARY':: character varying, 'ROTATION':: character varying, 'OVERRIDE':: character varying])::text[])
) ),
    CONSTRAINT shift_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'PENDING'::character varying])::text[])))
);


ALTER TABLE public.shift_assignments OWNER TO hrms;

--
-- Name: shift_swap_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.shift_swap_requests
(
  requester_shift_date     date                  NOT NULL,
  target_shift_date        date,
  approved_at              timestamp(6) without time zone,
  completed_at             timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  rejected_at              timestamp(6) without time zone,
  requested_at             timestamp(6) without time zone NOT NULL,
  target_employee_response timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  approver_id              uuid,
  id                       uuid                  NOT NULL,
  requester_assignment_id  uuid                  NOT NULL,
  requester_employee_id    uuid                  NOT NULL,
  target_assignment_id     uuid,
  target_employee_id       uuid,
  tenant_id                uuid                  NOT NULL,
  status                   character varying(20) NOT NULL,
  swap_type                character varying(20) NOT NULL,
  target_employee_action   character varying(20),
  reason                   text,
  rejection_reason         text,
  CONSTRAINT shift_swap_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'TARGET_ACCEPTED':: character varying, 'TARGET_DECLINED':: character varying, 'PENDING_APPROVAL':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'COMPLETED':: character varying, 'CANCELLED':: character varying])::text[])
) ),
    CONSTRAINT shift_swap_requests_swap_type_check CHECK (((swap_type)::text = ANY ((ARRAY['SWAP'::character varying, 'GIVE_AWAY'::character varying, 'PICK_UP'::character varying])::text[])))
);


ALTER TABLE public.shift_swap_requests OWNER TO hrms;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.shifts
(
  allows_overtime         boolean,
  break_duration_minutes  integer,
  end_time                time(6) without time zone NOT NULL,
  full_day_hours          numeric(4, 2),
  grace_period_in_minutes integer,
  half_day_after_minutes  integer,
  is_active               boolean,
  is_night_shift          boolean,
  late_mark_after_minutes integer,
  overtime_multiplier     numeric(3, 2),
  start_time              time(6) without time zone NOT NULL,
  color_code              character varying(7),
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  id                      uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  shift_type              character varying(20),
  shift_code              character varying(50)  NOT NULL,
  working_days            character varying(50)  NOT NULL,
  shift_name              character varying(100) NOT NULL,
  description             text,
  CONSTRAINT shifts_shift_type_check CHECK (((shift_type)::text = ANY ((ARRAY['FIXED':: character varying, 'ROTATING':: character varying, 'FLEXIBLE':: character varying, 'SPLIT':: character varying])::text[])
) )
);


ALTER TABLE public.shifts OWNER TO hrms;

--
-- Name: signature_approvals; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.signature_approvals
(
  is_required          boolean,
  reminder_count       integer,
  signing_order        integer,
  created_at           timestamp(6) without time zone NOT NULL,
  declined_at          timestamp(6) without time zone,
  last_reminded_at     timestamp(6) without time zone,
  sent_at              timestamp(6) without time zone,
  signed_at            timestamp(6) without time zone,
  token_expires_at     timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone,
  viewed_at            timestamp(6) without time zone,
  id                   uuid                   NOT NULL,
  signature_request_id uuid                   NOT NULL,
  signer_id            uuid,
  tenant_id            uuid                   NOT NULL,
  signature_ip         character varying(45),
  signature_method     character varying(50),
  status               character varying(50)  NOT NULL,
  signer_role          character varying(100),
  authentication_token character varying(500),
  comments             text,
  decline_reason       text,
  signature_data       text,
  signature_device     character varying(255),
  signer_email         character varying(255) NOT NULL,
  CONSTRAINT signature_approvals_signature_method_check CHECK (((signature_method)::text = ANY ((ARRAY['TYPED':: character varying, 'DRAWN':: character varying, 'UPLOADED':: character varying, 'DIGITAL_CERT':: character varying, 'BIOMETRIC':: character varying, 'OTP':: character varying, 'AADHAAR_ESIGN':: character varying])::text[])
) ),
    CONSTRAINT signature_approvals_signer_role_check CHECK (((signer_role)::text = ANY ((ARRAY['EMPLOYEE'::character varying, 'HR'::character varying, 'MANAGER'::character varying, 'DIRECTOR'::character varying, 'CEO'::character varying, 'LEGAL'::character varying, 'FINANCE'::character varying, 'WITNESS'::character varying, 'EXTERNAL'::character varying])::text[]))),
    CONSTRAINT signature_approvals_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SENT'::character varying, 'VIEWED'::character varying, 'SIGNED'::character varying, 'DECLINED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.signature_approvals OWNER TO hrms;

--
-- Name: signature_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.signature_requests
(
  is_template             boolean,
  received_signatures     integer,
  reminder_frequency_days integer,
  required_signatures     integer,
  signature_order         boolean                NOT NULL,
  cancelled_at            timestamp(6) without time zone,
  completed_at            timestamp(6) without time zone,
  created_at              timestamp(6) without time zone NOT NULL,
  document_size           bigint,
  expires_at              timestamp(6) without time zone,
  last_reminder_sent_at   timestamp(6) without time zone,
  updated_at              timestamp(6) without time zone,
  cancelled_by            uuid,
  created_by              uuid                   NOT NULL,
  id                      uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  status                  character varying(50)  NOT NULL,
  document_type           character varying(100) NOT NULL,
  mime_type               character varying(100),
  document_name           character varying(500),
  title                   character varying(500) NOT NULL,
  document_url            character varying(1000),
  cancellation_reason     text,
  description             text,
  metadata                text,
  template_name           character varying(255),
  CONSTRAINT signature_requests_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['OFFER_LETTER':: character varying, 'EMPLOYMENT_CONTRACT':: character varying, 'NDA':: character varying, 'POLICY_ACKNOWLEDGEMENT':: character varying, 'APPRAISAL_LETTER':: character varying, 'RESIGNATION_ACCEPTANCE':: character varying, 'PROMOTION_LETTER':: character varying, 'TRANSFER_LETTER':: character varying, 'SALARY_REVISION':: character varying, 'BONUS_LETTER':: character varying, 'TRAINING_AGREEMENT':: character varying, 'EXPENSE_APPROVAL':: character varying, 'LEAVE_APPROVAL':: character varying, 'PERFORMANCE_REVIEW':: character varying, 'WARNING_LETTER':: character varying, 'TERMINATION_LETTER':: character varying, 'EXIT_FORMALITIES':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT signature_requests_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying, 'DECLINED'::character varying])::text[])))
);


ALTER TABLE public.signature_requests OWNER TO hrms;

--
-- Name: skill_gaps; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.skill_gaps
(
  analysis_date              date                   NOT NULL,
  avg_proficiency_level      numeric(3, 1),
  current_supply             integer,
  estimated_attrition_loss   integer,
  estimated_hiring_cost      numeric(12, 2),
  estimated_retirement_loss  integer,
  estimated_training_cost    numeric(12, 2),
  gap_count                  integer,
  gap_severity               numeric(5, 2),
  is_deleted                 boolean                NOT NULL,
  proficiency_gap            numeric(3, 1),
  projected_demand_growth    numeric(5, 2),
  projection_date            date,
  required_proficiency_level numeric(3, 1),
  required_supply            integer,
  time_to_close_months       integer,
  training_available         boolean,
  created_at                 timestamp(6) without time zone NOT NULL,
  updated_at                 timestamp(6) without time zone NOT NULL,
  version                    bigint,
  created_by                 uuid,
  department_id              uuid,
  id                         uuid                   NOT NULL,
  tenant_id                  uuid                   NOT NULL,
  updated_by                 uuid,
  department_name            character varying(255),
  job_family                 character varying(255),
  priority                   character varying(255),
  resolution_strategy        character varying(255),
  skill_category             character varying(255),
  skill_name                 character varying(255) NOT NULL,
  CONSTRAINT skill_gaps_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT skill_gaps_resolution_strategy_check CHECK (((resolution_strategy)::text = ANY ((ARRAY['HIRE'::character varying, 'TRAIN'::character varying, 'OUTSOURCE'::character varying, 'HYBRID'::character varying, 'NOT_DETERMINED'::character varying])::text[])))
);


ALTER TABLE public.skill_gaps OWNER TO hrms;

--
-- Name: smart_recommendations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.smart_recommendations
(
  confidence_score    double precision,
  is_acted_upon       boolean,
  was_useful          boolean,
  created_at          timestamp(6) without time zone NOT NULL,
  expires_at          timestamp(6) without time zone,
  id                  uuid                  NOT NULL,
  target_id           uuid                  NOT NULL,
  tenant_id           uuid                  NOT NULL,
  priority            character varying(20),
  ai_model_version    character varying(50),
  recommendation_type character varying(50) NOT NULL,
  target_type         character varying(50) NOT NULL,
  action_taken        text,
  recommendation_data text,
  CONSTRAINT smart_recommendations_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'URGENT':: character varying])::text[])
) ),
    CONSTRAINT smart_recommendations_recommendation_type_check CHECK (((recommendation_type)::text = ANY ((ARRAY['LEARNING_PATH'::character varying, 'CAREER_DEVELOPMENT'::character varying, 'SKILL_DEVELOPMENT'::character varying, 'TEAM_ASSIGNMENT'::character varying, 'MENTOR_MATCH'::character varying, 'TRAINING_COURSE'::character varying, 'ROLE_SUITABILITY'::character varying, 'SUCCESSION_CANDIDATE'::character varying])::text[]))),
    CONSTRAINT smart_recommendations_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['EMPLOYEE'::character varying, 'MANAGER'::character varying, 'JOB_OPENING'::character varying, 'TRAINING_PROGRAM'::character varying, 'PROJECT'::character varying])::text[])))
);


ALTER TABLE public.smart_recommendations OWNER TO hrms;

--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.social_posts
(
  comments_count         integer,
  is_deleted             boolean,
  is_pinned              boolean,
  likes_count            integer,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone,
  author_id              uuid                  NOT NULL,
  celebrated_employee_id uuid,
  id                     uuid                  NOT NULL,
  tenant_id              uuid                  NOT NULL,
  visibility             character varying(20),
  celebration_type       character varying(50),
  post_type              character varying(50) NOT NULL,
  achievement_title      character varying(500),
  content                text,
  media_urls             text,
  CONSTRAINT social_posts_post_type_check CHECK (((post_type)::text = ANY ((ARRAY['POST':: character varying, 'POLL':: character varying, 'PRAISE':: character varying, 'CELEBRATION':: character varying, 'ANNOUNCEMENT':: character varying])::text[])
) ),
    CONSTRAINT social_posts_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['ORGANIZATION'::character varying, 'DEPARTMENT'::character varying, 'TEAM'::character varying, 'PUBLIC'::character varying, 'PRIVATE'::character varying])::text[])))
);


ALTER TABLE public.social_posts OWNER TO hrms;

--
-- Name: step_executions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.step_executions
(
  delegated              boolean                NOT NULL,
  escalated              boolean                NOT NULL,
  is_deleted             boolean                NOT NULL,
  reminder_count         integer                NOT NULL,
  step_order             integer                NOT NULL,
  time_taken_hours       double precision,
  assigned_at            timestamp(6) without time zone,
  created_at             timestamp(6) without time zone NOT NULL,
  deadline               timestamp(6) without time zone,
  escalated_at           timestamp(6) without time zone,
  executed_at            timestamp(6) without time zone,
  last_reminder_sent_at  timestamp(6) without time zone,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  action_by_user_id      uuid,
  approval_step_id       uuid                   NOT NULL,
  assigned_to_user_id    uuid,
  created_by             uuid,
  delegated_from_user_id uuid,
  escalated_to_user_id   uuid,
  id                     uuid                   NOT NULL,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  workflow_execution_id  uuid                   NOT NULL,
  action                 character varying(255),
  action_by_user_name    character varying(255),
  action_device_info     character varying(255),
  action_ip_address      character varying(255),
  alternative_approvers  character varying(255),
  assigned_to_user_name  character varying(255),
  attachments_json       text,
  comments               text,
  status                 character varying(255) NOT NULL,
  step_name              character varying(255),
  CONSTRAINT step_executions_action_check CHECK (((action)::text = ANY ((ARRAY['APPROVE':: character varying, 'REJECT':: character varying, 'RETURN_FOR_MODIFICATION':: character varying, 'DELEGATE':: character varying, 'ESCALATE':: character varying, 'SKIP':: character varying, 'HOLD':: character varying])::text[])
) ),
    CONSTRAINT step_executions_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'SKIPPED'::character varying, 'ESCALATED'::character varying, 'DELEGATED'::character varying, 'EXPIRED'::character varying, 'RETURNED'::character varying])::text[])))
);


ALTER TABLE public.step_executions OWNER TO hrms;

--
-- Name: succession_candidates; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.succession_candidates
(
  estimated_ready_date date,
  is_confidential      boolean,
  is_deleted           boolean                NOT NULL,
  priority             integer,
  created_at           timestamp(6) without time zone NOT NULL,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  candidate_id         uuid                   NOT NULL,
  created_by           uuid,
  id                   uuid                   NOT NULL,
  succession_plan_id   uuid                   NOT NULL,
  tenant_id            uuid                   NOT NULL,
  updated_by           uuid,
  development_needs    text,
  development_plan     text,
  gaps                 text,
  notes                text,
  performance_rating   character varying(255),
  potential_rating     character varying(255),
  readiness            character varying(255) NOT NULL,
  strengths            text,
  CONSTRAINT succession_candidates_performance_rating_check CHECK (((performance_rating)::text = ANY ((ARRAY['EXCEPTIONAL':: character varying, 'EXCEEDS_EXPECTATIONS':: character varying, 'MEETS_EXPECTATIONS':: character varying, 'NEEDS_IMPROVEMENT':: character varying, 'UNSATISFACTORY':: character varying])::text[])
) ),
    CONSTRAINT succession_candidates_potential_rating_check CHECK (((potential_rating)::text = ANY ((ARRAY['HIGH'::character varying, 'MEDIUM'::character varying, 'LOW'::character varying, 'UNCLEAR'::character varying])::text[]))),
    CONSTRAINT succession_candidates_readiness_check CHECK (((readiness)::text = ANY ((ARRAY['READY_NOW'::character varying, 'READY_1_YEAR'::character varying, 'READY_2_YEARS'::character varying, 'READY_3_PLUS_YEARS'::character varying, 'DEVELOPMENTAL'::character varying])::text[])))
);


ALTER TABLE public.succession_candidates OWNER TO hrms;

--
-- Name: succession_plans; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.succession_plans
(
  expected_vacancy_date date,
  is_deleted            boolean NOT NULL,
  created_at            timestamp(6) without time zone NOT NULL,
  last_reviewed_at      timestamp(6) without time zone,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  created_by            uuid,
  current_incumbent_id  uuid,
  id                    uuid    NOT NULL,
  last_reviewed_by      uuid,
  position_id           uuid    NOT NULL,
  tenant_id             uuid    NOT NULL,
  updated_by            uuid,
  notes                 text,
  risk_level            character varying(255),
  risk_reason           character varying(255),
  status                character varying(255),
  CONSTRAINT succession_plans_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT succession_plans_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'ACTIVE'::character varying, 'UNDER_REVIEW'::character varying, 'COMPLETED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE public.succession_plans OWNER TO hrms;

--
-- Name: survey_answers; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.survey_answers
(
  nps_score        integer,
  numeric_answer   double precision,
  rating_answer    integer,
  seconds_spent    integer,
  selected_option  integer,
  sentiment_score  double precision,
  weighted_score   double precision,
  answered_at      timestamp(6) without time zone,
  id               uuid NOT NULL,
  question_id      uuid NOT NULL,
  response_id      uuid NOT NULL,
  tenant_id        uuid NOT NULL,
  key_phrases      character varying(255),
  ranking          character varying(255),
  selected_options character varying(255),
  sentiment_level  character varying(255),
  text_answer      text,
  topics           character varying(255),
  CONSTRAINT survey_answers_sentiment_level_check CHECK (((sentiment_level)::text = ANY ((ARRAY['VERY_NEGATIVE':: character varying, 'NEGATIVE':: character varying, 'NEUTRAL':: character varying, 'POSITIVE':: character varying, 'VERY_POSITIVE':: character varying])::text[])
) )
);


ALTER TABLE public.survey_answers OWNER TO hrms;

--
-- Name: survey_insights; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.survey_insights
(
  affected_employees integer,
  confidence_score   double precision,
  impact_score       double precision,
  is_acknowledged    boolean                NOT NULL,
  percentage_change  double precision,
  trend_period_weeks integer,
  acknowledged_at    timestamp(6) without time zone,
  action_due_date    timestamp(6) without time zone,
  generated_at       timestamp(6) without time zone,
  acknowledged_by    uuid,
  assigned_to        uuid,
  department_id      uuid,
  id                 uuid                   NOT NULL,
  location_id        uuid,
  survey_id          uuid,
  tenant_id          uuid                   NOT NULL,
  title              character varying(500) NOT NULL,
  action_notes       character varying(255),
  action_status      character varying(255),
  category           character varying(255),
  description        text                   NOT NULL,
  insight_type       character varying(255) NOT NULL,
  key_themes         character varying(255),
  priority           character varying(255) NOT NULL,
  recommendation     text,
  related_questions  character varying(255),
  trend              character varying(255),
  CONSTRAINT survey_insights_action_status_check CHECK (((action_status)::text = ANY ((ARRAY['NEW':: character varying, 'ACKNOWLEDGED':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'DISMISSED':: character varying])::text[])
) ),
    CONSTRAINT survey_insights_category_check CHECK (((category)::text = ANY ((ARRAY['JOB_SATISFACTION'::character varying, 'WORK_ENVIRONMENT'::character varying, 'LEADERSHIP'::character varying, 'COMMUNICATION'::character varying, 'GROWTH_OPPORTUNITIES'::character varying, 'COMPENSATION_BENEFITS'::character varying, 'WORK_LIFE_BALANCE'::character varying, 'TEAM_COLLABORATION'::character varying, 'RECOGNITION'::character varying, 'COMPANY_CULTURE'::character varying, 'MANAGER_RELATIONSHIP'::character varying, 'AUTONOMY'::character varying, 'RESOURCES'::character varying, 'OVERALL_ENGAGEMENT'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT survey_insights_insight_type_check CHECK (((insight_type)::text = ANY ((ARRAY['STRENGTH'::character varying, 'WEAKNESS'::character varying, 'TREND_UP'::character varying, 'TREND_DOWN'::character varying, 'ANOMALY'::character varying, 'BENCHMARK_GAP'::character varying, 'SENTIMENT_ALERT'::character varying, 'ENGAGEMENT_RISK'::character varying, 'RETENTION_RISK'::character varying, 'MANAGER_FEEDBACK'::character varying, 'DEPARTMENT_COMPARISON'::character varying, 'RECOMMENDATION'::character varying])::text[]))),
    CONSTRAINT survey_insights_priority_check CHECK (((priority)::text = ANY ((ARRAY['CRITICAL'::character varying, 'HIGH'::character varying, 'MEDIUM'::character varying, 'LOW'::character varying, 'INFORMATIONAL'::character varying])::text[]))),
    CONSTRAINT survey_insights_trend_check CHECK (((trend)::text = ANY ((ARRAY['IMPROVING'::character varying, 'STABLE'::character varying, 'DECLINING'::character varying, 'VOLATILE'::character varying])::text[])))
);


ALTER TABLE public.survey_insights OWNER TO hrms;

--
-- Name: survey_questions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.survey_questions
(
  is_required            boolean                NOT NULL,
  max_scale              integer,
  min_scale              integer,
  question_order         integer                NOT NULL,
  weight                 double precision,
  created_at             timestamp(6) without time zone,
  depends_on_question_id uuid,
  id                     uuid                   NOT NULL,
  survey_id              uuid                   NOT NULL,
  tenant_id              uuid                   NOT NULL,
  depends_on_answer      character varying(255),
  engagement_category    character varying(255),
  max_label              character varying(255),
  min_label              character varying(255),
  options                text,
  question_text          text                   NOT NULL,
  question_type          character varying(255) NOT NULL,
  CONSTRAINT survey_questions_engagement_category_check CHECK (((engagement_category)::text = ANY ((ARRAY['JOB_SATISFACTION':: character varying, 'WORK_ENVIRONMENT':: character varying, 'LEADERSHIP':: character varying, 'COMMUNICATION':: character varying, 'GROWTH_OPPORTUNITIES':: character varying, 'COMPENSATION_BENEFITS':: character varying, 'WORK_LIFE_BALANCE':: character varying, 'TEAM_COLLABORATION':: character varying, 'RECOGNITION':: character varying, 'COMPANY_CULTURE':: character varying, 'MANAGER_RELATIONSHIP':: character varying, 'AUTONOMY':: character varying, 'RESOURCES':: character varying, 'OVERALL_ENGAGEMENT':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT survey_questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['SINGLE_CHOICE'::character varying, 'MULTIPLE_CHOICE'::character varying, 'LIKERT_SCALE'::character varying, 'RATING'::character varying, 'NET_PROMOTER_SCORE'::character varying, 'TEXT_SHORT'::character varying, 'TEXT_LONG'::character varying, 'RANKING'::character varying, 'MATRIX'::character varying, 'DATE'::character varying, 'NUMBER'::character varying])::text[])))
);


ALTER TABLE public.survey_questions OWNER TO hrms;

--
-- Name: survey_responses; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.survey_responses
(
  completion_time_minutes integer                NOT NULL,
  engagement_score        double precision,
  nps_score               double precision,
  sentiment_score         double precision,
  tenure_months           integer,
  created_at              timestamp(6) without time zone,
  started_at              timestamp(6) without time zone,
  submitted_at            timestamp(6) without time zone,
  employee_id             uuid,
  id                      uuid                   NOT NULL,
  survey_id               uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  anonymous_id            character varying(255),
  department              character varying(255),
  grade                   character varying(255),
  ip_address              character varying(255),
  location                character varying(255),
  overall_sentiment       character varying(255),
  status                  character varying(255) NOT NULL,
  user_agent              character varying(255),
  CONSTRAINT survey_responses_overall_sentiment_check CHECK (((overall_sentiment)::text = ANY ((ARRAY['VERY_NEGATIVE':: character varying, 'NEGATIVE':: character varying, 'NEUTRAL':: character varying, 'POSITIVE':: character varying, 'VERY_POSITIVE':: character varying])::text[])
) ),
    CONSTRAINT survey_responses_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'PARTIAL'::character varying, 'DISQUALIFIED'::character varying])::text[])))
);


ALTER TABLE public.survey_responses OWNER TO hrms;

--
-- Name: surveys; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.surveys
(
  is_anonymous    boolean,
  total_responses integer,
  created_at      timestamp(6) without time zone,
  end_date        timestamp(6) without time zone,
  start_date      timestamp(6) without time zone,
  updated_at      timestamp(6) without time zone,
  version         bigint,
  created_by      uuid,
  id              uuid                   NOT NULL,
  tenant_id       uuid                   NOT NULL,
  status          character varying(20),
  survey_code     character varying(50)  NOT NULL,
  survey_type     character varying(50),
  target_audience character varying(50),
  title           character varying(200) NOT NULL,
  description     text,
  CONSTRAINT surveys_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'ACTIVE':: character varying, 'PAUSED':: character varying, 'COMPLETED':: character varying, 'ARCHIVED':: character varying])::text[])
) ),
    CONSTRAINT surveys_survey_type_check CHECK (((survey_type)::text = ANY ((ARRAY['ENGAGEMENT'::character varying, 'SATISFACTION'::character varying, 'PULSE'::character varying, 'EXIT'::character varying, 'FEEDBACK'::character varying, 'CUSTOM'::character varying])::text[])))
);


ALTER TABLE public.surveys OWNER TO hrms;

--
-- Name: talent_pool_members; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.talent_pool_members
(
  added_date     date,
  is_deleted     boolean NOT NULL,
  review_date    date,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  added_by       uuid,
  created_by     uuid,
  employee_id    uuid    NOT NULL,
  id             uuid    NOT NULL,
  talent_pool_id uuid    NOT NULL,
  tenant_id      uuid    NOT NULL,
  updated_by     uuid,
  notes          text,
  status         character varying(255),
  CONSTRAINT talent_pool_members_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'ON_HOLD':: character varying, 'GRADUATED':: character varying, 'REMOVED':: character varying])::text[])
) )
);


ALTER TABLE public.talent_pool_members OWNER TO hrms;

--
-- Name: talent_pools; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.talent_pools
(
  is_active    boolean,
  is_deleted   boolean                NOT NULL,
  member_count integer,
  created_at   timestamp(6) without time zone NOT NULL,
  updated_at   timestamp(6) without time zone NOT NULL,
  version      bigint,
  created_by   uuid,
  id           uuid                   NOT NULL,
  owner_id     uuid,
  tenant_id    uuid                   NOT NULL,
  updated_by   uuid,
  criteria     text,
  description  text,
  name         character varying(255) NOT NULL,
  type         character varying(255),
  CONSTRAINT talent_pools_type_check CHECK (((type)::text = ANY ((ARRAY['HIGH_POTENTIAL':: character varying, 'LEADERSHIP':: character varying, 'TECHNICAL':: character varying, 'MANAGEMENT':: character varying, 'SPECIALIST':: character varying, 'EMERGING_TALENT':: character varying, 'CRITICAL_SKILLS':: character varying, 'CUSTOM':: character varying])::text[])
) )
);


ALTER TABLE public.talent_pools OWNER TO hrms;

--
-- Name: tax_declarations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tax_declarations
(
  estimated_tax               numeric(15, 2),
  hra_exemption               numeric(15, 2),
  hra_metro_city              boolean,
  hra_rent_paid               numeric(15, 2),
  other_income_capital_gains  numeric(15, 2),
  other_income_interest       numeric(15, 2),
  other_income_rental         numeric(15, 2),
  other_income_total          numeric(15, 2),
  previous_employer_income    numeric(15, 2),
  previous_employer_tax       numeric(15, 2),
  "sec d_parents"             numeric(15, 2),
  sec_24_home_loan_interest   numeric(15, 2),
  sec_80c_elss                numeric(15, 2),
  sec_80c_epf                 numeric(15, 2),
  sec_80c_home_loan_principal numeric(15, 2),
  sec_80c_life_insurance      numeric(15, 2),
  sec_80c_nps_employee        numeric(15, 2),
  sec_80c_nsc                 numeric(15, 2),
  sec_80c_ppf                 numeric(15, 2),
  sec_80c_sukanya_samriddhi   numeric(15, 2),
  sec_80c_total               numeric(15, 2),
  sec_80c_tuition_fees        numeric(15, 2),
  sec_80ccd_1b_nps_additional numeric(15, 2),
  sec_80d_preventive_health   numeric(15, 2),
  sec_80d_self_family         numeric(15, 2),
  sec_80d_total               numeric(15, 2),
  sec_80e_education_loan      numeric(15, 2),
  sec_80g_donations           numeric(15, 2),
  sec_80gg_rent_paid          numeric(15, 2),
  taxable_income              numeric(15, 2),
  total_deductions            numeric(15, 2),
  approved_at                 timestamp(6) without time zone,
  created_at                  timestamp(6) without time zone NOT NULL,
  locked_at                   timestamp(6) without time zone,
  rejected_at                 timestamp(6) without time zone,
  submitted_at                timestamp(6) without time zone,
  updated_at                  timestamp(6) without time zone,
  financial_year              character varying(10) NOT NULL,
  previous_employer_pan       character varying(10),
  approved_by                 uuid,
  employee_id                 uuid                  NOT NULL,
  id                          uuid                  NOT NULL,
  rejected_by                 uuid,
  tenant_id                   uuid                  NOT NULL,
  tax_regime                  character varying(20) NOT NULL,
  status                      character varying(50) NOT NULL,
  notes                       text,
  previous_employer_name      character varying(255),
  rejection_reason            text,
  CONSTRAINT tax_declarations_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'SUBMITTED':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'LOCKED':: character varying])::text[])
) ),
    CONSTRAINT tax_declarations_tax_regime_check CHECK (((tax_regime)::text = ANY ((ARRAY['OLD_REGIME'::character varying, 'NEW_REGIME'::character varying])::text[])))
);


ALTER TABLE public.tax_declarations OWNER TO hrms;

--
-- Name: tax_proofs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tax_proofs
(
  approved_amount    numeric(15, 2),
  declared_amount    numeric(15, 2),
  end_date           date,
  start_date         date,
  created_at         timestamp(6) without time zone NOT NULL,
  document_size      bigint,
  rejected_at        timestamp(6) without time zone,
  submitted_at       timestamp(6) without time zone,
  updated_at         timestamp(6) without time zone,
  verified_at        timestamp(6) without time zone,
  employee_id        uuid                   NOT NULL,
  id                 uuid                   NOT NULL,
  rejected_by        uuid,
  tax_declaration_id uuid                   NOT NULL,
  tenant_id          uuid                   NOT NULL,
  verified_by        uuid,
  document_type      character varying(50),
  investment_section character varying(50),
  status             character varying(50)  NOT NULL,
  certificate_number character varying(100),
  policy_number      character varying(100),
  proof_type         character varying(100) NOT NULL,
  document_name      character varying(500),
  proof_description  character varying(500),
  document_url       character varying(1000),
  issuer_name        character varying(255),
  rejection_reason   text,
  verification_notes text,
  CONSTRAINT tax_proofs_investment_section_check CHECK (((investment_section)::text = ANY ((ARRAY['SEC_80C':: character varying, 'SEC_80CCD_1B':: character varying, 'SEC_80D':: character varying, 'SEC_80E':: character varying, 'SEC_80G':: character varying, 'SEC_80GG':: character varying, 'SEC_24':: character varying, 'HRA':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT tax_proofs_proof_type_check CHECK (((proof_type)::text = ANY ((ARRAY['PPF_STATEMENT'::character varying, 'EPF_STATEMENT'::character varying, 'LIFE_INSURANCE_PREMIUM'::character varying, 'ELSS_INVESTMENT'::character varying, 'NSC_CERTIFICATE'::character varying, 'HOME_LOAN_CERTIFICATE'::character varying, 'TUITION_FEE_RECEIPT'::character varying, 'SUKANYA_SAMRIDDHI_STATEMENT'::character varying, 'NPS_STATEMENT'::character varying, 'HEALTH_INSURANCE_PREMIUM'::character varying, 'PREVENTIVE_HEALTH_CHECKUP'::character varying, 'EDUCATION_LOAN_CERTIFICATE'::character varying, 'DONATION_RECEIPT'::character varying, 'RENT_RECEIPT'::character varying, 'LANDLORD_PAN'::character varying, 'FORM_16'::character varying, 'INTEREST_CERTIFICATE'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT tax_proofs_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'VERIFIED'::character varying, 'REJECTED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.tax_proofs OWNER TO hrms;

--
-- Name: tax_regime_comparisons; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tax_regime_comparisons
(
  gross_salary                numeric(15, 2),
  new_regime_cess             numeric(15, 2),
  new_regime_rebate           numeric(15, 2),
  new_regime_tax              numeric(15, 2),
  new_regime_taxable_income   numeric(15, 2),
  new_regime_total_tax        numeric(15, 2),
  old_regime_cess             numeric(15, 2),
  old_regime_tax              numeric(15, 2),
  old_regime_taxable_income   numeric(15, 2),
  old_regime_total_deductions numeric(15, 2),
  old_regime_total_tax        numeric(15, 2),
  standard_deduction          numeric(15, 2),
  tax_savings                 numeric(15, 2),
  created_at                  timestamp(6) without time zone NOT NULL,
  updated_at                  timestamp(6) without time zone,
  financial_year              character varying(10) NOT NULL,
  employee_id                 uuid                  NOT NULL,
  id                          uuid                  NOT NULL,
  tenant_id                   uuid                  NOT NULL,
  recommended_regime          character varying(20),
  selected_regime             character varying(20),
  calculation_details         text,
  CONSTRAINT tax_regime_comparisons_recommended_regime_check CHECK (((recommended_regime)::text = ANY ((ARRAY['OLD_REGIME':: character varying, 'NEW_REGIME':: character varying])::text[])
) ),
    CONSTRAINT tax_regime_comparisons_selected_regime_check CHECK (((selected_regime)::text = ANY ((ARRAY['OLD_REGIME'::character varying, 'NEW_REGIME'::character varying])::text[])))
);


ALTER TABLE public.tax_regime_comparisons OWNER TO hrms;

--
-- Name: tds_slabs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tds_slabs
(
  is_active       boolean               NOT NULL,
  max_income      numeric(12, 2),
  min_income      numeric(12, 2)        NOT NULL,
  tax_percentage  numeric(5, 2)         NOT NULL,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone,
  assessment_year character varying(10) NOT NULL,
  created_by      uuid,
  id              uuid                  NOT NULL,
  tenant_id       uuid                  NOT NULL,
  updated_by      uuid,
  tax_regime      character varying(20) NOT NULL,
  CONSTRAINT tds_slabs_tax_regime_check CHECK (((tax_regime)::text = ANY ((ARRAY['OLD_REGIME':: character varying, 'NEW_REGIME':: character varying])::text[])
) )
);


ALTER TABLE public.tds_slabs OWNER TO hrms;

--
-- Name: template_instantiations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.template_instantiations
(
  is_deleted             boolean                NOT NULL,
  created_at             timestamp(6) without time zone NOT NULL,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  id                     uuid                   NOT NULL,
  template_id            uuid,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  generated_document_url character varying(500),
  title                  character varying(500) NOT NULL,
  content                jsonb                  NOT NULL,
  variable_values        jsonb
);


ALTER TABLE public.template_instantiations OWNER TO hrms;

--
-- Name: tenant_applications; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tenant_applications
(
  expires_at        date,
  is_deleted        boolean               NOT NULL,
  max_users         integer,
  activated_at      timestamp(6) without time zone,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  application_id    uuid                  NOT NULL,
  created_by        uuid,
  id                uuid                  NOT NULL,
  tenant_id         uuid                  NOT NULL,
  updated_by        uuid,
  status            character varying(20) NOT NULL,
  subscription_tier character varying(50),
  configuration     text,
  CONSTRAINT tenant_applications_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'TRIAL':: character varying, 'SUSPENDED':: character varying, 'EXPIRED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.tenant_applications OWNER TO hrms;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tenants
(
  is_deleted    boolean                NOT NULL,
  created_at    timestamp(6) without time zone NOT NULL,
  updated_at    timestamp(6) without time zone NOT NULL,
  version       bigint,
  created_by    uuid,
  id            uuid                   NOT NULL,
  updated_by    uuid,
  contact_phone character varying(20),
  status        character varying(20)  NOT NULL,
  code          character varying(50)  NOT NULL,
  contact_email character varying(100),
  name          character varying(200) NOT NULL,
  description   character varying(500),
  settings      text,
  CONSTRAINT tenants_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'SUSPENDED':: character varying, 'INACTIVE':: character varying, 'PENDING_ACTIVATION':: character varying])::text[])
) )
);


ALTER TABLE public.tenants OWNER TO hrms;

--
-- Name: ticket_categories; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.ticket_categories
(
  auto_close_after_days   integer,
  display_order           integer,
  is_active               boolean                NOT NULL,
  is_visible_to_employees boolean,
  requires_approval       boolean,
  sla_hours               integer,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone,
  approval_workflow_id    uuid,
  default_assignee_id     uuid,
  id                      uuid                   NOT NULL,
  parent_category_id      uuid,
  sla_id                  uuid,
  tenant_id               uuid                   NOT NULL,
  color                   character varying(20),
  department_type         character varying(30),
  code                    character varying(50),
  icon                    character varying(50),
  default_assignee_role   character varying(100),
  name                    character varying(100) NOT NULL,
  description             character varying(500),
  CONSTRAINT ticket_categories_department_type_check CHECK (((department_type)::text = ANY ((ARRAY['HR':: character varying, 'IT':: character varying, 'FINANCE':: character varying, 'PAYROLL':: character varying, 'ADMIN':: character varying, 'FACILITIES':: character varying, 'LEGAL':: character varying, 'COMPLIANCE':: character varying, 'OTHER':: character varying])::text[])
) )
);


ALTER TABLE public.ticket_categories OWNER TO hrms;

--
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.ticket_comments
(
  is_internal     boolean NOT NULL,
  created_at      timestamp(6) without time zone NOT NULL,
  updated_at      timestamp(6) without time zone,
  commenter_id    uuid    NOT NULL,
  id              uuid    NOT NULL,
  tenant_id       uuid    NOT NULL,
  ticket_id       uuid    NOT NULL,
  attachment_urls text,
  comment         text    NOT NULL
);


ALTER TABLE public.ticket_comments OWNER TO hrms;

--
-- Name: ticket_escalations; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.ticket_escalations
(
  is_auto_escalated boolean,
  acknowledged_at   timestamp(6) without time zone,
  created_at        timestamp(6) without time zone NOT NULL,
  escalated_at      timestamp(6) without time zone NOT NULL,
  acknowledged_by   uuid,
  escalated_from    uuid,
  escalated_to      uuid NOT NULL,
  id                uuid NOT NULL,
  tenant_id         uuid NOT NULL,
  ticket_id         uuid NOT NULL,
  escalation_level  character varying(20),
  escalation_reason character varying(30),
  notes             text,
  CONSTRAINT ticket_escalations_escalation_level_check CHECK (((escalation_level)::text = ANY ((ARRAY['FIRST':: character varying, 'SECOND':: character varying, 'CRITICAL':: character varying])::text[])
) ),
    CONSTRAINT ticket_escalations_escalation_reason_check CHECK (((escalation_reason)::text = ANY ((ARRAY['SLA_BREACH_RESPONSE'::character varying, 'SLA_BREACH_RESOLUTION'::character varying, 'MANUAL_ESCALATION'::character varying, 'CUSTOMER_REQUEST'::character varying, 'COMPLEXITY'::character varying])::text[])))
);


ALTER TABLE public.ticket_escalations OWNER TO hrms;

--
-- Name: ticket_metrics; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.ticket_metrics
(
  comment_count               integer,
  csat_rating                 integer,
  escalation_count            integer,
  first_contact_resolution    boolean,
  first_response_minutes      integer,
  first_response_sla_breached boolean,
  reassignment_count          integer,
  reopen_count                integer,
  resolution_minutes          integer,
  resolution_sla_breached     boolean,
  sla_met                     boolean,
  total_handle_time_minutes   integer,
  total_wait_time_minutes     integer,
  csat_submitted_at           timestamp(6) without time zone,
  first_response_at           timestamp(6) without time zone,
  resolution_at               timestamp(6) without time zone,
  updated_at                  timestamp(6) without time zone,
  id                          uuid NOT NULL,
  sla_id                      uuid,
  tenant_id                   uuid NOT NULL,
  ticket_id                   uuid NOT NULL,
  csat_feedback               text
);


ALTER TABLE public.ticket_metrics OWNER TO hrms;

--
-- Name: ticket_slas; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.ticket_slas
(
  apply_to_all_categories   boolean,
  business_end_hour         integer,
  business_start_hour       integer,
  escalation_after_minutes  integer,
  first_response_minutes    integer                NOT NULL,
  is_active                 boolean,
  is_business_hours_only    boolean,
  resolution_minutes        integer                NOT NULL,
  second_escalation_minutes integer,
  created_at                timestamp(6) without time zone NOT NULL,
  updated_at                timestamp(6) without time zone,
  category_id               uuid,
  escalation_to             uuid,
  id                        uuid                   NOT NULL,
  second_escalation_to      uuid,
  tenant_id                 uuid                   NOT NULL,
  priority                  character varying(20),
  working_days              character varying(50),
  name                      character varying(100) NOT NULL,
  description               text,
  CONSTRAINT ticket_slas_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'URGENT':: character varying])::text[])
) )
);


ALTER TABLE public.ticket_slas OWNER TO hrms;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.tickets
(
  current_escalation_level integer,
  first_response_breached  boolean,
  is_escalated             boolean,
  resolution_breached      boolean,
  satisfaction_rating      integer,
  assigned_at              timestamp(6) without time zone,
  closed_at                timestamp(6) without time zone,
  created_at               timestamp(6) without time zone NOT NULL,
  due_date                 timestamp(6) without time zone,
  first_response_at        timestamp(6) without time zone,
  first_response_due       timestamp(6) without time zone,
  resolution_due           timestamp(6) without time zone,
  resolved_at              timestamp(6) without time zone,
  updated_at               timestamp(6) without time zone,
  assigned_to              uuid,
  category_id              uuid,
  employee_id              uuid                   NOT NULL,
  id                       uuid                   NOT NULL,
  sla_id                   uuid,
  tenant_id                uuid                   NOT NULL,
  priority                 character varying(20)  NOT NULL,
  source                   character varying(30),
  status                   character varying(30)  NOT NULL,
  ticket_number            character varying(50)  NOT NULL,
  subject                  character varying(500) NOT NULL,
  tags                     character varying(500),
  attachment_urls          text,
  description              text,
  resolution_notes         text,
  satisfaction_feedback    text,
  CONSTRAINT tickets_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW':: character varying, 'MEDIUM':: character varying, 'HIGH':: character varying, 'URGENT':: character varying])::text[])
) ),
    CONSTRAINT tickets_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'IN_PROGRESS'::character varying, 'WAITING_FOR_RESPONSE'::character varying, 'RESOLVED'::character varying, 'CLOSED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.tickets OWNER TO hrms;

--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.time_entries
(
  approved_date    date,
  billable_hours   numeric(5, 2),
  billing_amount   numeric(12, 2),
  end_time         time(6) without time zone,
  entry_date       date          NOT NULL,
  hourly_rate      numeric(10, 2),
  hours_worked     numeric(5, 2) NOT NULL,
  is_billable      boolean,
  is_deleted       boolean       NOT NULL,
  start_time       time(6) without time zone,
  submitted_date   date,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  approved_by      uuid,
  client_id        uuid,
  created_by       uuid,
  employee_id      uuid          NOT NULL,
  id               uuid          NOT NULL,
  project_id       uuid,
  task_id          uuid,
  tenant_id        uuid          NOT NULL,
  updated_by       uuid,
  client_name      character varying(255),
  description      text,
  entry_type       character varying(255),
  external_ref     character varying(255),
  notes            text,
  rejection_reason character varying(255),
  status           character varying(255),
  CONSTRAINT time_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['REGULAR':: character varying, 'OVERTIME':: character varying, 'LEAVE':: character varying, 'HOLIDAY':: character varying, 'TRAINING':: character varying, 'MEETING':: character varying, 'BREAK':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT time_entries_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'BILLED'::character varying, 'PAID'::character varying])::text[])))
);


ALTER TABLE public.time_entries OWNER TO hrms;

--
-- Name: training_enrollments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.training_enrollments
(
  assessment_score      integer,
  attendance_percentage integer,
  certificate_issued    boolean,
  completion_date       date,
  enrollment_date       date,
  score_percentage      integer,
  completed_at          timestamp(6) without time zone,
  created_at            timestamp(6) without time zone,
  enrolled_at           timestamp(6) without time zone,
  updated_at            timestamp(6) without time zone,
  version               bigint,
  employee_id           uuid NOT NULL,
  id                    uuid NOT NULL,
  program_id            uuid NOT NULL,
  tenant_id             uuid NOT NULL,
  status                character varying(20),
  certificate_url       character varying(500),
  feedback              text,
  notes                 text,
  CONSTRAINT training_enrollments_status_check CHECK (((status)::text = ANY ((ARRAY['ENROLLED':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'DROPPED':: character varying, 'FAILED':: character varying, 'CANCELLED':: character varying])::text[])
) )
);


ALTER TABLE public.training_enrollments OWNER TO hrms;

--
-- Name: training_programs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.training_programs
(
  cost                     numeric(10, 2),
  cost_per_participant     numeric(10, 2),
  duration_hours           integer,
  end_date                 date,
  is_mandatory             boolean,
  max_participants         integer,
  start_date               date,
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  id                       uuid                   NOT NULL,
  instructor_id            uuid,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  status                   character varying(20),
  delivery_mode            character varying(30),
  category                 character varying(50),
  program_code             character varying(50)  NOT NULL,
  trainer_email            character varying(100),
  trainer_name             character varying(100),
  location                 character varying(200),
  program_name             character varying(200) NOT NULL,
  certificate_template_url character varying(500),
  materials_url            character varying(500),
  description              text,
  learning_objectives      text,
  prerequisites            text,
  CONSTRAINT training_programs_category_check CHECK (((category)::text = ANY ((ARRAY['TECHNICAL':: character varying, 'SOFT_SKILLS':: character varying, 'LEADERSHIP':: character varying, 'COMPLIANCE':: character varying, 'SAFETY':: character varying, 'PRODUCT':: character varying, 'SALES':: character varying, 'CUSTOMER_SERVICE':: character varying, 'OTHER':: character varying])::text[])
) ),
    CONSTRAINT training_programs_delivery_mode_check CHECK (((delivery_mode)::text = ANY ((ARRAY['IN_PERSON'::character varying, 'VIRTUAL'::character varying, 'HYBRID'::character varying, 'SELF_PACED'::character varying, 'WORKSHOP'::character varying])::text[]))),
    CONSTRAINT training_programs_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SCHEDULED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.training_programs OWNER TO hrms;

--
-- Name: travel_expenses; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.travel_expenses
(
  amount                  numeric(12, 2)         NOT NULL,
  amount_in_base_currency numeric(12, 2),
  approved_amount         numeric(12, 2),
  approved_date           date,
  exchange_rate           numeric(10, 4),
  expense_date            date,
  is_deleted              boolean                NOT NULL,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  approved_by             uuid,
  created_by              uuid,
  employee_id             uuid                   NOT NULL,
  id                      uuid                   NOT NULL,
  tenant_id               uuid                   NOT NULL,
  travel_request_id       uuid                   NOT NULL,
  updated_by              uuid,
  currency                character varying(255),
  description             character varying(255),
  expense_type            character varying(255) NOT NULL,
  receipt_number          character varying(255),
  receipt_path            character varying(255),
  rejection_reason        character varying(255),
  remarks                 character varying(255),
  status                  character varying(255),
  CONSTRAINT travel_expenses_expense_type_check CHECK (((expense_type)::text = ANY ((ARRAY['AIRFARE':: character varying, 'TRAIN_FARE':: character varying, 'BUS_FARE':: character varying, 'CAB_TAXI':: character varying, 'HOTEL':: character varying, 'MEALS':: character varying, 'LOCAL_TRANSPORT':: character varying, 'VISA_FEE':: character varying, 'TRAVEL_INSURANCE':: character varying, 'COMMUNICATION':: character varying, 'MISCELLANEOUS':: character varying])::text[])
) ),
    CONSTRAINT travel_expenses_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUBMITTED'::character varying, 'APPROVED'::character varying, 'PARTIALLY_APPROVED'::character varying, 'REJECTED'::character varying, 'REIMBURSED'::character varying])::text[])))
);


ALTER TABLE public.travel_expenses OWNER TO hrms;

--
-- Name: travel_requests; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.travel_requests
(
  accommodation_required boolean,
  advance_approved       numeric(12, 2),
  advance_disbursed_date date,
  advance_required       numeric(12, 2),
  approved_date          date,
  cab_required           boolean,
  check_in_date          date,
  check_out_date         date,
  departure_date         date,
  estimated_cost         numeric(12, 2),
  is_deleted             boolean                NOT NULL,
  is_international       boolean,
  return_date            date,
  submitted_date         date,
  visa_required          boolean,
  created_at             timestamp(6) without time zone NOT NULL,
  departure_time         timestamp(6) without time zone,
  return_time            timestamp(6) without time zone,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  approved_by            uuid,
  created_by             uuid,
  employee_id            uuid                   NOT NULL,
  id                     uuid                   NOT NULL,
  project_id             uuid,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  client_name            character varying(255),
  destination_city       character varying(255),
  hotel_preference       character varying(255),
  origin_city            character varying(255),
  purpose                text                   NOT NULL,
  rejection_reason       character varying(255),
  request_number         character varying(255),
  special_instructions   text,
  status                 character varying(255),
  transport_class        character varying(255),
  transport_mode         character varying(255),
  travel_type            character varying(255) NOT NULL,
  CONSTRAINT travel_requests_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'SUBMITTED':: character varying, 'PENDING_APPROVAL':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'BOOKED':: character varying, 'IN_PROGRESS':: character varying, 'COMPLETED':: character varying, 'CANCELLED':: character varying])::text[])
) ),
    CONSTRAINT travel_requests_transport_mode_check CHECK (((transport_mode)::text = ANY ((ARRAY['FLIGHT'::character varying, 'TRAIN'::character varying, 'BUS'::character varying, 'CAR'::character varying, 'SELF_ARRANGED'::character varying])::text[]))),
    CONSTRAINT travel_requests_travel_type_check CHECK (((travel_type)::text = ANY ((ARRAY['BUSINESS'::character varying, 'TRAINING'::character varying, 'CLIENT_VISIT'::character varying, 'CONFERENCE'::character varying, 'RELOCATION'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.travel_requests OWNER TO hrms;

--
-- Name: user_app_access; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_app_access
(
  is_deleted       boolean               NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  granted_at       timestamp(6) without time zone NOT NULL,
  last_accessed_at timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  application_id   uuid                  NOT NULL,
  created_by       uuid,
  granted_by       uuid,
  id               uuid                  NOT NULL,
  tenant_id        uuid                  NOT NULL,
  updated_by       uuid,
  user_id          uuid                  NOT NULL,
  status           character varying(20) NOT NULL,
  CONSTRAINT user_app_access_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'SUSPENDED':: character varying, 'REVOKED':: character varying, 'PENDING_APPROVAL':: character varying])::text[])
) )
);


ALTER TABLE public.user_app_access OWNER TO hrms;

--
-- Name: user_app_direct_permissions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_app_direct_permissions
(
  permission_id      uuid NOT NULL,
  user_app_access_id uuid NOT NULL
);


ALTER TABLE public.user_app_direct_permissions OWNER TO hrms;

--
-- Name: user_app_roles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_app_roles
(
  role_id            uuid NOT NULL,
  user_app_access_id uuid NOT NULL
);


ALTER TABLE public.user_app_roles OWNER TO hrms;

--
-- Name: user_basic_notification_preferences; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_basic_notification_preferences
(
  email_notifications boolean NOT NULL,
  is_deleted          boolean NOT NULL,
  push_notifications  boolean NOT NULL,
  security_alerts     boolean NOT NULL,
  sms_notifications   boolean NOT NULL,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid    NOT NULL,
  tenant_id           uuid    NOT NULL,
  updated_by          uuid,
  user_id             uuid    NOT NULL
);


ALTER TABLE public.user_basic_notification_preferences OWNER TO hrms;

--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_notification_preferences
(
  digest_time         time(6) without time zone,
  email_enabled       boolean,
  in_app_enabled      boolean,
  is_deleted          boolean                NOT NULL,
  push_enabled        boolean,
  quiet_hours_enabled boolean,
  quiet_hours_end     time(6) without time zone,
  quiet_hours_start   time(6) without time zone,
  slack_enabled       boolean,
  sms_enabled         boolean,
  teams_enabled       boolean,
  whatsapp_enabled    boolean,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  created_by          uuid,
  id                  uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  user_id             uuid                   NOT NULL,
  category            character varying(255) NOT NULL,
  digest_day          character varying(255),
  digest_frequency    character varying(255),
  minimum_priority    character varying(255),
  CONSTRAINT user_notification_preferences_minimum_priority_check CHECK (((minimum_priority)::text = ANY ((ARRAY['LOW':: character varying, 'NORMAL':: character varying, 'HIGH':: character varying, 'URGENT':: character varying])::text[])
) )
);


ALTER TABLE public.user_notification_preferences OWNER TO hrms;

--
-- Name: user_notification_quiet_days; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_notification_quiet_days
(
  preference_id uuid NOT NULL,
  day_of_week   character varying(255)
);


ALTER TABLE public.user_notification_quiet_days OWNER TO hrms;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.user_roles
(
  role_id uuid NOT NULL,
  user_id uuid NOT NULL
);


ALTER TABLE public.user_roles OWNER TO hrms;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.users
(
  failed_login_attempts       integer,
  is_deleted                  boolean                NOT NULL,
  mfa_enabled                 boolean                NOT NULL,
  created_at                  timestamp(6) without time zone NOT NULL,
  last_login_at               timestamp(6) without time zone,
  locked_until                timestamp(6) without time zone,
  mfa_setup_at                timestamp(6) without time zone,
  password_changed_at         timestamp(6) without time zone,
  password_reset_token_expiry timestamp(6) without time zone,
  updated_at                  timestamp(6) without time zone NOT NULL,
  version                     bigint,
  created_by                  uuid,
  id                          uuid                   NOT NULL,
  tenant_id                   uuid                   NOT NULL,
  updated_by                  uuid,
  status                      character varying(20)  NOT NULL,
  first_name                  character varying(100) NOT NULL,
  last_name                   character varying(100),
  mfa_secret                  character varying(100),
  email                       character varying(200) NOT NULL,
  profile_picture_url         character varying(500),
  mfa_backup_codes            text,
  password_hash               character varying(255) NOT NULL,
  password_reset_token        character varying(255),
  CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'INACTIVE':: character varying, 'LOCKED':: character varying, 'PENDING_ACTIVATION':: character varying])::text[])
) )
);


ALTER TABLE public.users OWNER TO hrms;

--
-- Name: verification_checks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.verification_checks
(
  end_date            date,
  is_critical         boolean,
  is_deleted          boolean                NOT NULL,
  start_date          date,
  verification_date   date,
  created_at          timestamp(6) without time zone NOT NULL,
  updated_at          timestamp(6) without time zone NOT NULL,
  version             bigint,
  bgv_id              uuid                   NOT NULL,
  created_by          uuid,
  employee_id         uuid                   NOT NULL,
  id                  uuid                   NOT NULL,
  tenant_id           uuid                   NOT NULL,
  updated_by          uuid,
  check_name          character varying(255),
  check_type          character varying(255) NOT NULL,
  discrepancy_details text,
  document_reference  character varying(255),
  institution_name    character varying(255),
  remarks             text,
  result              character varying(255),
  status              character varying(255),
  verifier_contact    character varying(255),
  verifier_name       character varying(255),
  CONSTRAINT verification_checks_check_type_check CHECK (((check_type)::text = ANY ((ARRAY['IDENTITY':: character varying, 'ADDRESS_CURRENT':: character varying, 'ADDRESS_PERMANENT':: character varying, 'EMPLOYMENT':: character varying, 'EDUCATION':: character varying, 'CRIMINAL':: character varying, 'CREDIT':: character varying, 'DRUG_TEST':: character varying, 'REFERENCE':: character varying, 'SOCIAL_MEDIA':: character varying, 'PROFESSIONAL_LICENSE':: character varying, 'GLOBAL_DATABASE':: character varying])::text[])
) ),
    CONSTRAINT verification_checks_result_check CHECK (((result)::text = ANY ((ARRAY['VERIFIED'::character varying, 'DISCREPANCY_MINOR'::character varying, 'DISCREPANCY_MAJOR'::character varying, 'NOT_VERIFIED'::character varying, 'PENDING'::character varying])::text[]))),
    CONSTRAINT verification_checks_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'UNABLE_TO_VERIFY'::character varying, 'SKIPPED'::character varying])::text[])))
);


ALTER TABLE public.verification_checks OWNER TO hrms;

--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.webhook_deliveries
(
  attempts         integer               NOT NULL,
  is_deleted       boolean               NOT NULL,
  response_status  integer,
  created_at       timestamp(6) without time zone NOT NULL,
  delivered_at     timestamp(6) without time zone,
  duration_ms      bigint,
  first_attempt_at timestamp(6) without time zone,
  last_attempt_at  timestamp(6) without time zone,
  next_retry_at    timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  id               uuid                  NOT NULL,
  tenant_id        uuid                  NOT NULL,
  updated_by       uuid,
  webhook_id       uuid                  NOT NULL,
  status           character varying(20) NOT NULL,
  event_id         character varying(50) NOT NULL,
  event_type       character varying(50) NOT NULL,
  error_message    character varying(1000),
  response_body    character varying(2000),
  payload          text,
  CONSTRAINT webhook_deliveries_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['ALL':: character varying, 'EMPLOYEE_CREATED':: character varying, 'EMPLOYEE_UPDATED':: character varying, 'EMPLOYEE_TERMINATED':: character varying, 'EMPLOYEE_PROMOTED':: character varying, 'EMPLOYEE_TRANSFERRED':: character varying, 'EMPLOYEE_STATUS_CHANGED':: character varying, 'EMPLOYEE_DEPARTMENT_CHANGED':: character varying, 'LEAVE_REQUESTED':: character varying, 'LEAVE_APPROVED':: character varying, 'LEAVE_REJECTED':: character varying, 'LEAVE_CANCELLED':: character varying, 'ATTENDANCE_CHECK_IN':: character varying, 'ATTENDANCE_CHECK_OUT':: character varying, 'ATTENDANCE_REGULARIZED':: character varying, 'PAYROLL_PROCESSED':: character varying, 'PAYSLIP_GENERATED':: character varying, 'REVIEW_STARTED':: character varying, 'REVIEW_COMPLETED':: character varying, 'GOAL_CREATED':: character varying, 'GOAL_UPDATED':: character varying, 'CANDIDATE_CREATED':: character varying, 'CANDIDATE_STATUS_CHANGED':: character varying, 'OFFER_CREATED':: character varying, 'OFFER_ACCEPTED':: character varying, 'OFFER_REJECTED':: character varying, 'DOCUMENT_UPLOADED':: character varying, 'DOCUMENT_SIGNED':: character varying, 'EXPENSE_SUBMITTED':: character varying, 'EXPENSE_APPROVED':: character varying, 'EXPENSE_REJECTED':: character varying, 'ASSET_ASSIGNED':: character varying, 'ASSET_RETURNED':: character varying, 'TRAINING_ENROLLED':: character varying, 'TRAINING_COMPLETED':: character varying])::text[])
) ),
    CONSTRAINT webhook_deliveries_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'DELIVERING'::character varying, 'DELIVERED'::character varying, 'RETRYING'::character varying, 'FAILED'::character varying])::text[])))
);


ALTER TABLE public.webhook_deliveries OWNER TO hrms;

--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.webhook_events
(
  webhook_id uuid NOT NULL,
  event_type character varying(255),
  CONSTRAINT webhook_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['ALL':: character varying, 'EMPLOYEE_CREATED':: character varying, 'EMPLOYEE_UPDATED':: character varying, 'EMPLOYEE_TERMINATED':: character varying, 'EMPLOYEE_PROMOTED':: character varying, 'EMPLOYEE_TRANSFERRED':: character varying, 'EMPLOYEE_STATUS_CHANGED':: character varying, 'EMPLOYEE_DEPARTMENT_CHANGED':: character varying, 'LEAVE_REQUESTED':: character varying, 'LEAVE_APPROVED':: character varying, 'LEAVE_REJECTED':: character varying, 'LEAVE_CANCELLED':: character varying, 'ATTENDANCE_CHECK_IN':: character varying, 'ATTENDANCE_CHECK_OUT':: character varying, 'ATTENDANCE_REGULARIZED':: character varying, 'PAYROLL_PROCESSED':: character varying, 'PAYSLIP_GENERATED':: character varying, 'REVIEW_STARTED':: character varying, 'REVIEW_COMPLETED':: character varying, 'GOAL_CREATED':: character varying, 'GOAL_UPDATED':: character varying, 'CANDIDATE_CREATED':: character varying, 'CANDIDATE_STATUS_CHANGED':: character varying, 'OFFER_CREATED':: character varying, 'OFFER_ACCEPTED':: character varying, 'OFFER_REJECTED':: character varying, 'DOCUMENT_UPLOADED':: character varying, 'DOCUMENT_SIGNED':: character varying, 'EXPENSE_SUBMITTED':: character varying, 'EXPENSE_APPROVED':: character varying, 'EXPENSE_REJECTED':: character varying, 'ASSET_ASSIGNED':: character varying, 'ASSET_RETURNED':: character varying, 'TRAINING_ENROLLED':: character varying, 'TRAINING_COMPLETED':: character varying])::text[])
) )
);


ALTER TABLE public.webhook_events OWNER TO hrms;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.webhooks
(
  consecutive_failures integer                 NOT NULL,
  include_payload      boolean                 NOT NULL,
  is_deleted           boolean                 NOT NULL,
  max_retries          integer                 NOT NULL,
  timeout_seconds      integer                 NOT NULL,
  created_at           timestamp(6) without time zone NOT NULL,
  last_failure_at      timestamp(6) without time zone,
  last_success_at      timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  id                   uuid                    NOT NULL,
  tenant_id            uuid                    NOT NULL,
  updated_by           uuid,
  status               character varying(20)   NOT NULL,
  name                 character varying(100)  NOT NULL,
  secret               character varying(256),
  description          character varying(500),
  last_error_message   character varying(1000),
  url                  character varying(2048) NOT NULL,
  custom_headers       text,
  CONSTRAINT webhooks_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE':: character varying, 'PAUSED':: character varying, 'DISABLED_FAILURES':: character varying, 'DELETED':: character varying])::text[])
) )
);


ALTER TABLE public.webhooks OWNER TO hrms;

--
-- Name: wellness_challenges; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wellness_challenges
(
  bonus_points_for_goal integer,
  daily_target          double precision,
  end_date              date,
  is_active             boolean,
  is_deleted            boolean                NOT NULL,
  is_team_based         boolean,
  leaderboard_enabled   boolean,
  max_participants      integer,
  min_participants      integer,
  points_per_completion integer,
  start_date            date,
  target_value          double precision,
  team_size             integer,
  created_at            timestamp(6) without time zone NOT NULL,
  updated_at            timestamp(6) without time zone NOT NULL,
  version               bigint,
  badge_id              uuid,
  created_by            uuid,
  id                    uuid                   NOT NULL,
  program_id            uuid,
  tenant_id             uuid                   NOT NULL,
  updated_by            uuid,
  challenge_type        character varying(255) NOT NULL,
  description           text,
  name                  character varying(255) NOT NULL,
  target_unit           character varying(255),
  tracking_type         character varying(255) NOT NULL,
  CONSTRAINT wellness_challenges_challenge_type_check CHECK (((challenge_type)::text = ANY ((ARRAY['STEPS':: character varying, 'DISTANCE':: character varying, 'CALORIES':: character varying, 'WORKOUT_MINUTES':: character varying, 'WATER_INTAKE':: character varying, 'SLEEP_HOURS':: character varying, 'MEDITATION_MINUTES':: character varying, 'HEALTHY_MEALS':: character varying, 'SCREEN_FREE_HOURS':: character varying, 'READING_MINUTES':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT wellness_challenges_tracking_type_check CHECK (((tracking_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'AUTOMATIC'::character varying, 'SELF_REPORTED'::character varying, 'VERIFICATION_REQUIRED'::character varying])::text[])))
);


ALTER TABLE public.wellness_challenges OWNER TO hrms;

--
-- Name: wellness_points; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wellness_points
(
  badges_earned        integer,
  challenges_completed integer,
  current_level        integer,
  current_streak       integer,
  is_deleted           boolean NOT NULL,
  lifetime_points      integer,
  longest_streak       integer,
  points_to_next_level integer,
  redeemable_points    integer,
  total_points         integer,
  created_at           timestamp(6) without time zone NOT NULL,
  last_activity_at     timestamp(6) without time zone,
  updated_at           timestamp(6) without time zone NOT NULL,
  version              bigint,
  created_by           uuid,
  employee_id          uuid    NOT NULL,
  id                   uuid    NOT NULL,
  tenant_id            uuid    NOT NULL,
  updated_by           uuid
);


ALTER TABLE public.wellness_points OWNER TO hrms;

--
-- Name: wellness_points_transactions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wellness_points_transactions
(
  balance_after    integer,
  is_deleted       boolean                NOT NULL,
  points           integer                NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  transaction_at   timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  employee_id      uuid                   NOT NULL,
  id               uuid                   NOT NULL,
  reference_id     uuid,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  description      character varying(255) NOT NULL,
  reference_type   character varying(255),
  transaction_type character varying(255) NOT NULL,
  CONSTRAINT wellness_points_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['EARNED':: character varying, 'REDEEMED':: character varying, 'BONUS':: character varying, 'EXPIRED':: character varying, 'ADJUSTMENT':: character varying])::text[])
) )
);


ALTER TABLE public.wellness_points_transactions OWNER TO hrms;

--
-- Name: wellness_programs; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wellness_programs
(
  budget_amount    numeric(12, 2),
  end_date         date,
  is_active        boolean,
  is_deleted       boolean                NOT NULL,
  is_featured      boolean,
  max_participants integer,
  points_reward    integer,
  start_date       date,
  created_at       timestamp(6) without time zone NOT NULL,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  created_by       uuid,
  id               uuid                   NOT NULL,
  tenant_id        uuid                   NOT NULL,
  updated_by       uuid,
  category         character varying(255) NOT NULL,
  description      text,
  external_link    character varying(255),
  image_url        character varying(255),
  instructions     text,
  name             character varying(255) NOT NULL,
  program_type     character varying(255) NOT NULL,
  CONSTRAINT wellness_programs_category_check CHECK (((category)::text = ANY ((ARRAY['PHYSICAL_FITNESS':: character varying, 'MENTAL_HEALTH':: character varying, 'NUTRITION':: character varying, 'SLEEP':: character varying, 'STRESS_MANAGEMENT':: character varying, 'FINANCIAL_WELLNESS':: character varying, 'SOCIAL_WELLNESS':: character varying, 'PREVENTIVE_HEALTH':: character varying, 'WORK_LIFE_BALANCE':: character varying])::text[])
) ),
    CONSTRAINT wellness_programs_program_type_check CHECK (((program_type)::text = ANY ((ARRAY['ONGOING'::character varying, 'CHALLENGE'::character varying, 'WORKSHOP'::character varying, 'CAMPAIGN'::character varying, 'ASSESSMENT'::character varying])::text[])))
);


ALTER TABLE public.wellness_programs OWNER TO hrms;

--
-- Name: wiki_page_approval_tasks; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wiki_page_approval_tasks
(
  is_deleted       boolean               NOT NULL,
  created_at       timestamp(6) without time zone NOT NULL,
  reviewed_at      timestamp(6) without time zone,
  updated_at       timestamp(6) without time zone NOT NULL,
  version          bigint,
  approval_task_id uuid,
  created_by       uuid,
  id               uuid                  NOT NULL,
  page_id          uuid                  NOT NULL,
  reviewed_by      uuid,
  submitted_by     uuid                  NOT NULL,
  tenant_id        uuid                  NOT NULL,
  updated_by       uuid,
  status           character varying(50) NOT NULL,
  change_summary   text,
  rejection_reason text,
  CONSTRAINT wiki_page_approval_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING':: character varying, 'APPROVED':: character varying, 'REJECTED':: character varying, 'REVOKED':: character varying])::text[])
) )
);


ALTER TABLE public.wiki_page_approval_tasks OWNER TO hrms;

--
-- Name: wiki_page_comments; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wiki_page_comments
(
  is_deleted        boolean NOT NULL,
  is_pinned         boolean NOT NULL,
  like_count        integer NOT NULL,
  created_at        timestamp(6) without time zone NOT NULL,
  updated_at        timestamp(6) without time zone NOT NULL,
  version           bigint,
  created_by        uuid,
  id                uuid    NOT NULL,
  page_id           uuid    NOT NULL,
  parent_comment_id uuid,
  tenant_id         uuid    NOT NULL,
  updated_by        uuid,
  content           text    NOT NULL
);


ALTER TABLE public.wiki_page_comments OWNER TO hrms;

--
-- Name: wiki_page_versions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wiki_page_versions
(
  is_deleted     boolean                NOT NULL,
  version_number integer                NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  id             uuid                   NOT NULL,
  page_id        uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  change_summary character varying(500),
  title          character varying(500) NOT NULL,
  content        jsonb                  NOT NULL,
  excerpt        text
);


ALTER TABLE public.wiki_page_versions OWNER TO hrms;

--
-- Name: wiki_page_watches; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wiki_page_watches
(
  is_deleted boolean               NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  version    bigint,
  created_by uuid,
  id         uuid                  NOT NULL,
  page_id    uuid                  NOT NULL,
  tenant_id  uuid                  NOT NULL,
  updated_by uuid,
  user_id    uuid                  NOT NULL,
  watch_type character varying(50) NOT NULL,
  CONSTRAINT wiki_page_watches_watch_type_check CHECK (((watch_type)::text = ANY ((ARRAY['ALL':: character varying, 'COMMENTS':: character varying, 'NONE':: character varying])::text[])
) )
);


ALTER TABLE public.wiki_page_watches OWNER TO hrms;

--
-- Name: wiki_pages; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wiki_pages
(
  comment_count  integer                NOT NULL,
  is_deleted     boolean                NOT NULL,
  is_pinned      boolean                NOT NULL,
  like_count     integer                NOT NULL,
  view_count     integer                NOT NULL,
  created_at     timestamp(6) without time zone NOT NULL,
  last_viewed_at timestamp(6) without time zone,
  pinned_at      timestamp(6) without time zone,
  published_at   timestamp(6) without time zone,
  updated_at     timestamp(6) without time zone NOT NULL,
  version        bigint,
  created_by     uuid,
  id             uuid                   NOT NULL,
  last_viewed_by uuid,
  parent_page_id uuid,
  pinned_by      uuid,
  published_by   uuid,
  space_id       uuid                   NOT NULL,
  tenant_id      uuid                   NOT NULL,
  updated_by     uuid,
  status         character varying(50)  NOT NULL,
  visibility     character varying(50)  NOT NULL,
  slug           character varying(500) NOT NULL,
  title          character varying(500) NOT NULL,
  content        jsonb                  NOT NULL,
  excerpt        text,
  CONSTRAINT wiki_pages_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT':: character varying, 'PUBLISHED':: character varying, 'ARCHIVED':: character varying])::text[])
) ),
    CONSTRAINT wiki_pages_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'ORGANIZATION'::character varying, 'TEAM'::character varying, 'PRIVATE'::character varying, 'RESTRICTED'::character varying])::text[])))
);


ALTER TABLE public.wiki_pages OWNER TO hrms;

--
-- Name: wiki_spaces; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.wiki_spaces
(
  is_archived boolean                NOT NULL,
  is_deleted  boolean                NOT NULL,
  order_index integer,
  color       character varying(7),
  archived_at timestamp(6) without time zone,
  created_at  timestamp(6) without time zone NOT NULL,
  updated_at  timestamp(6) without time zone NOT NULL,
  version     bigint,
  archived_by uuid,
  created_by  uuid,
  id          uuid                   NOT NULL,
  tenant_id   uuid                   NOT NULL,
  updated_by  uuid,
  icon        character varying(50),
  visibility  character varying(50)  NOT NULL,
  name        character varying(200) NOT NULL,
  slug        character varying(200) NOT NULL,
  description text,
  CONSTRAINT wiki_spaces_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['PUBLIC':: character varying, 'ORGANIZATION':: character varying, 'TEAM':: character varying, 'PRIVATE':: character varying, 'RESTRICTED':: character varying])::text[])
) )
);


ALTER TABLE public.wiki_spaces OWNER TO hrms;

--
-- Name: workflow_definitions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.workflow_definitions
(
  allow_parallel_approval boolean                NOT NULL,
  auto_approve_enabled    boolean                NOT NULL,
  default_sla_hours       integer                NOT NULL,
  escalation_after_hours  integer                NOT NULL,
  escalation_enabled      boolean                NOT NULL,
  is_active               boolean                NOT NULL,
  is_default              boolean                NOT NULL,
  is_deleted              boolean                NOT NULL,
  max_amount              numeric(38, 2),
  min_amount              numeric(38, 2),
  notify_on_approval      boolean                NOT NULL,
  notify_on_escalation    boolean                NOT NULL,
  notify_on_rejection     boolean                NOT NULL,
  notify_on_submission    boolean                NOT NULL,
  skip_level_allowed      boolean                NOT NULL,
  workflow_version        integer                NOT NULL,
  created_at              timestamp(6) without time zone NOT NULL,
  updated_at              timestamp(6) without time zone NOT NULL,
  version                 bigint,
  created_by              uuid,
  department_id           uuid,
  id                      uuid                   NOT NULL,
  location_id             uuid,
  tenant_id               uuid                   NOT NULL,
  updated_by              uuid,
  applicable_grades       character varying(255),
  auto_approve_condition  character varying(255),
  description             character varying(255),
  entity_type             character varying(255) NOT NULL,
  name                    character varying(255) NOT NULL,
  workflow_type           character varying(255) NOT NULL,
  CONSTRAINT workflow_definitions_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['LEAVE_REQUEST':: character varying, 'EXPENSE_CLAIM':: character varying, 'TRAVEL_REQUEST':: character varying, 'LOAN_REQUEST':: character varying, 'ASSET_REQUEST':: character varying, 'TIMESHEET':: character varying, 'RESIGNATION':: character varying, 'SALARY_REVISION':: character varying, 'PROMOTION':: character varying, 'TRANSFER':: character varying, 'ONBOARDING':: character varying, 'OFFBOARDING':: character varying, 'DOCUMENT_REQUEST':: character varying, 'POLICY_ACKNOWLEDGMENT':: character varying, 'TRAINING_REQUEST':: character varying, 'REIMBURSEMENT':: character varying, 'OVERTIME':: character varying, 'SHIFT_CHANGE':: character varying, 'WORK_FROM_HOME':: character varying, 'RECRUITMENT_OFFER':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT workflow_definitions_workflow_type_check CHECK (((workflow_type)::text = ANY ((ARRAY['SEQUENTIAL'::character varying, 'PARALLEL'::character varying, 'CONDITIONAL'::character varying, 'HIERARCHICAL'::character varying, 'HYBRID'::character varying])::text[])))
);


ALTER TABLE public.workflow_definitions OWNER TO hrms;

--
-- Name: workflow_executions; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.workflow_executions
(
  amount                 numeric(38, 2),
  current_step_order     integer                NOT NULL,
  is_deleted             boolean                NOT NULL,
  cancelled_at           timestamp(6) without time zone,
  completed_at           timestamp(6) without time zone,
  created_at             timestamp(6) without time zone NOT NULL,
  deadline               timestamp(6) without time zone,
  escalation_due_at      timestamp(6) without time zone,
  submitted_at           timestamp(6) without time zone,
  updated_at             timestamp(6) without time zone NOT NULL,
  version                bigint,
  created_by             uuid,
  current_step_id        uuid,
  department_id          uuid,
  entity_id              uuid                   NOT NULL,
  id                     uuid                   NOT NULL,
  location_id            uuid,
  requester_id           uuid                   NOT NULL,
  tenant_id              uuid                   NOT NULL,
  updated_by             uuid,
  workflow_definition_id uuid                   NOT NULL,
  cancellation_reason    character varying(255),
  context_json           text,
  entity_type            character varying(255) NOT NULL,
  priority               character varying(255),
  reference_number       character varying(255),
  requester_name         character varying(255),
  status                 character varying(255) NOT NULL,
  title                  character varying(255),
  CONSTRAINT workflow_executions_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['LEAVE_REQUEST':: character varying, 'EXPENSE_CLAIM':: character varying, 'TRAVEL_REQUEST':: character varying, 'LOAN_REQUEST':: character varying, 'ASSET_REQUEST':: character varying, 'TIMESHEET':: character varying, 'RESIGNATION':: character varying, 'SALARY_REVISION':: character varying, 'PROMOTION':: character varying, 'TRANSFER':: character varying, 'ONBOARDING':: character varying, 'OFFBOARDING':: character varying, 'DOCUMENT_REQUEST':: character varying, 'POLICY_ACKNOWLEDGMENT':: character varying, 'TRAINING_REQUEST':: character varying, 'REIMBURSEMENT':: character varying, 'OVERTIME':: character varying, 'SHIFT_CHANGE':: character varying, 'WORK_FROM_HOME':: character varying, 'RECRUITMENT_OFFER':: character varying, 'CUSTOM':: character varying])::text[])
) ),
    CONSTRAINT workflow_executions_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT workflow_executions_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'IN_PROGRESS'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'ESCALATED'::character varying, 'ON_HOLD'::character varying, 'RETURNED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.workflow_executions OWNER TO hrms;

--
-- Name: workflow_rules; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.workflow_rules
(
  is_active                   boolean                NOT NULL,
  is_deleted                  boolean                NOT NULL,
  priority                    integer                NOT NULL,
  skip_step_order             integer                NOT NULL,
  created_at                  timestamp(6) without time zone NOT NULL,
  effective_from              timestamp(6) without time zone,
  effective_to                timestamp(6) without time zone,
  updated_at                  timestamp(6) without time zone NOT NULL,
  version                     bigint,
  additional_approver_id      uuid,
  additional_approver_role_id uuid,
  created_by                  uuid,
  id                          uuid                   NOT NULL,
  target_workflow_id          uuid,
  tenant_id                   uuid                   NOT NULL,
  updated_by                  uuid,
  action                      character varying(255) NOT NULL,
  description                 character varying(255),
  entity_type                 character varying(255) NOT NULL,
  name                        character varying(255) NOT NULL,
  notification_recipients     text,
  notification_template       character varying(255),
  rule_expression             text                   NOT NULL,
  rule_type                   character varying(255) NOT NULL,
  target_priority             character varying(255),
  CONSTRAINT workflow_rules_action_check CHECK (((action)::text = ANY ((ARRAY['ROUTE_TO_WORKFLOW':: character varying, 'ADD_APPROVER':: character varying, 'REMOVE_APPROVER':: character varying, 'SKIP_STEP':: character varying, 'ADD_STEP':: character varying, 'AUTO_APPROVE':: character varying, 'AUTO_REJECT':: character varying, 'SET_PRIORITY':: character varying, 'SEND_NOTIFICATION':: character varying, 'ESCALATE':: character varying, 'HOLD':: character varying, 'RETURN':: character varying])::text[])
) ),
    CONSTRAINT workflow_rules_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['LEAVE_REQUEST'::character varying, 'EXPENSE_CLAIM'::character varying, 'TRAVEL_REQUEST'::character varying, 'LOAN_REQUEST'::character varying, 'ASSET_REQUEST'::character varying, 'TIMESHEET'::character varying, 'RESIGNATION'::character varying, 'SALARY_REVISION'::character varying, 'PROMOTION'::character varying, 'TRANSFER'::character varying, 'ONBOARDING'::character varying, 'OFFBOARDING'::character varying, 'DOCUMENT_REQUEST'::character varying, 'POLICY_ACKNOWLEDGMENT'::character varying, 'TRAINING_REQUEST'::character varying, 'REIMBURSEMENT'::character varying, 'OVERTIME'::character varying, 'SHIFT_CHANGE'::character varying, 'WORK_FROM_HOME'::character varying, 'RECRUITMENT_OFFER'::character varying, 'CUSTOM'::character varying])::text[]))),
    CONSTRAINT workflow_rules_rule_type_check CHECK (((rule_type)::text = ANY ((ARRAY['WORKFLOW_SELECTION'::character varying, 'STEP_CONDITION'::character varying, 'APPROVER_ASSIGNMENT'::character varying, 'AUTO_ACTION'::character varying, 'NOTIFICATION'::character varying, 'ESCALATION'::character varying, 'PRIORITY'::character varying, 'VALIDATION'::character varying])::text[]))),
    CONSTRAINT workflow_rules_target_priority_check CHECK (((target_priority)::text = ANY ((ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[])))
);


ALTER TABLE public.workflow_rules OWNER TO hrms;

--
-- Name: workforce_trends; Type: TABLE; Schema: public; Owner: hrms
--

CREATE TABLE public.workforce_trends
(
  attrition_rate           numeric(5, 2),
  avg_age                  numeric(4, 1),
  avg_engagement_score     numeric(5, 2),
  avg_performance_rating   numeric(3, 1),
  avg_salary               numeric(12, 2),
  avg_salary_increase      numeric(5, 2),
  avg_tenure_months        numeric(6, 1),
  avg_time_to_fill_days    numeric(6, 1),
  cost_per_hire            numeric(12, 2),
  gender_diversity_ratio   numeric(5, 2),
  growth_rate              numeric(5, 2),
  high_performers_count    integer,
  hiring_rate              numeric(5, 2),
  internal_transfers_in    integer,
  internal_transfers_out   integer,
  involuntary_attrition    integer,
  is_deleted               boolean                NOT NULL,
  low_performers_count     integer,
  new_hires                integer,
  open_positions           integer,
  period_month             integer                NOT NULL,
  period_year              integer                NOT NULL,
  terminations             integer,
  total_compensation       numeric(15, 2),
  total_headcount          integer,
  training_cost            numeric(12, 2),
  voluntary_attrition      integer,
  voluntary_attrition_rate numeric(5, 2),
  created_at               timestamp(6) without time zone NOT NULL,
  updated_at               timestamp(6) without time zone NOT NULL,
  version                  bigint,
  created_by               uuid,
  department_id            uuid,
  id                       uuid                   NOT NULL,
  tenant_id                uuid                   NOT NULL,
  updated_by               uuid,
  department_name          character varying(255),
  trend_type               character varying(255) NOT NULL,
  CONSTRAINT workforce_trends_trend_type_check CHECK (((trend_type)::text = ANY ((ARRAY['ORGANIZATION':: character varying, 'DEPARTMENT':: character varying, 'LOCATION':: character varying, 'JOB_FAMILY':: character varying])::text[])
) )
);


ALTER TABLE public.workforce_trends OWNER TO hrms;

--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: pm; Owner: hrms
--

COPY pm.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>
\N	hrms	2026-03-12 15:26:34.42783	0	t
\.


--
-- Data for Name: project_comments; Type: TABLE DATA; Schema: pm; Owner: hrms
--

COPY pm.project_comments (is_deleted, is_edited, created_at, updated_at, version, author_id, created_by, id, milestone_id, parent_comment_id, project_id, task_id, tenant_id, updated_by, type, author_name, attachments, mentions, content) FROM stdin;
\
.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: pm; Owner: hrms
--

COPY pm.project_members (hours_per_week, is_active, is_deleted, joined_date, left_date, created_at, updated_at, version, created_by, id, project_id, tenant_id, updated_by, user_id, role, department, designation, email, user_name) FROM stdin;
\
.


--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: pm; Owner: hrms
--

COPY pm.project_milestones (completed_date, due_date, is_deleted, progress_percentage, sort_order, start_date, created_at, updated_at, version, created_by, id, owner_id, project_id, tenant_id, updated_by, color, status, name, owner_name, description) FROM stdin;
\
.


--
-- Data for Name: project_tasks; Type: TABLE DATA; Schema: pm; Owner: hrms
--

COPY pm.project_tasks (actual_hours, completed_date, due_date, estimated_hours, is_deleted, progress_percentage, sort_order, start_date, story_points, created_at, updated_at, version, assignee_id, created_by, id, milestone_id, parent_task_id, project_id, reporter_id, tenant_id, updated_by, color, priority, status, type, task_code, sprint_name, assignee_name, reporter_name, tags, title, description) FROM stdin;
\
.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: pm; Owner: hrms
--

COPY pm.projects (budget, currency, end_date, is_archived, is_deleted, progress_percentage, start_date, target_end_date, created_at, updated_at, version, created_by, id, owner_id, tenant_id, updated_by, color, priority, status, project_code, client_name, name, owner_name, tags, description) FROM stdin;
\
.


--
-- Data for Name: allocation_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.allocation_requests (end_date, is_deleted, requested_allocation, start_date, created_at, resolved_at, updated_at, version, approver_id, created_by, employee_id, id, project_id, requested_by_id, tenant_id, updated_by, status, role, approval_comment, rejection_reason, request_reason) FROM stdin;
\
.


--
-- Data for Name: analytics_insights; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.analytics_insights (affected_employees, due_date, impact_score, is_deleted, potential_cost_impact, valid_until, created_at, generated_at, resolved_at, updated_at, version, assigned_to, created_by, department_id, id, tenant_id, updated_by, action_items, category, data_source, department_name, description, insight_type, recommendation, resolution_notes, severity, status, title) FROM stdin;
\
.


--
-- Data for Name: analytics_metrics; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.analytics_metrics (metric_date, metric_value, created_at, id, tenant_id, metric_category, metric_name, dimension1, dimension2, dimension3) FROM stdin;
\
.


--
-- Data for Name: analytics_snapshots; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.analytics_snapshots (active_employees, applications_received, attrition_rate, average_age, average_attendance_rate, average_late_percentage, average_leaves_per_employee, average_performance_rating, average_salary, average_tenure, average_time_to_hire, average_training_hours, candidates_shortlisted, cost_per_hire, employees_trained, engagement_score, enps, female_count, high_performers_count, is_deleted, low_performers_count, male_count, median_salary, month, new_joinees, offer_acceptance_rate, offers_accepted, offers_extended, on_leave_count, open_positions, other_gender_count, quarter, retention_rate, salary_range_max, salary_range_min, satisfaction_score, separations, snapshot_date, total_headcount, total_leaves_taken, total_payroll_cost, training_cost, training_sessions_conducted, week, year, computed_at, created_at, updated_at, version, created_by, id, tenant_id, updated_by, age_distribution, department_distribution, employment_type_distribution, location_distribution, performance_distribution, period, salary_band_distribution, snapshot_type, tenure_distribution) FROM stdin;
\
.


--
-- Data for Name: announcement_reads; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.announcement_reads (is_accepted, is_deleted, accepted_at, created_at, read_at, updated_at, version, announcement_id, created_by, employee_id, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: announcement_target_departments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.announcement_target_departments (announcement_id, department_id) FROM stdin;
\
.


--
-- Data for Name: announcement_target_employees; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.announcement_target_employees (announcement_id, employee_id) FROM stdin;
\
.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.announcements (accepted_count, is_deleted, is_pinned, read_count, requires_acceptance, send_email, created_at, expires_at, published_at, updated_at, version, created_by, id, published_by, tenant_id, updated_by, priority, status, category, target_audience, published_by_name, attachment_url, content, title, wall_post_id) FROM stdin;
\
.


--
-- Data for Name: api_key_scopes; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.api_key_scopes (api_key_id, scope) FROM stdin;
\
.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.api_keys (is_active, is_deleted, rate_limit, rate_limit_window_seconds, created_at, expires_at, last_used_at, updated_at, version, key_prefix, created_by, id, tenant_id, updated_by, last_used_ip, name, description, key_hash) FROM stdin;
\
.


--
-- Data for Name: app_permissions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.app_permissions (display_order, is_deleted, is_system_permission, created_at, updated_at, version, application_id, created_by, id, updated_by, action, category, module, code, name, depends_on, description) FROM stdin;
0	f	f	2026-03-12 18:03:16.195906	2026-03-12 18:03:16.195906	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	3d71aba7-a01a-4615-9a0d-f0a0fdbafc03
\N	READ	Core HR	EMPLOYEE	HRMS:EMPLOYEE:READ	View Employees
\N	View employee profiles and details
0	f	f	2026-03-12 18:03:16.205608	2026-03-12 18:03:16.205608	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	c0179cea-530e-4d61-b0da-4cfd8f6608ca
\N	CREATE
Core HR	EMPLOYEE	HRMS:EMPLOYEE:CREATE	Create Employees
\N	Add new employees to the system
0	f	f	2026-03-12 18:03:16.216763	2026-03-12 18:03:16.216763	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	e3ca3a5b-5c7a-445a-933e-7d47422d6879
\N
UPDATE Core HR EMPLOYEE HRMS:EMPLOYEE:
UPDATE
Update Employees \N Modify employee information
  0 f f 2026-03-12 18:03:16.221311 2026-03-12 18:03:16.221311 0 b63547a7-eb8c-4661-a22a-a9d6c3f8ee81 \N e6dbefb3-2246-47af-a78c-d89f8b0c6ac3 \N
DELETE
Core HR	EMPLOYEE	HRMS:EMPLOYEE:DELETE	Delete Employees
\N	Remove employees from the system
0	f	f	2026-03-12 18:03:16.224775	2026-03-12 18:03:16.224775	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	ab2137b3-c0a2-4015-9622-42bbe0f6b17e
\N	VIEW_ALL	Core HR	EMPLOYEE	HRMS:EMPLOYEE:VIEW_ALL	View All Employees
\N	View employees across all departments
0	f	f	2026-03-12 18:03:16.228453	2026-03-12 18:03:16.228453	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	d3cb38e5-91b3-4de7-a81a-29dd9b20537f
\N	VIEW_DEPARTMENT	Core HR	EMPLOYEE	HRMS:EMPLOYEE:VIEW_DEPARTMENT	View Department Employees
\N	View employees in own department
0	f	f	2026-03-12 18:03:16.233245	2026-03-12 18:03:16.233245	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	21e40a1c-6ad9-4052-bece-bc36b043b601
\N	VIEW_TEAM	Core HR	EMPLOYEE	HRMS:EMPLOYEE:VIEW_TEAM	View Team Employees
\N	View employees in own team
0	f	f	2026-03-12 18:03:16.242869	2026-03-12 18:03:16.242869	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	ef8c1b74-7079-4274-9fa1-a7f636c7e9c8
\N	VIEW_SELF	Self Service	EMPLOYEE	HRMS:EMPLOYEE:VIEW_SELF	View Own Profile
\N	View own employee profile
0	f	f	2026-03-12 18:03:16.246118	2026-03-12 18:03:16.246118	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	2c415291-f343-419a-8e31-90322c6a0b49
\N	IMPORT	Core HR	EMPLOYEE	HRMS:EMPLOYEE:IMPORT	Import Employees
\N	Bulk import employees from file
0	f	f	2026-03-12 18:03:16.24996	2026-03-12 18:03:16.24996	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	f872f6db-8733-4abd-a08f-6b95e95f8df0
\N	EXPORT	Core HR	EMPLOYEE	HRMS:EMPLOYEE:EXPORT	Export Employees
\N	Export employee data to file
0	f	f	2026-03-12 18:03:16.25453	2026-03-12 18:03:16.25453	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	c179ff55-1e65-4d0b-9ade-724667370a26
\N	READ	Organization	DEPARTMENT	HRMS:DEPARTMENT:READ	View Departments
\N	View department information
0	f	f	2026-03-12 18:03:16.259521	2026-03-12 18:03:16.259521	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	96736e72-a2ed-4bd0-9270-381f40b1499e
\N	CREATE
Organization	DEPARTMENT	HRMS:DEPARTMENT:CREATE	Create Departments
\N	Create new departments
0	f	f	2026-03-12 18:03:16.265295	2026-03-12 18:03:16.265295	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	1fe6639a-033b-4ff2-9e87-fecac6020003
\N
UPDATE Organization DEPARTMENT HRMS:DEPARTMENT:
UPDATE
Update Departments \N Modify department information
  0 f f 2026-03-12 18:03:16.269329 2026-03-12 18:03:16.269329 0 b63547a7-eb8c-4661-a22a-a9d6c3f8ee81 \N 03455bcf-c8c1-4469-a368-2a1f40e84c27 \N
DELETE
Organization	DEPARTMENT	HRMS:DEPARTMENT:DELETE	Delete Departments
\N	Remove departments
0	f	f	2026-03-12 18:03:16.274578	2026-03-12 18:03:16.274578	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	55ca98f4-ade6-43b0-b067-dc42930b8a3b
\N	READ	Attendance	ATTENDANCE	HRMS:ATTENDANCE:READ	View Attendance
\N	View attendance records
0	f	f	2026-03-12 18:03:16.284627	2026-03-12 18:03:16.284627	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	abed5fb0-ceb5-45a6-9df2-b6fb88bcf453
\N	MARK	Attendance	ATTENDANCE	HRMS:ATTENDANCE:MARK	Mark Attendance
\N	Check-in and check-out
0	f	f	2026-03-12 18:03:16.288083	2026-03-12 18:03:16.288083	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	035a7ebe-74cc-4724-9f35-49d3674d6ac2
\N	MANAGE	Attendance	ATTENDANCE	HRMS:ATTENDANCE:MANAGE	Manage Attendance
\N	Full attendance management
0	f	f	2026-03-12 18:03:16.298668	2026-03-12 18:03:16.298668	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	0c864e8c-cb05-48e8-b83c-04b1a3770826
\N	REGULARIZE	Attendance	ATTENDANCE	HRMS:ATTENDANCE:REGULARIZE	Regularize Attendance
\N	Request attendance regularization
0	f	f	2026-03-12 18:03:16.301702	2026-03-12 18:03:16.301702	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	4a04b390-3a6c-4d87-a04f-8c579aa3a9ca
\N	APPROVE	Attendance	ATTENDANCE	HRMS:ATTENDANCE:APPROVE	Approve Attendance
\N	Approve attendance requests
0	f	f	2026-03-12 18:03:16.306899	2026-03-12 18:03:16.306899	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	d55ebd7b-a457-4eaa-a9d3-fce039908557
\N	VIEW_TEAM	Attendance	ATTENDANCE	HRMS:ATTENDANCE:VIEW_TEAM	View Team Attendance
\N	View team attendance records
0	f	f	2026-03-12 18:03:16.309838	2026-03-12 18:03:16.309838	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	2265425a-5a01-4d75-b932-ef16538080c8
\N	VIEW_ALL	Attendance	ATTENDANCE	HRMS:ATTENDANCE:VIEW_ALL	View All Attendance
\N	View all attendance records
0	f	f	2026-03-12 18:03:16.313226	2026-03-12 18:03:16.313226	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	d1b6c950-c07a-4383-a4cc-41b88fb1a33f
\N	READ	Leave	LEAVE	HRMS:LEAVE:READ	View Leave
\N	View leave information
0	f	f	2026-03-12 18:03:16.319487	2026-03-12 18:03:16.319487	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	aaa64212-59f6-4c35-bf5b-2843c15a8c57
\N	REQUEST	Leave	LEAVE	HRMS:LEAVE:REQUEST	Request Leave
\N	Apply for leave
0	f	f	2026-03-12 18:03:16.325982	2026-03-12 18:03:16.325982	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	4ac1bf36-da42-42a2-8dbe-8a688af4ad63
\N	APPROVE	Leave	LEAVE	HRMS:LEAVE:APPROVE	Approve Leave
\N	Approve/reject leave requests
0	f	f	2026-03-12 18:03:16.330865	2026-03-12 18:03:16.330865	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	8c05cceb-53fb-40b7-be6e-eeb747ffb82f
\N	MANAGE	Leave	LEAVE	HRMS:LEAVE:MANAGE	Manage Leave
\N	Full leave management
0	f	f	2026-03-12 18:03:16.334388	2026-03-12 18:03:16.334388	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	f94ec8e9-89ff-472e-bccb-0fdf276e4b77
\N	VIEW_TEAM	Leave	LEAVE	HRMS:LEAVE:VIEW_TEAM	View Team Leave
\N	View team leave requests
0	f	f	2026-03-12 18:03:16.34358	2026-03-12 18:03:16.34358	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	1770de05-a5db-4849-9880-4512187b687f
\N	VIEW_ALL	Leave	LEAVE	HRMS:LEAVE:VIEW_ALL	View All Leave
\N	View all leave requests
0	f	f	2026-03-12 18:03:16.347154	2026-03-12 18:03:16.347154	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	4df53942-7990-4ff3-aac4-967d62101012
\N	CONFIGURE	Leave	LEAVE	HRMS:LEAVE:CONFIGURE	Configure Leave Types
\N	Manage leave types and policies
0	f	f	2026-03-12 18:03:16.350664	2026-03-12 18:03:16.350664	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	7ad2621c-a4d7-4a96-8d59-f9f26688adbe
\N	READ	Payroll	PAYROLL	HRMS:PAYROLL:READ	View Payroll
\N	View payroll information
0	f	f	2026-03-12 18:03:16.354715	2026-03-12 18:03:16.354715	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	45f49314-4c31-4e1d-9195-f108c87b2017
\N	MANAGE	Payroll	PAYROLL	HRMS:PAYROLL:MANAGE	Manage Payroll
\N	Full payroll management
0	f	f	2026-03-12 18:03:16.35846	2026-03-12 18:03:16.35846	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	9e86dcef-d0c1-4e72-ac01-b5c55dde697b
\N	RUN	Payroll	PAYROLL	HRMS:PAYROLL:RUN	Run Payroll
\N	Process payroll runs
0	f	f	2026-03-12 18:03:16.362224	2026-03-12 18:03:16.362224	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	5089ee29-9260-431d-aa16-9cee0897c951
\N	APPROVE	Payroll	PAYROLL	HRMS:PAYROLL:APPROVE	Approve Payroll
\N	Approve payroll runs
0	f	f	2026-03-12 18:03:16.366499	2026-03-12 18:03:16.366499	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	2e7039be-6dbc-482e-9003-e8b36dee9be9
\N	VIEW_PAYSLIP	Self Service	PAYROLL	HRMS:PAYROLL:VIEW_PAYSLIP	View Payslips
\N	View own payslips
0	f	f	2026-03-12 18:03:16.36929	2026-03-12 18:03:16.36929	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	11107f9b-138f-4ebc-8331-807b8eabd126
\N	READ	Performance	PERFORMANCE	HRMS:PERFORMANCE:READ	View Performance
\N	View performance data
0	f	f	2026-03-12 18:03:16.372059	2026-03-12 18:03:16.372059	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	7aa8b3a9-287c-4ea6-82cd-fab4c6046402
\N	MANAGE	Performance	PERFORMANCE	HRMS:PERFORMANCE:MANAGE	Manage Performance
\N	Full performance management
0	f	f	2026-03-12 18:03:16.375949	2026-03-12 18:03:16.375949	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	437bb131-1284-4b97-89a1-cc18c576e9fc
\N	GOAL_CREATE	Performance	PERFORMANCE	HRMS:PERFORMANCE:GOAL_CREATE	Create
Goals
\N	Create performance goals
0	f	f	2026-03-12 18:03:16.379696	2026-03-12 18:03:16.379696	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	a84167ac-5157-413d-8643-05d5dff95883
\N	GOAL_REVIEW	Performance	PERFORMANCE	HRMS:PERFORMANCE:GOAL_REVIEW	Review Goals
\N	Review and rate goals
0	f	f	2026-03-12 18:03:16.382548	2026-03-12 18:03:16.382548	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	3fbe5ca0-ee0f-49b6-9ade-e04e1e7ed238
\N	FEEDBACK	Performance	PERFORMANCE	HRMS:PERFORMANCE:FEEDBACK	Give Feedback
\N	Provide performance feedback
0	f	f	2026-03-12 18:03:16.387602	2026-03-12 18:03:16.387602	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	3b870be7-c816-405e-b796-eeb7c7a144bd
\N	READ	Recruitment	RECRUITMENT	HRMS:RECRUITMENT:READ	View Recruitment
\N	View recruitment data
0	f	f	2026-03-12 18:03:16.391469	2026-03-12 18:03:16.391469	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	5f4687c7-47a3-48bd-824c-9d17d6270949
\N	MANAGE	Recruitment	RECRUITMENT	HRMS:RECRUITMENT:MANAGE	Manage Recruitment
\N	Full recruitment management
0	f	f	2026-03-12 18:03:16.398471	2026-03-12 18:03:16.398471	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	c28e372d-93ed-420d-b4e5-6e51e8f392dd
\N	JOB_CREATE	Recruitment	RECRUITMENT	HRMS:RECRUITMENT:JOB_CREATE	Create
Jobs
\N	Create job postings
0	f	f	2026-03-12 18:03:16.401767	2026-03-12 18:03:16.401767	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	aed4c2e2-0004-476d-8439-b2c8e80a8993
\N	CANDIDATE_MANAGE	Recruitment	RECRUITMENT	HRMS:RECRUITMENT:CANDIDATE_MANAGE	Manage Candidates
\N	Manage candidate applications
0	f	f	2026-03-12 18:03:16.405528	2026-03-12 18:03:16.405528	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	dea74f96-f180-4e89-81de-5bb61a53ac82
\N	INTERVIEW	Recruitment	RECRUITMENT	HRMS:RECRUITMENT:INTERVIEW	Conduct Interviews
\N	Schedule and conduct interviews
0	f	f	2026-03-12 18:03:16.409272	2026-03-12 18:03:16.409272	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	ff94ed8c-a1c4-48f8-9043-fe5b641fd08a
\N	VIEW	Project Management	PROJECT	HRMS:PROJECT:VIEW	View Projects
\N	View project information and details
0	f	f	2026-03-12 18:03:16.411382	2026-03-12 18:03:16.411382	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	48f5cdb9-4d47-431c-82e3-cd4d112042eb
\N	CREATE
Project Management	PROJECT	HRMS:PROJECT:CREATE	Create Projects
\N	Create and manage projects
0	f	f	2026-03-12 18:03:16.413591	2026-03-12 18:03:16.413591	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	82423f60-41ee-4dea-a45e-29b33d0b9d0d
\N
UPDATE Project Management PROJECT HRMS:PROJECT:
UPDATE
Update Projects \N Modify project information
  0 f f 2026-03-12 18:03:16.417564 2026-03-12 18:03:16.417564 0 b63547a7-eb8c-4661-a22a-a9d6c3f8ee81 \N 140d77b9-9d15-44e1-b92e-5a2b0f23df12 \N
DELETE
Project Management	PROJECT	HRMS:PROJECT:DELETE	Delete Projects
\N	Remove projects
0	f	f	2026-03-12 18:03:16.421271	2026-03-12 18:03:16.421271	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	074a994a-774c-4ecd-8dd4-a704a10ac003
\N	ASSIGN	Project Management	PROJECT	HRMS:PROJECT:ASSIGN	Assign Resources
\N	Assign employees to projects
0	f	f	2026-03-12 18:03:16.428404	2026-03-12 18:03:16.428404	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	ecff0987-386b-4df3-8d23-eabfc79b60bb
\N	VIEW	Reports	REPORT	HRMS:REPORT:VIEW	View Reports
\N	View reports
0	f	f	2026-03-12 18:03:16.433373	2026-03-12 18:03:16.433373	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	695dad9e-743d-40b0-a334-6ede1cf7902d
\N	CREATE
Reports	REPORT	HRMS:REPORT:CREATE	Create Reports
\N	Generate and export reports
0	f	f	2026-03-12 18:03:16.435758	2026-03-12 18:03:16.435758	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	76ee7bff-9537-423c-afc2-4618ec484e8e
\N	MANAGE	Reports	REPORT	HRMS:REPORT:MANAGE	Manage Reports
\N	Full report management
0	f	f	2026-03-12 18:03:16.441699	2026-03-12 18:03:16.441699	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	f5f9f686-d9f3-4ed4-a36d-1c5290a6adab
\N	READ	Communication	ANNOUNCEMENT	HRMS:ANNOUNCEMENT:READ	View Announcements
\N	View company announcements
0	f	f	2026-03-12 18:03:16.445324	2026-03-12 18:03:16.445324	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	dcae6121-e5d4-4b8c-b69b-61477a75d419
\N	CREATE
Communication	ANNOUNCEMENT	HRMS:ANNOUNCEMENT:CREATE	Create Announcements
\N	Create new announcements
0	f	f	2026-03-12 18:03:16.448625	2026-03-12 18:03:16.448625	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	afbd5e14-9aed-4ee5-b77b-1490045c4f42
\N	MANAGE	Communication	ANNOUNCEMENT	HRMS:ANNOUNCEMENT:MANAGE	Manage Announcements
\N	Full announcement management
0	f	f	2026-03-12 18:03:16.45123	2026-03-12 18:03:16.45123	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	a579df65-51c5-4da1-aa0b-c66cf599ec1f
\N	READ	Admin	SETTINGS	HRMS:SETTINGS:READ	View Settings
\N	View system settings
0	f	f	2026-03-12 18:03:16.45463	2026-03-12 18:03:16.45463	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	ab24b91f-be17-458d-9728-d75846270882
\N	MANAGE	Admin	SETTINGS	HRMS:SETTINGS:MANAGE	Manage Settings
\N	Configure system settings
0	f	f	2026-03-12 18:03:16.457826	2026-03-12 18:03:16.457826	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	925fff7c-a215-4dcb-9500-b4c8301cf333
\N	READ	Admin	ROLE	HRMS:ROLE:READ	View Roles
\N	View roles and permissions
0	f	f	2026-03-12 18:03:16.461161	2026-03-12 18:03:16.461161	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	f8663e1b-992d-459f-bba7-101b64a43085
\N	MANAGE	Admin	ROLE	HRMS:ROLE:MANAGE	Manage Roles
\N	Create
and modify roles
0	f	f	2026-03-12 18:03:16.465082	2026-03-12 18:03:16.465082	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	363afa95-cae3-407c-a62d-f90f5c41ad86
\N	READ	Admin	USER	HRMS:USER:READ	View Users
\N	View user accounts
0	f	f	2026-03-12 18:03:16.468007	2026-03-12 18:03:16.468007	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	eb45aa1d-5ba1-41cf-8161-18488456aee2
\N	MANAGE	Admin	USER	HRMS:USER:MANAGE	Manage Users
\N	Create
and manage user accounts
0	f	f	2026-03-12 18:03:16.471533	2026-03-12 18:03:16.471533	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	275be9c8-8a0d-40fc-8f78-3094f31d9f0c
\N	VIEW	Performance	PIP	HRMS:PIP:VIEW	View PIPs
\N	View Performance Improvement Plans
0	f	f	2026-03-12 18:03:16.475835	2026-03-12 18:03:16.475835	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	36227281-fa15-46ab-b107-d65c3b5bc827
\N	CREATE
Performance	PIP	HRMS:PIP:CREATE	Create PIPs
\N	Create Performance Improvement Plans
0	f	f	2026-03-12 18:03:16.482302	2026-03-12 18:03:16.482302	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	2c929bd6-770c-4e7d-a523-627a65634798
\N	MANAGE	Performance	PIP	HRMS:PIP:MANAGE	Manage PIPs
\N	Manage all Performance Improvement Plans
0	f	f	2026-03-12 18:03:16.485531	2026-03-12 18:03:16.485531	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	9ad3755c-0a0c-419a-ba58-86ef0f9e44da
\N	CLOSE	Performance	PIP	HRMS:PIP:CLOSE	Close PIPs
\N	Close and finalize Performance Improvement Plans
0	f	f	2026-03-12 18:03:16.489519	2026-03-12 18:03:16.489519	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	95d6cfc9-11ce-427f-a45c-2cff3134b481
\N	VIEW	Performance	CALIBRATION	HRMS:CALIBRATION:VIEW	View Calibration
\N	View performance calibration and bell curve data
0	f	f	2026-03-12 18:03:16.49237	2026-03-12 18:03:16.49237	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	32fd2cdf-68a9-4136-9acb-2373f3e30c9a
\N	MANAGE	Performance	CALIBRATION	HRMS:CALIBRATION:MANAGE	Manage Calibration
\N	Run and finalize performance calibration sessions
0	f	f	2026-03-12 18:03:16.495311	2026-03-12 18:03:16.495311	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	cf7ad8e3-1892-4c47-a8af-4471dd6ba1e9
\N	VIEW	Offboarding	OFFBOARDING	HRMS:OFFBOARDING:VIEW	View Offboarding
\N	View offboarding requests and status
0	f	f	2026-03-12 18:03:16.498454	2026-03-12 18:03:16.498454	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	6a026d1d-04b2-4ff2-b902-246de9d36582
\N	MANAGE	Offboarding	OFFBOARDING	HRMS:OFFBOARDING:MANAGE	Manage Offboarding
\N	Manage employee offboarding workflows
0	f	f	2026-03-12 18:03:16.502689	2026-03-12 18:03:16.502689	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	a1086c3c-b581-44b5-a81f-02313dd8f449
\N	FNF_CALCULATE	Offboarding	OFFBOARDING	HRMS:OFFBOARDING:FNF_CALCULATE	Calculate FnF
\N	Calculate Full and Final Settlement amounts
0	f	f	2026-03-12 18:03:16.506973	2026-03-12 18:03:16.506973	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	9381d8d7-c6d9-4d2a-975a-e4137ec5a717
\N	VIEW	Recruitment	CAREER	HRMS:CAREER:VIEW	View Careers
\N	View public job openings
0	f	f	2026-03-12 18:03:16.509345	2026-03-12 18:03:16.509345	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	68af06db-cad5-4b9f-a15d-1863147c2e53
\N	MANAGE	Recruitment	CAREER	HRMS:CAREER:MANAGE	Manage Career Page
\N	Manage public job board and career page
0	f	f	2026-03-12 18:03:16.511145	2026-03-12 18:03:16.511145	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	6fea5d71-ba01-48e7-9309-aac8df466c24
\N	ADMIN	Admin	SYSTEM	HRMS:SYSTEM:ADMIN	System Admin
\N	Full system administration access - bypasses all checks
\.


--
-- Data for Name: app_role_permissions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.app_role_permissions (permission_id, role_id) FROM stdin;
6fea5d71
-ba01-48e7-9309-aac8df466c24	fe9c1996-5a6d-45ea-a390-4a1be7433d3d
695dad9e-743d-40b0-a334-6ede1cf7902d	f80f8f93-41d3-40c5-9edf-198885f85ea4
925fff7c-a215-4dcb-9500-b4c8301cf333	f80f8f93-41d3-40c5-9edf-198885f85ea4
4ac1bf36-da42-42a2-8dbe-8a688af4ad63	f80f8f93-41d3-40c5-9edf-198885f85ea4
afbd5e14-9aed-4ee5-b77b-1490045c4f42	f80f8f93-41d3-40c5-9edf-198885f85ea4
5089ee29-9260-431d-aa16-9cee0897c951	f80f8f93-41d3-40c5-9edf-198885f85ea4
1770de05-a5db-4849-9880-4512187b687f	f80f8f93-41d3-40c5-9edf-198885f85ea4
48f5cdb9-4d47-431c-82e3-cd4d112042eb	f80f8f93-41d3-40c5-9edf-198885f85ea4
d1b6c950-c07a-4383-a4cc-41b88fb1a33f	f80f8f93-41d3-40c5-9edf-198885f85ea4
ab2137b3-c0a2-4015-9622-42bbe0f6b17e	f80f8f93-41d3-40c5-9edf-198885f85ea4
9e86dcef-d0c1-4e72-ac01-b5c55dde697b	f80f8f93-41d3-40c5-9edf-198885f85ea4
e3ca3a5b-5c7a-445a-933e-7d47422d6879	f80f8f93-41d3-40c5-9edf-198885f85ea4
ff94ed8c-a1c4-48f8-9043-fe5b641fd08a	f80f8f93-41d3-40c5-9edf-198885f85ea4
2265425a-5a01-4d75-b932-ef16538080c8	f80f8f93-41d3-40c5-9edf-198885f85ea4
55ca98f4-ade6-43b0-b067-dc42930b8a3b	f80f8f93-41d3-40c5-9edf-198885f85ea4
45f49314-4c31-4e1d-9195-f108c87b2017	f80f8f93-41d3-40c5-9edf-198885f85ea4
363afa95-cae3-407c-a62d-f90f5c41ad86	f80f8f93-41d3-40c5-9edf-198885f85ea4
4a04b390-3a6c-4d87-a04f-8c579aa3a9ca	f80f8f93-41d3-40c5-9edf-198885f85ea4
82423f60-41ee-4dea-a45e-29b33d0b9d0d	f80f8f93-41d3-40c5-9edf-198885f85ea4
e6dbefb3-2246-47af-a78c-d89f8b0c6ac3	f80f8f93-41d3-40c5-9edf-198885f85ea4
3d71aba7-a01a-4615-9a0d-f0a0fdbafc03	f80f8f93-41d3-40c5-9edf-198885f85ea4
c0179cea-530e-4d61-b0da-4cfd8f6608ca	f80f8f93-41d3-40c5-9edf-198885f85ea4
f5f9f686-d9f3-4ed4-a36d-1c5290a6adab	f80f8f93-41d3-40c5-9edf-198885f85ea4
8c05cceb-53fb-40b7-be6e-eeb747ffb82f	f80f8f93-41d3-40c5-9edf-198885f85ea4
035a7ebe-74cc-4724-9f35-49d3674d6ac2	f80f8f93-41d3-40c5-9edf-198885f85ea4
7ad2621c-a4d7-4a96-8d59-f9f26688adbe	f80f8f93-41d3-40c5-9edf-198885f85ea4
140d77b9-9d15-44e1-b92e-5a2b0f23df12	f80f8f93-41d3-40c5-9edf-198885f85ea4
ecff0987-386b-4df3-8d23-eabfc79b60bb	f80f8f93-41d3-40c5-9edf-198885f85ea4
dcae6121-e5d4-4b8c-b69b-61477a75d419	f80f8f93-41d3-40c5-9edf-198885f85ea4
074a994a-774c-4ecd-8dd4-a704a10ac003	f80f8f93-41d3-40c5-9edf-198885f85ea4
f94ec8e9-89ff-472e-bccb-0fdf276e4b77	42b478d5-1481-4ebf-97b2-0390653c234b
55ca98f4-ade6-43b0-b067-dc42930b8a3b	42b478d5-1481-4ebf-97b2-0390653c234b
4ac1bf36-da42-42a2-8dbe-8a688af4ad63	42b478d5-1481-4ebf-97b2-0390653c234b
48f5cdb9-4d47-431c-82e3-cd4d112042eb	42b478d5-1481-4ebf-97b2-0390653c234b
d55ebd7b-a457-4eaa-a9d3-fce039908557	42b478d5-1481-4ebf-97b2-0390653c234b
d1b6c950-c07a-4383-a4cc-41b88fb1a33f	42b478d5-1481-4ebf-97b2-0390653c234b
4a04b390-3a6c-4d87-a04f-8c579aa3a9ca	42b478d5-1481-4ebf-97b2-0390653c234b
3d71aba7-a01a-4615-9a0d-f0a0fdbafc03	42b478d5-1481-4ebf-97b2-0390653c234b
ff94ed8c-a1c4-48f8-9043-fe5b641fd08a	42b478d5-1481-4ebf-97b2-0390653c234b
ecff0987-386b-4df3-8d23-eabfc79b60bb	42b478d5-1481-4ebf-97b2-0390653c234b
d3cb38e5-91b3-4de7-a81a-29dd9b20537f	42b478d5-1481-4ebf-97b2-0390653c234b
f5f9f686-d9f3-4ed4-a36d-1c5290a6adab	42b478d5-1481-4ebf-97b2-0390653c234b
074a994a-774c-4ecd-8dd4-a704a10ac003	42b478d5-1481-4ebf-97b2-0390653c234b
4ac1bf36-da42-42a2-8dbe-8a688af4ad63	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
ff94ed8c-a1c4-48f8-9043-fe5b641fd08a	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
55ca98f4-ade6-43b0-b067-dc42930b8a3b	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
d55ebd7b-a457-4eaa-a9d3-fce039908557	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
f5f9f686-d9f3-4ed4-a36d-1c5290a6adab	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
21e40a1c-6ad9-4052-bece-bc36b043b601	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
3d71aba7-a01a-4615-9a0d-f0a0fdbafc03	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
d1b6c950-c07a-4383-a4cc-41b88fb1a33f	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
f94ec8e9-89ff-472e-bccb-0fdf276e4b77	71e4a131-fd50-4507-b62f-58b1ed9b2f6e
0c864e8c-cb05-48e8-b83c-04b1a3770826	3af6cbe6-5ae0-40be-9ff3-1914896867f1
aaa64212-59f6-4c35-bf5b-2843c15a8c57	3af6cbe6-5ae0-40be-9ff3-1914896867f1
abed5fb0-ceb5-45a6-9df2-b6fb88bcf453	3af6cbe6-5ae0-40be-9ff3-1914896867f1
2e7039be-6dbc-482e-9003-e8b36dee9be9	3af6cbe6-5ae0-40be-9ff3-1914896867f1
ef8c1b74-7079-4274-9fa1-a7f636c7e9c8	3af6cbe6-5ae0-40be-9ff3-1914896867f1
55ca98f4-ade6-43b0-b067-dc42930b8a3b	3af6cbe6-5ae0-40be-9ff3-1914896867f1
d1b6c950-c07a-4383-a4cc-41b88fb1a33f	3af6cbe6-5ae0-40be-9ff3-1914896867f1
f5f9f686-d9f3-4ed4-a36d-1c5290a6adab	3af6cbe6-5ae0-40be-9ff3-1914896867f1
ab2137b3-c0a2-4015-9622-42bbe0f6b17e	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
ecff0987-386b-4df3-8d23-eabfc79b60bb	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
1770de05-a5db-4849-9880-4512187b687f	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
f5f9f686-d9f3-4ed4-a36d-1c5290a6adab	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
dcae6121-e5d4-4b8c-b69b-61477a75d419	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
695dad9e-743d-40b0-a334-6ede1cf7902d	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
d1b6c950-c07a-4383-a4cc-41b88fb1a33f	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
55ca98f4-ade6-43b0-b067-dc42930b8a3b	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
3d71aba7-a01a-4615-9a0d-f0a0fdbafc03	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
2265425a-5a01-4d75-b932-ef16538080c8	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
7ad2621c-a4d7-4a96-8d59-f9f26688adbe	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba
\.


--
-- Data for Name: app_roles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.app_roles (is_default_role, is_deleted, is_system_role, level, created_at, updated_at, version, application_id, created_by, id, tenant_id, updated_by, code, name, description) FROM stdin;
f
f	t	100	2026-03-12 18:03:16.551154	2026-03-12 18:03:16.551154	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	fe9c1996-5a6d-45ea-a390-4a1be7433d3d	550e8400-e29b-41d4-a716-446655440000
\N	SUPER_ADMIN	Super Administrator	Full system administration access
f	f	f	80	2026-03-12 18:03:16.571685	2026-03-12 18:03:16.571685	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	f80f8f93-41d3-40c5-9edf-198885f85ea4	550e8400-e29b-41d4-a716-446655440000
\N	HR_MANAGER	HR Manager	Complete HR management access
f	f	f	60	2026-03-12 18:03:16.582973	2026-03-12 18:03:16.582973	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	42b478d5-1481-4ebf-97b2-0390653c234b	550e8400-e29b-41d4-a716-446655440000
\N	DEPARTMENT_MANAGER	Department Manager	Department management access
f	f	f	40	2026-03-12 18:03:16.593662	2026-03-12 18:03:16.593662	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	71e4a131-fd50-4507-b62f-58b1ed9b2f6e	550e8400-e29b-41d4-a716-446655440000
\N	TEAM_LEAD	Team Lead	Team management access
t	f	f	10	2026-03-12 18:03:16.604091	2026-03-12 18:03:16.604091	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	3af6cbe6-5ae0-40be-9ff3-1914896867f1	550e8400-e29b-41d4-a716-446655440000
\N	EMPLOYEE	Employee	Basic employee self-service access
f	f	f	90	2026-03-12 18:03:16.613033	2026-03-12 18:03:16.613033	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	ec9c2033-3b32-4c3b-a4d8-9c533fec03ba	550e8400-e29b-41d4-a716-446655440000
\N	CEO	Chief Executive Officer	Executive level access with full visibility
\.


--
-- Data for Name: applicants; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.applicants (applied_date, expected_salary, is_deleted, offered_salary, rating, created_at, current_stage_entered_at, updated_at, version, candidate_id, created_by, id, job_opening_id, resume_file_id, tenant_id, updated_by, source, status, notes, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: approval_delegates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.approval_delegates (can_sub_delegate, end_date, expiry_notification_days, is_active, is_deleted, max_approval_amount, notify_delegate_on_assignment, notify_delegator_on_action, revoked, start_date, created_at, revoked_at, updated_at, version, created_by, delegate_id, delegator_id, department_id, id, revoked_by, tenant_id, updated_by, workflow_definition_id, delegate_name, delegator_name, entity_type, reason, revocation_reason) FROM stdin;
\
.


--
-- Data for Name: approval_steps; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.approval_steps (attachments_allowed, auto_approve_on_timeout, auto_reject_on_timeout, comments_required, delegation_allowed, escalate_after_hours, escalation_enabled, hierarchy_level, is_deleted, is_optional, min_approvals, sla_hours, step_order, created_at, updated_at, version, created_by, department_id, escalate_to_role_id, escalate_to_user_id, id, role_id, specific_user_id, tenant_id, updated_by, workflow_definition_id, approver_expression, approver_type, condition, description, escalation_template, notification_template, reminder_template, role_name, step_name) FROM stdin;
\
.


--
-- Data for Name: asset_recoveries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.asset_recoveries (actual_return_date, assigned_date, deduction_amount, expected_return_date, is_deleted, is_waived, verification_date, created_at, updated_at, version, asset_id, created_by, employee_id, exit_process_id, id, recovered_by, tenant_id, updated_by, verified_by, waived_by, asset_name, asset_tag, asset_type, condition_on_return, damage_description, remarks, serial_number, status, waiver_reason) FROM stdin;
\
.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.assets (current_value, purchase_cost, purchase_date, warranty_expiry, created_at, updated_at, version, assigned_to, id, tenant_id, status, asset_code, category, brand, model, serial_number, asset_name, location, notes) FROM stdin;
\
.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.attendance_records (attendance_date, break_duration_minutes, check_in_distance_meters, check_in_latitude, check_in_longitude, check_in_within_geofence, check_out_distance_meters, check_out_latitude, check_out_longitude, check_out_within_geofence, early_departure_minutes, is_deleted, is_early_departure, is_half_day, is_late, is_overtime, is_remote_checkin, late_by_minutes, overtime_minutes, regularization_approved, regularization_requested, work_duration_minutes, approved_at, check_in_time, check_out_time, created_at, updated_at, version, approved_by, check_in_office_location_id, check_out_office_location_id, created_by, employee_id, id, shift_id, tenant_id, updated_by, check_in_ip, check_in_source, check_out_ip, check_out_source, status, check_in_location, check_out_location, notes, regularization_reason) FROM stdin;
\
.


--
-- Data for Name: attendance_regularization_config; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.attendance_regularization_config (id, tenant_id, auto_regularize_enabled, auto_regularize_after_days, default_regularize_to, notify_employee, notify_manager, created_at, updated_at) FROM stdin;
\
.


--
-- Data for Name: attendance_time_entries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.attendance_time_entries (duration_minutes, is_deleted, sequence_number, check_in_time, check_out_time, created_at, updated_at, version, attendance_record_id, created_by, id, updated_by, check_in_ip, check_in_source, check_out_ip, check_out_source, entry_type, check_in_location, check_out_location, notes) FROM stdin;
\
.


--
-- Data for Name: attrition_predictions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.attrition_predictions (action_taken, actual_leave_date, commute_risk, compensation_risk, confidence_score, engagement_risk, engagement_score, is_deleted, last_promotion_months, manager_change_risk, manager_tenure_months, overtime_hours_avg, performance_rating, performance_risk, predicted_leave_date, prediction_date, promotion_gap_risk, risk_score, salary_percentile, tenure_months, tenure_risk, workload_risk, created_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by, actual_outcome, recommendations, risk_level) FROM stdin;
\
.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.audit_logs (is_deleted, created_at, updated_at, version, actor_id, created_by, entity_id, id, tenant_id, updated_by, action, ip_address, entity_type, actor_email, user_agent, changes, new_value, old_value, description) FROM stdin;
f
2026-03-13 14:38:33.572692	2026-03-13 14:38:33.572692	0	550e8400-e29b-41d4-a716-446655440030	550e8400-e29b-41d4-a716-446655440030	dd520402-dba4-400c-bb6c-f2e2969ef6f9	bc051550-d9f7-4771-bbbe-b198f1383289	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	STATUS_CHANGE	0:0:0:0:0:0:0:1	CANDIDATE
\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	Candidate moved to stage: PANEL_REVIEW - Notes: Audit test: moving to panel review	"PANEL_REVIEW"	"RECRUITERS_PHONE_CALL"
\N
f	2026-03-13 15:54:48.824876	2026-03-13 15:54:48.824876	0	550e8400-e29b-41d4-a716-446655440030	550e8400-e29b-41d4-a716-446655440030	1a4463ad-8b26-4be5-8294-78ad96b1b2e0	1ea741bc-80c2-4713-9d4f-c346e51f3b98	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	CREATE
0:0:0:0:0:0:0:1	INTERVIEW
\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	Interview scheduled: SCREENING for candidate 1bc78612-5d9c-4c26-921a-1c77e66c8e01 at 2026-03-14T10:00	"SCREENING - SCHEDULED"
\N
\N
\.


--
-- Data for Name: background_verifications; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.background_verifications (actual_completion_date, expected_completion_date, initiated_date, is_deleted, is_green_channel, priority, review_date, created_at, updated_at, version, created_by, employee_id, id, initiated_by, reviewed_by, tenant_id, updated_by, vendor_id, candidate_email, candidate_name, overall_result, review_notes, status, vendor_name, vendor_reference) FROM stdin;
\
.


--
-- Data for Name: benefit_claim_documents; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.benefit_claim_documents (claim_id, document_url) FROM stdin;
\
.


--
-- Data for Name: benefit_claims; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.benefit_claims (admission_date, appeal_date, approved_amount, claim_date, claimed_amount, copay_amount, deductible_applied, discharge_date, eligible_amount, is_appealed, is_deleted, is_hospitalization, number_of_days, payment_date, pre_authorization_approved, pre_authorization_required, rejected_amount, service_date, approved_at, created_at, processed_at, updated_at, version, approved_by, created_by, dependent_id, employee_id, enrollment_id, id, processed_by, tenant_id, updated_by, appeal_reason, appeal_status, approval_comments, bank_account_number, bill_number, claim_number, claim_type, claimant_name, claimant_relationship, description, diagnosis_code, hospital_name, ifsc_code, payment_mode, payment_reference, pre_authorization_number, prescription_number, procedure_code, processing_comments, provider_name, provider_type, rejection_reason, status, upi_id) FROM stdin;
\
.


--
-- Data for Name: benefit_dependents; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.benefit_dependents (coverage_end_date, coverage_start_date, date_of_birth, has_pre_existing_conditions, is_covered, is_deleted, is_disabled, created_at, updated_at, version, created_by, enrollment_id, id, tenant_id, updated_by, address, birth_certificate_document, city, country, email, first_name, gender, last_name, membership_id, national_id, passport_number, phone, postal_code, pre_existing_conditions, relationship, relationship_proof_document, state, status) FROM stdin;
\
.


--
-- Data for Name: benefit_enrollments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.benefit_enrollments (claims_utilized, cobra_active, cobra_end_date, cobra_premium, cobra_start_date, current_coverage, effective_date, employee_contribution, employer_contribution, enrollment_date, flex_credits_used, is_deleted, out_of_pocket_cost, remaining_coverage, termination_date, total_premium, waived, waiver_date, approved_at, created_at, updated_at, version, approved_by, benefit_plan_id, created_by, employee_id, id, tenant_id, updated_by, approval_comments, coverage_level, membership_id, nominee_details, policy_card_number, selected_options, status, waiver_reason) FROM stdin;
\
.


--
-- Data for Name: benefit_plans; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.benefit_plans (coverage_amount, effective_date, employee_contribution, employer_contribution, expiry_date, is_active, created_at, updated_at, version, id, provider_id, tenant_id, benefit_type, plan_code, plan_name, description, eligibility_criteria) FROM stdin;
\
.


--
-- Data for Name: benefit_plans_enhanced; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.benefit_plans_enhanced (annual_wellness_allowance, cobra_continuation_months, cobra_eligible, copay_percentage, counseling_sessions_per_year, coverage_amount, deductible_amount, dependents_covered, effective_from, effective_to, employee_contribution, employee_contribution_percentage, employer_contribution, employer_contribution_percentage, employer_match_percentage, flex_credits_provided, gym_membership_included, is_active, is_deleted, is_flexible, maternity_benefits, maternity_coverage, max_contribution_limit, max_dependents, mental_health_support, min_service_months, network_hospitals_only, pre_existing_covered, pre_existing_waiting_years, premium_amount, room_rent_limit, sum_insured, vesting_period_years, waiting_period_days, created_at, updated_at, version, created_by, id, tenant_id, updated_by, category, description, eligible_departments, eligible_grades, flexible_options, name, plan_type, policy_number, premium_frequency, provider_code, provider_name) FROM stdin;
\
.


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.blog_categories (is_deleted, order_index, color, created_at, updated_at, version, created_by, id, tenant_id, updated_by, icon, name, slug, description) FROM stdin;
\
.


--
-- Data for Name: blog_comments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.blog_comments (is_approved, is_deleted, like_count, approved_at, created_at, updated_at, version, approved_by, created_by, id, parent_comment_id, post_id, tenant_id, updated_by, content) FROM stdin;
\
.


--
-- Data for Name: blog_likes; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.blog_likes (is_deleted, created_at, updated_at, version, created_by, id, post_id, tenant_id, updated_by, user_id) FROM stdin;
\
.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.blog_posts (comment_count, is_deleted, is_featured, like_count, read_time_minutes, view_count, created_at, featured_until, last_viewed_at, published_at, scheduled_for, updated_at, version, category_id, created_by, id, last_viewed_by, published_by, tenant_id, updated_by, status, visibility, featured_image_url, slug, title, content, excerpt) FROM stdin;
\
.


--
-- Data for Name: budget_scenarios; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.budget_scenarios (attrition_rate_adjustment, cost_variance, headcount_adjustment, hiring_freeze, is_deleted, is_selected, projected_cost, projected_headcount, salary_adjustment_percent, variance_percent, created_at, updated_at, version, base_budget_id, created_by, id, tenant_id, updated_by, description, name, notes, scenario_type) FROM stdin;
\
.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.calendar_events (all_day, is_recurring, reminder_minutes, reminder_sent, created_at, end_time, last_synced_at, recurrence_end_date, start_time, updated_at, created_by, employee_id, id, organizer_id, parent_event_id, tenant_id, attendee_ids, color, description, event_type, external_event_id, location, meeting_link, notes, recurrence_pattern, status, sync_provider, sync_status, title, visibility) FROM stdin;
\
.


--
-- Data for Name: candidate_match_scores; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.candidate_match_scores (cultural_fit_score, education_match_score, experience_match_score, overall_match_score, skills_match_score, created_at, updated_at, candidate_id, id, job_opening_id, tenant_id, ai_model_version, recommendation, gaps, matching_criteria, strengths) FROM stdin;
70	80	75	78	85	2026-03-13 14:14:29.195197	2026-03-13 14:14:29.195203	50b555fc-5964-4aa1-9743-62fae36c21eb	d13fa23e-2be4-40c4-b244-b07c21b1261c	d4540c54-fb21-45ce-9c1a-638cf5652ca0	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 14:14:29.19862	2026-03-13 14:14:29.198625	fd8622b7-7f4d-4f5f-a440-a0908058d65e	01b91fef-6e3a-4360-ac7e-eb152a30526e	d4540c54-fb21-45ce-9c1a-638cf5652ca0	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:02:39.090239	2026-03-13 16:02:39.090282	21b30a64-9e07-41be-a7a3-4d64b2d16b77	6c51e0c6-0388-442e-bafe-ade9b6227844	8c5809af-88ec-4274-92c4-019997274f6f	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:02:40.728821	2026-03-13 16:02:40.728832	42ef8f4b-1bbc-402c-8386-685727048fa8	490ea967-9a8a-4330-bc36-91ef1f5df873	b998cfb7-e78c-46cd-833b-e7b828f58cbf	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:02:42.054284	2026-03-13 16:02:42.054294	e57f2c9f-69cd-4dce-b5fc-419b059dbc0c	ef2aae32-9f77-42da-93ff-12f0dabf0d3f	9618fd9f-8177-442a-84d8-37b1726e8b00	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:02:43.249892	2026-03-13 16:02:43.249899	95a2cfc5-ef16-45a2-a143-b12419f3e98c	c0df0a3a-9553-4ac4-bfc9-6dee9ec35405	8c5809af-88ec-4274-92c4-019997274f6f	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:05:10.090939	2026-03-13 16:05:10.090966	20e88e37-9346-4b50-8f58-11a3ba054046	790909cc-c0dd-47ee-b827-4db93e14887e	8c5809af-88ec-4274-92c4-019997274f6f	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:05:10.940782	2026-03-13 16:05:10.940788	921cffb7-f52f-4d0b-96af-b1ea46ac0744	ee0e1e57-c36c-48f5-9b07-65b1ec777463	b998cfb7-e78c-46cd-833b-e7b828f58cbf	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
70	80	75	78	85	2026-03-13 16:05:12.040239	2026-03-13 16:05:12.040244	a05edbab-3422-44c4-8739-a855a81ca823	6a643d5c-89c7-434e-a008-c3755766fef8	b998cfb7-e78c-46cd-833b-e7b828f58cbf	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	RECOMMENDED	Limited leadership experience,No cloud certification
\N	Strong technical skills,Relevant experience,Good communication
69	63	61	64	55	2026-03-13 16:45:37.474293	2026-03-13 16:45:37.474869	1bc78612-5d9c-4c26-921a-1c77e66c8e01	7df66a5d-21e3-4130-bf40-5e4757884d2c	9618fd9f-8177-442a-84d8-37b1726e8b00	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	CONSIDER	No cloud platform certification,Gap in specific technical domain
\N	Adaptability,Proven track record
44	38	57	47	51	2026-03-13 14:14:29.150424	2026-03-13 16:47:06.319764	dd520402-dba4-400c-bb6c-f2e2969ef6f9	566074c3-f4fa-484f-98a2-9712d449627f	d4540c54-fb21-45ce-9c1a-638cf5652ca0	660e8400-e29b-41d4-a716-446655440001	gpt-4o-mini-v1	NOT_RECOMMENDED	Limited experience with modern frameworks,Gap in specific technical domain,Gap in specific technical domain
\N	Cultural fit
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.candidates (applied_date, current_ctc, expected_ctc, notice_period_days, offer_accepted_date, offer_declined_date, offer_extended_date, offered_ctc, proposed_joining_date, total_experience, created_at, updated_at, assigned_recruiter_id, id, job_opening_id, offer_letter_id, tenant_id, phone, status, candidate_code, current_stage, first_name, last_name, source, current_company, current_designation, current_location, email, offered_designation, resume_url, notes, offer_decline_reason, created_by, updated_by, version, is_deleted) FROM stdin;
2026-01-15
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-01-15 02:56:28.004	2026-01-15 02:56:28.004
\N	1bc78612-5d9c-4c26-921a-1c77e66c8e01	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL639	RECRUITERS_PHONE_CALL	John	smith
\N
\N
\N
\N	raj@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2025-11-26
\N
\N
\N
\N
\N
\N
\N
\N
\N	2025-11-26 14:54:17.566	2026-03-13 14:38:33.594112
\N	dd520402-dba4-400c-bb6c-f2e2969ef6f9	d4540c54-fb21-45ce-9c1a-638cf5652ca0
\N	660e8400-e29b-41d4-a716-446655440001	9988771122	SCREENING	APL415	PANEL_REVIEW	Sahana	Devi
\N
\N
\N
\N	sahana.devi@example.com
\N	a598qf1pae8mimxkk1c	Audit test: moving to panel review
\N
\N	550e8400-e29b-41d4-a716-446655440030	1	f
2025-10-24
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2025-10-24 12:29:53.643	2025-10-24 12:29:53.643
\N	6f5dd141-f35e-4d33-88be-fdab69f79057	3db6fe94-3328-47c4-a872-ed4a44975d68
\N	660e8400-e29b-41d4-a716-446655440001	+81 90 1234 5678	NEW	APL216	RECRUITERS_PHONE_CALL	Tanjiro	Kamado
\N	Hashira Technologie
\N	Tamil Nadu, India	tanjiro.kamado@example.com
\N	sktwi1m9mhk2w8h3
\N
\N
\N
\N	0	f
2025-11-10
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-11-10 10:42:17.48	2025-11-10 10:49:38.31
\N	cc2dc239-f70f-40b0-b5b9-a155a0deead9	f24e9086-6449-434f-aa2b-aabba679651e
\N	660e8400-e29b-41d4-a716-446655440001	+1 (555) 123-9876	REJECTED	APL382	CANDIDATE_REJECTED	ZENITSU	AGATSUMA
\N	Hashira Technologies
\N	Arunachal Pradesh, India	zenitsu.agatsuma@example.com
\N	a598qf165efmhykabkq
\N
\N
\N
\N	0	f
2025-11-10
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2025-11-10 10:44:32.128	2025-11-10 10:49:40.589
\N	0d521b7d-de9d-4ea3-869b-bab48ac6ed1d	f24e9086-6449-434f-aa2b-aabba679651e
\N	660e8400-e29b-41d4-a716-446655440001	+1 (555) 222-4466	REJECTED	APL383	CANDIDATE_REJECTED	Inosuke	Hashibira
\N	Hashira Technologies inc
\N	Tamil Nadu, India	inosuke.hashibira@example.com
\N	a598qfu77tmhsoty5f	[Hr Admin] test
\N
\N
\N	0	f
2025-11-13
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2025-11-13 19:06:34.441	2025-11-14 13:22:20.502
\N	89ab2d95-8af8-41d9-a3ae-d17b1014435c	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	NEW	APL386	RECRUITERS_PHONE_CALL	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2025-11-14
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-11-14 13:23:54.899	2025-11-14 13:23:54.899
\N	fcd7bb50-ae4d-4d13-8b8f-c99abf6e261b	3db6fe94-3328-47c4-a872-ed4a44975d68
\N	660e8400-e29b-41d4-a716-446655440001	+1 (555) 123-9876	NEW	APL387	RECRUITERS_PHONE_CALL	ZENITSU	AGATSUMA
\N	Hashira Technologies
\N	Arunachal Pradesh, India	zenitsu.agatsuma@example.com
\N	a598qf165efmhykabkq
\N
\N
\N
\N	0	f
2025-11-18
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-11-18 15:43:46.708	2025-11-18 15:43:46.708
\N	bdd9d3b2-14b5-4e8a-8e1a-79166f401d0b	3db6fe94-3328-47c4-a872-ed4a44975d68
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	NEW	APL398	RECRUITERS_PHONE_CALL	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2025-11-18
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2025-11-18 15:44:21.844	2025-11-18 15:44:21.844
\N	12f88d99-f775-46f6-ac6a-dfdc41eaeb83	3db6fe94-3328-47c4-a872-ed4a44975d68
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	NEW	APL399	RECRUITERS_PHONE_CALL	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2025-11-19
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-11-19 15:06:39.455	2025-11-19 15:06:39.455
\N	2500b1af-2aa0-4586-af42-019e8dcc5357	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	NEW	APL404	RECRUITERS_PHONE_CALL	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2025-11-20
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-11-20 13:08:10.945	2025-12-04 10:34:05.197
\N	e40c34b5-e1c9-4193-9f16-2c0554a075e0	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	REJECTED	APL408	PANEL_REJECT	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2025-11-20
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-11-20 14:43:01.049	2025-11-20 14:43:01.049
\N	91371829-d51c-40ac-ab26-b9fdeaafa394	c8ffd341-dacd-4e7b-8add-ca746f223e66
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	NEW	APL410	RECRUITERS_PHONE_CALL	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2025-12-01
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2025-12-01 15:56:17.851	2025-12-04 10:34:42.207
\N	dbcd1542-2791-4777-b74e-5bb1fdd7ac64	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	OFFER_EXTENDED	APL422	OFFER_NDA_TO_BE_RELEASED	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-12-04 14:04:10.265	2025-12-04 14:05:22.294
\N	51276120-0496-48f8-8848-5a9fc42ef66d	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	INTERVIEW	APL472	TECHNICAL_INTERVIEW_COMPLETED	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2025-12-04 15:32:33.757	2025-12-04 15:32:33.757
\N	2ff818fd-d685-4394-88fb-8577bcfe1bdd	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL479	RECRUITERS_PHONE_CALL	vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+12@nulogic.io
\N	g2pc75xwmir9ohfv
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-04 15:35:33.687	2025-12-04 15:35:33.687
\N	f951f207-959e-4446-9333-60df4838d45c	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL480	RECRUITERS_PHONE_CALL	vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+10@nulogic.io
\N	g2pc75xwmiranh9v
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2025-12-04 15:39:04.73	2025-12-04 15:39:04.73
\N	598b0718-bc34-44ed-8099-a28570719f4c	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL481	RECRUITERS_PHONE_CALL	vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan@nulogic.io
\N	j3cwwmlgg7dcf
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-04 15:49:21.245	2025-12-04 15:49:21.245
\N	658af965-ded0-4d90-9ab3-74d6288ead19	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL482	RECRUITERS_PHONE_CALL	vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+20@nulogic.io
\N	g2pc75xwmirapayv
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-04 15:52:04.333	2025-12-04 15:52:04.333
\N	7ed1d03b-ceeb-475a-a16d-252765f98bd8	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL483	RECRUITERS_PHONE_CALL	vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+30@nulogic.io
\N	g2pc75xwmirapayv
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-04 15:53:38.115	2025-12-04 15:53:38.115
\N	29149cc0-03d6-488f-840e-71f79af8a378	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL484	RECRUITERS_PHONE_CALL	vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+40@nulogic.io
\N	g2pc75xwmirarbwt
\N
\N
\N
\N	0	f
2025-12-04
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-12-04 19:13:13.5	2025-12-04 19:13:13.5
\N	eaaf164a-799e-4206-bbf2-76a7a416c11e	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL529	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2025-12-05
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-12-05 15:01:53.231	2025-12-05 15:01:53.231
\N	84da1686-4ed8-4736-a8f9-552a5e000420	fdc2865d-440d-48a3-8bc7-fed850ce137b
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	NEW	APL535	RECRUITERS_PHONE_CALL	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2025-12-08
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2025-12-08 16:23:40.334	2025-12-11 15:27:08.522
\N	7b4549ed-fc0d-4dd9-84af-163770bb1cd1	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	REJECTED	APL542	PANEL_REJECT	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2025-12-10 14:35:08.814	2025-12-10 14:35:08.814
\N	bf00c388-f470-46e8-be1d-763668d1a50c	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL543	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+110@nulogic.io
\N	g2pc73d8mizs61pt
\N
\N
\N
\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2025-12-10 14:54:31.007	2025-12-10 14:54:31.007
\N	67ccbf41-c979-4848-9e37-f3028b25a3f4	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL545	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+130@nulogic.io
\N	g2pc73d8mizsyi9g
\N
\N
\N
\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2025-12-10 15:23:22.527	2025-12-10 15:23:22.527
\N	34992ef5-b36f-4dbe-bc67-a5b1556ae31d	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL546	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+140@nulogic.io
\N	g2pc73d8miztzoyv
\N
\N
\N
\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2025-12-10 17:48:55.925	2025-12-10 17:48:55.925
\N	42b4bc98-79dd-4540-b405-68c3b597a5f2	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL547	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+150@nulogic.io
\N	g2pc73d8miztzoyv
\N
\N
\N
\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-10 17:59:38.388	2025-12-10 17:59:38.388
\N	a6552942-1b76-4abe-9c80-83d70f04afd9	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL548	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+160@nulogic.io
\N	g2pc73d8mizzkic4
\N
\N
\N
\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-10 18:05:10.861	2025-12-10 18:05:10.861
\N	b5f95ec3-a03a-4381-b0bc-960bc543859e	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL549	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+170@nulogic.io
\N	g2pc73d8mizzkic4
\N
\N
\N
\N	0	f
2025-12-10
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-10 18:06:46.418	2025-12-10 18:06:46.418
\N	562842d0-b144-474e-a01e-6864e8d8324f	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL550	RECRUITERS_PHONE_CALL	Vanitha	G
\N
\N
\N
\N	vanitha.ganeshan+180@nulogic.io
\N	g2pc73d8mizztlbd
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2025-12-11 14:33:16.897	2025-12-11 14:33:16.897
\N	36641963-e294-461d-93fc-a69e8631ad17	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL551	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+190@nulogic.io
\N	g2pc76gsmj17mvpy
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	12.00	2025-12-11 14:41:53.74	2025-12-11 14:41:53.74
\N	956db633-dd23-4df8-b73d-273eca3cab5c	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL552	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+210@nulogic.io
\N	g2pc79momkwdjujk
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	6.00	2025-12-11 15:40:42.219	2025-12-11 15:40:42.219
\N	5ab222f9-586f-4478-b6c8-4da9f13ae24f	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL553	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+11@nulogic.io
\N	g2pc76gsmj1a1urt
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	6.00	2025-12-11 15:46:03.349	2025-12-11 15:46:03.349
\N	85c34560-454b-4bee-8508-d0b19ca96b94	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL554	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+14@nulogic.io
\N	g2pc76gsmj1a8nqf
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-12-11 15:47:08.324	2025-12-11 15:47:08.324
\N	ad43fa7a-1e70-47af-bee5-9f89be1c917e	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL555	RECRUITERS_PHONE_CALL	vanitha	g
\N
\N
\N
\N	vanitha.ganeshan+15@nulogic.io
\N	a598qf2cju3mj2qb23s
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	6.00	2025-12-11 15:48:41.569	2025-12-11 15:48:41.569
\N	4f8c0dcb-d0a8-465a-8b8e-580a3c1f8d3b	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL556	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+16@nulogic.io
\N	g2pc76gsmj1a8nqf
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	6.00	2025-12-11 15:50:05.079	2025-12-11 15:50:05.079
\N	1936a242-a0a4-4e72-835b-d86553998daf	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL557	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+17@nulogic.io
\N	g2pc76gsmj1a8nqf
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-12-11 16:05:54.312	2025-12-11 16:05:54.312
\N	2f0939aa-6329-4c12-8f62-ee0be476f4db	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL558	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+18@nulogic.io
\N	g2pc76gsmj1ay4ut
\N
\N
\N
\N	0	f
2025-12-11
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2025-12-11 16:08:55.251	2025-12-11 16:08:55.251
\N	ab4c6123-f9c4-4b8e-afc7-ba114189b21c	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL559	RECRUITERS_PHONE_CALL	Vanitha	Ganesh
\N
\N
\N
\N	vanitha.ganeshan+19@nulogic.io
\N	g2pc76gsmj1b1xjy
\N
\N
\N
\N	0	f
2025-12-26
\N
\N
\N
\N
\N
\N
\N
\N	6.00	2025-12-26 11:42:27.082	2025-12-26 11:42:27.082
\N	70906fc0-2988-4900-a7e8-cd6233c46a7e	c8ffd341-dacd-4e7b-8add-ca746f223e66
\N	660e8400-e29b-41d4-a716-446655440001	+91-8792657937	NEW	APL563	RECRUITERS_PHONE_CALL	Ranjeet	Singh
\N
\N
\N
\N	ranjeetpsingh1996@gmail.com
\N	a598qflk6zmk56swm4
\N
\N
\N
\N	0	f
2025-12-26
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2025-12-26 14:57:44.335	2025-12-26 14:57:44.335
\N	5abfeac0-4806-45cf-8cb1-ecc6274051e7	6b175566-c71b-4f93-98d0-5003b147e61f
\N	660e8400-e29b-41d4-a716-446655440001	+91-8328622103	NEW	APL582	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hema1.balusu1994@gmail.com
\N	a598qf3repmlz195m8
\N
\N
\N
\N	0	f
2025-12-30
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2025-12-30 15:30:38.262	2025-12-30 15:30:38.262
\N	acad9fb2-0ed6-45b9-9349-fe9e2eab8b80	88330396-7d10-42ea-a454-709f2677e7e6
\N	660e8400-e29b-41d4-a716-446655440001	+91 90147 66313	NEW	APL598	RECRUITERS_PHONE_CALL	Kanaka	Durga
\N
\N
\N
\N	durga1208.b@gmail.com
\N	a598qf3repmlz195kn
\N
\N
\N
\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-01-05 15:20:47.739	2026-01-05 15:20:47.739
\N	b71a1424-4ad4-4870-a74d-d4fab7274966	6b175566-c71b-4f93-98d0-5003b147e61f
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	NEW	APL600	RECRUITERS_PHONE_CALL	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-01-05 15:22:27.748	2026-01-05 15:22:27.748
\N	20d73645-5b97-434d-aa67-9eb9d77f2e1e	6b175566-c71b-4f93-98d0-5003b147e61f
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	NEW	APL602	RECRUITERS_PHONE_CALL	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-01-05 15:22:33.376	2026-01-05 15:22:33.376
\N	6592100f-ce92-47b9-abbc-cd23082beb96	6b175566-c71b-4f93-98d0-5003b147e61f
\N	660e8400-e29b-41d4-a716-446655440001	+91 63797 95820	NEW	APL604	RECRUITERS_PHONE_CALL	Aravindh	Sakthivel
\N
\N
\N
\N	aravindhsk01@gmail.com
\N	a598qf1wo12mlhopfvb	[Riyaz Ali] nnmn
\n---\n[Hr Admin] dsdsd	\N	\N	\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-01-05 15:22:36.328	2026-01-05 15:22:36.328
\N	0a5c99ea-8b9b-48cf-a5ca-1ea7317dd1c6	6b175566-c71b-4f93-98d0-5003b147e61f
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL605	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-01-05 15:51:33.457	2026-01-05 15:58:01.781
\N	8c1bceda-7adc-4ea5-98ac-155a491f2416	07ebcb55-add5-4909-af5e-f6992ba68acc
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	NEW	APL606	RECRUITERS_PHONE_CALL	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-01-05 15:51:37.843	2026-01-05 15:51:37.843
\N	01dd7725-abcb-47fe-9186-caf8326fee0b	07ebcb55-add5-4909-af5e-f6992ba68acc
\N	660e8400-e29b-41d4-a716-446655440001	+91 63797 95820	NEW	APL608	RECRUITERS_PHONE_CALL	Aravindh	Sakthivel
\N
\N
\N
\N	aravindhsk01@gmail.com
\N	a598qf1wo12mlhopfvb	[Riyaz Ali] nnmn
\n---\n[Hr Admin] dsdsd	\N	\N	\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-01-05 15:55:01.461	2026-01-05 15:57:42.518
\N	a0fe057c-5e76-4787-8635-cc22b7571d1d	07ebcb55-add5-4909-af5e-f6992ba68acc
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	INTERVIEW	APL609	TECHNICAL_INTERVIEW_COMPLETED	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2026-01-05 16:44:27.685	2026-01-05 16:44:27.685
\N	4b1ffd87-f88e-471f-b140-02f0693c26be	07ebcb55-add5-4909-af5e-f6992ba68acc
\N	660e8400-e29b-41d4-a716-446655440001	+91-8328622103	NEW	APL610	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hema1.balusu1994@gmail.com
\N	a598qf3repmlz195m8
\N
\N
\N
\N	0	f
2026-01-05
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-01-05 16:46:29.989	2026-01-05 16:46:29.989
\N	a622fb83-c327-4abb-9176-e0c0318ce135	07ebcb55-add5-4909-af5e-f6992ba68acc
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	NEW	APL611	RECRUITERS_PHONE_CALL	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2026-01-08
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-08 11:36:16.371	2026-01-08 11:36:16.371
\N	50b555fc-5964-4aa1-9743-62fae36c21eb	d4540c54-fb21-45ce-9c1a-638cf5652ca0
\N	660e8400-e29b-41d4-a716-446655440001	9876501234	NEW	APL615	RECRUITERS_PHONE_CALL	Ragul	Krish
\N
\N
\N
\N	ragul.krish@example.com
\N	a598qf1ife3mkzhac0j
\N
\N
\N
\N	0	f
2026-01-08
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-01-08 15:47:53.521	2026-01-08 15:47:53.521
\N	7b72b930-6b60-4dbd-8dce-5cb0f0b49e94	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001	9876001122	NEW	APL631	RECRUITERS_PHONE_CALL	Sameer	Khan
\N
\N
\N
\N	sameer.khan@gmail.com
\N	a598qf9g2mlq7zoxn
\N
\N
\N
\N	0	f
2026-01-08
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-08 19:15:37.171	2026-01-08 19:15:37.171
\N	66a3746b-1926-43d4-b71d-55404c82b6cd	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL634	RECRUITERS_PHONE_CALL	Saurav	Chatterjee
\N
\N
\N
\N	ravs.capricornis@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-08
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-08 19:33:09.013	2026-01-08 19:33:09.013
\N	781f6810-c4a6-4d2b-98cf-bc941d9dbc0b	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL635	RECRUITERS_PHONE_CALL	Saurav01	Chatterjee01
\N
\N
\N
\N	ravs.capricornis01@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-17
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-17 05:11:30.918	2026-01-17 05:11:30.918
\N	f7e41b4c-fc23-48c9-bcbd-d39266ed8f65	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL642	RECRUITERS_PHONE_CALL	Ram	Patel
\N
\N
\N
\N	ram@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-17
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-17 05:50:15.044	2026-01-17 05:50:15.044
\N	6e9ef6f3-f207-4694-8524-05db29d8592a	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL645	RECRUITERS_PHONE_CALL	Ram01	Patel
\N
\N
\N
\N	ram01@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-19 08:01:08.231	2026-01-19 08:01:08.231
\N	6185e67b-2e54-4734-a1a6-ec27fabb6919	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL648	RECRUITERS_PHONE_CALL	TestQA01	Chatterjee
\N
\N
\N
\N	test01@gmail.com
\N	2b6kbmar74mkmbmhps
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-19 08:07:37.057	2026-01-19 08:07:37.057
\N	ab22cbb1-99b1-4fe7-8d96-3df4c1f06aff	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL649	RECRUITERS_PHONE_CALL	TestQA04	Chatterjee
\N
\N
\N
\N	test04@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-19 08:11:19.776	2026-01-19 08:11:19.776
\N	9c303393-301d-4c63-b396-863423dad7b6	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL651	RECRUITERS_PHONE_CALL	TestQA05	Chatterjee
\N
\N
\N
\N	test05@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-19 08:11:20.012	2026-01-19 08:11:20.012
\N	a961d85f-50e0-499a-96e5-62ecf2bd0d48	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL652	RECRUITERS_PHONE_CALL	TestQA07	Chatterjee
\N
\N
\N
\N	test07@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-19 08:27:49.973	2026-01-19 08:27:49.973
\N	0551b3d8-41fb-42bc-b1d0-a1ee0d5a1a51	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL653	RECRUITERS_PHONE_CALL	TestQA08	Chatterjee
\N
\N
\N
\N	test08@gmail.com
\N	2b6kbmamw8mkmb9s1k
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-19 14:37:25.381	2026-01-19 14:37:25.381
\N	fd8622b7-7f4d-4f5f-a440-a0908058d65e	d4540c54-fb21-45ce-9c1a-638cf5652ca0
\N	660e8400-e29b-41d4-a716-446655440001	9876543210	NEW	APL654	RECRUITERS_PHONE_CALL	Rahul	Mehta
\N
\N
\N
\N	rahul.mehta@gmail.com
\N	a598qflk6zmkky2x9c
\N
\N
\N
\N	0	f
2026-01-19
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-19 14:40:25.081	2026-01-19 14:40:25.081
\N	e4681874-ab46-447c-9588-a0fc6345cac1	07ebcb55-add5-4909-af5e-f6992ba68acc
\N	660e8400-e29b-41d4-a716-446655440001	9876543210	NEW	APL655	RECRUITERS_PHONE_CALL	Rahul	Mehta
\N
\N
\N
\N	rahul.mehta@gmail.com
\N	a598qflk6zmkky2x9c
\N
\N
\N
\N	0	f
2026-01-20
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-20 03:03:33.995	2026-01-20 03:03:33.995
\N	11107d1b-4edb-477f-8232-5d12a31313b7	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL656	RECRUITERS_PHONE_CALL	John01	Chatterjee
\N
\N
\N
\N	john01@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-20
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-20 03:10:00.079	2026-01-20 03:10:00.079
\N	a928efc6-ac5e-4dbc-939b-a906ebed7aa3	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL658	RECRUITERS_PHONE_CALL	John04	Chatterjee
\N
\N
\N
\N	john04@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-20
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-20 03:12:54.649	2026-01-20 03:12:54.649
\N	fba9da4d-c342-4a81-8546-27bd78495bb9	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL661	RECRUITERS_PHONE_CALL	John07	Chatterjee
\N
\N
\N
\N	john07@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-21
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-01-21 17:03:53.259	2026-01-21 17:03:53.259
\N	ccd6e6e8-680c-4af9-9b51-873e2f0cf4fb	6b175566-c71b-4f93-98d0-5003b147e61f
\N	660e8400-e29b-41d4-a716-446655440001	+91-9380593614	NEW	APL664	RECRUITERS_PHONE_CALL	Suresh	N
\N
\N
\N
\N	sureshreddy.noti9@gmail.com
\N	a598qflk6zmkny34py
\N
\N
\N
\N	0	f
2026-01-23
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-01-23 09:19:23.681	2026-01-23 09:19:23.681
\N	86d395fa-29d4-4d86-bb3d-b4f480412b4c	fdc2865d-440d-48a3-8bc7-fed850ce137b
\N	660e8400-e29b-41d4-a716-446655440001	9000012345	NEW	APL665	RECRUITERS_PHONE_CALL	Priya	Nair
\N
\N
\N
\N	priya.nair@gmail.com
\N	a598qf1ife3ml0ghsze
\N
\N
\N
\N	0	f
2026-01-23
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-01-23 09:21:51.535	2026-01-23 09:21:51.535
\N	c805bfcc-aaa5-454d-bcf4-3dcadaea0842	fdc2865d-440d-48a3-8bc7-fed850ce137b
\N	660e8400-e29b-41d4-a716-446655440001	9876001122	NEW	APL666	RECRUITERS_PHONE_CALL	Sameer	Khan
\N
\N
\N
\N	sameer.khan@gmail.com
\N	a598qf9g2mlq7zoxn
\N
\N
\N
\N	0	f
2026-01-23
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-23 09:29:35.596	2026-01-23 09:29:35.596
\N	11841bda-d0ee-46c3-b8d3-d1a378935a2f	fdc2865d-440d-48a3-8bc7-fed850ce137b
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL667	RECRUITERS_PHONE_CALL	Priya	Nair
\N
\N
\N
\N	priyanair01@yopmail.com
\N	a598qflk6zmkqcpogm
\N
\N
\N
\N	0	f
2026-01-23
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-23 09:31:13.003	2026-01-23 09:31:13.003
\N	d8312e76-14cc-422c-9cf0-1b939c4062e4	fdc2865d-440d-48a3-8bc7-fed850ce137b
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL668	RECRUITERS_PHONE_CALL	Ankit	Sharma
\N
\N
\N
\N	ankitsharma@yopmail.com
\N	a598qflk6zmkqcrnfa
\N
\N
\N
\N	0	f
2026-01-23
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2026-01-23 14:58:12.3	2026-01-23 14:58:12.3
\N	779e30e3-55fc-41c6-a032-81de46006364	fdc2865d-440d-48a3-8bc7-fed850ce137b
\N	660e8400-e29b-41d4-a716-446655440001	+91-8328622103	NEW	APL669	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hema1.balusu1994@gmail.com
\N	a598qf3repmlz195m8
\N
\N
\N
\N	0	f
2026-01-27
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-01-27 16:42:41.089	2026-01-27 16:48:29.636
\N	59a624bd-897c-462d-bba5-d9082890b689	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	INTERVIEW	APL673	MANAGEMENT_INTERVIEW_SCHEDULED	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2026-01-27
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-01-27 16:45:51.854	2026-01-27 16:45:51.854
\N	14807d8d-d602-4f52-901a-d03edff7af94	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL674	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hemabalusu@yopmail.com
\N	a598qf1ife3mkwhzgdj
\N
\N
\N
\N	0	f
2026-01-27
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-01-27 16:48:06.902	2026-01-27 16:48:38.263
\N	c077a563-c7e2-4a76-b62c-b40b700c2444	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	INTERVIEW	APL675	CLIENT_INTERVIEW_COMPLETED	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2026-01-27
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-01-27 16:48:11.364	2026-01-27 16:48:45
\N	2b16b829-815c-4895-80ad-e4f26a561c8d	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb
\N	660e8400-e29b-41d4-a716-446655440001	+91 63797 95820	SCREENING	APL677	PANEL_SHORTLISTED	Aravindh	Sakthivel
\N
\N
\N
\N	aravindhsk01@gmail.com
\N	a598qf1wo12mlhopfvb	[Riyaz Ali] nnmn
\n---\n[Hr Admin] dsdsd	\N	\N	\N	0	f
2026-01-27
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-01-27 16:48:14.517	2026-01-27 16:48:14.517
\N	6fb8f060-23a7-4a98-ac7a-fb77f0000611	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL678	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-01-27
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-01-27 17:44:37.502	2026-01-29 11:47:53.516
\N	04d0456e-0cce-4545-b9bd-b86fb68b6435	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb
\N	660e8400-e29b-41d4-a716-446655440001
\N	REJECTED	APL679	PANEL_REJECT	Hema	Balusu
\N
\N
\N
\N	hemabalusu@gmail.com
\N	a598qf1ife3mkwk5l67
\N
\N
\N
\N	0	f
2026-01-29
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-01-29 18:46:50.99	2026-01-29 18:46:50.99
\N	ac09c159-ddbb-4401-ae16-10054c922fbf	407c6f39-7e39-40ba-9888-9ec2f9ba3bed
\N	660e8400-e29b-41d4-a716-446655440001	9876501234	NEW	APL682	RECRUITERS_PHONE_CALL	Ragul	Krish
\N
\N
\N
\N	ragul.krish@example.com
\N	a598qf1ife3mkzhac0j
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-01-30 11:12:25.194	2026-01-30 11:12:25.194
\N	479a2c80-5264-43fd-bbe6-8c79c3767632	87491c94-705b-4d85-908e-c278515f8837
\N	660e8400-e29b-41d4-a716-446655440001	9000012345	NEW	APL683	RECRUITERS_PHONE_CALL	Priya	Nair
\N
\N
\N
\N	priya.nair@gmail.com
\N	a598qf1ife3ml0ghsze
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-01-30 11:13:21.669	2026-01-30 11:13:21.669
\N	16da903d-d6b7-43f5-a9fd-d9fe3b791b6f	87491c94-705b-4d85-908e-c278515f8837
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	NEW	APL684	RECRUITERS_PHONE_CALL	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-01-30 11:13:27.055	2026-01-30 11:13:27.055
\N	a35fa893-a8c6-40db-b8da-4558aec95eb6	87491c94-705b-4d85-908e-c278515f8837
\N	660e8400-e29b-41d4-a716-446655440001	+91 63797 95820	NEW	APL686	RECRUITERS_PHONE_CALL	Aravindh	Sakthivel
\N
\N
\N
\N	aravindhsk01@gmail.com
\N	a598qf1wo12mlhopfvb	[Riyaz Ali] nnmn
\n---\n[Hr Admin] dsdsd	\N	\N	\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-01-30 11:13:29.347	2026-01-30 11:13:29.347
\N	a2a44963-39c2-4f26-a76d-c4929361e8e5	87491c94-705b-4d85-908e-c278515f8837
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL687	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:32:37.64	2026-01-30 16:32:37.64
\N	38cc4eb8-4e37-4292-af24-f347ea4a8ab4	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL688	RECRUITERS_PHONE_CALL	John100	Chatterjee
\N
\N
\N
\N	john100@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:32:38.265	2026-01-30 16:32:38.265
\N	26a78096-75f1-4861-bbea-75630e59c95b	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL689	RECRUITERS_PHONE_CALL	John101	Chatterjee
\N
\N
\N
\N	john101@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:32:39.323	2026-01-30 16:32:39.323
\N	fe198b5d-1f8c-4447-aab4-21cc19128b1c	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL690	RECRUITERS_PHONE_CALL	John102	Chatterjee
\N
\N
\N
\N	john102@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:35:47.238	2026-01-30 16:35:47.238
\N	ee6ee227-2da0-4c92-89f9-d40d1a169f21	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL696	RECRUITERS_PHONE_CALL	Alex100	Chatterjee
\N
\N
\N
\N	alex100@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:35:48.156	2026-01-30 16:35:48.156
\N	fe11fe2b-d2a4-45a7-ba6d-891a2b4fc2cb	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL697	RECRUITERS_PHONE_CALL	Alex101	Chatterjee
\N
\N
\N
\N	alex101@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:35:49.382	2026-01-30 16:35:49.382
\N	ddde1cfc-235c-40c3-9aa1-97c1f5d7d212	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL698	RECRUITERS_PHONE_CALL	Alex102	Chatterjee
\N
\N
\N
\N	alex102@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:35:50.266	2026-01-30 16:35:50.266
\N	83765c86-7ea9-4bfd-94a4-d867117fb857	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL699	RECRUITERS_PHONE_CALL	Alex103	Chatterjee
\N
\N
\N
\N	alex103@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-01-30
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-01-30 16:35:51.284	2026-01-30 16:35:51.284
\N	fd060155-ce83-4a35-8853-c64bfd3b48d4	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL700	RECRUITERS_PHONE_CALL	Alex104	Chatterjee
\N
\N
\N
\N	alex104@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	12.00	2026-02-02 03:17:27.929	2026-02-02 03:17:27.929
\N	21b30a64-9e07-41be-a7a3-4d64b2d16b77	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL706	RECRUITERS_PHONE_CALL	Albert	Jonatthan
\N
\N
\N
\N	albert.123@gmail.com
\N	a598qf2ayxfmlj3nnub
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-02 03:23:44.139	2026-02-02 03:23:44.139
\N	42ef8f4b-1bbc-402c-8386-685727048fa8	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL707	RECRUITERS_PHONE_CALL	Raj	Tester
\N
\N
\N
\N	raj.123@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:34:02.894	2026-02-02 03:34:02.894
\N	e57f2c9f-69cd-4dce-b5fc-419b059dbc0c	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL708	RECRUITERS_PHONE_CALL	Tina100	Chatterjee
\N
\N
\N
\N	tina100@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:34:03.615	2026-02-02 03:34:03.615
\N	95a2cfc5-ef16-45a2-a143-b12419f3e98c	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL709	RECRUITERS_PHONE_CALL	Tina102	Chatterjee
\N
\N
\N
\N	tina102@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:34:05.108	2026-02-02 03:34:05.108
\N	20e88e37-9346-4b50-8f58-11a3ba054046	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL710	RECRUITERS_PHONE_CALL	Tina103	Chatterjee
\N
\N
\N
\N	tina103@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:34:05.899	2026-02-02 03:34:05.899
\N	921cffb7-f52f-4d0b-96af-b1ea46ac0744	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL711	RECRUITERS_PHONE_CALL	Tina104	Chatterjee
\N
\N
\N
\N	tina104@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	15.00	2026-02-02 03:34:07.101	2026-02-02 03:34:07.101
\N	a05edbab-3422-44c4-8739-a855a81ca823	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL712	RECRUITERS_PHONE_CALL	Tina105	Chatterjee
\N
\N
\N
\N	tina105@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:37:07.032	2026-02-02 03:37:07.032
\N	45aa0458-d106-4104-a6f7-d3c20fe51d58	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL717	RECRUITERS_PHONE_CALL	Arjun100	Chatterjee
\N
\N
\N
\N	arjun100@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:37:07.9	2026-02-02 03:37:07.9
\N	716c60e1-44f1-4946-b792-4eea64b14b10	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL718	RECRUITERS_PHONE_CALL	Arjun102	Chatterjee
\N
\N
\N
\N	arjun102@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:37:09.084	2026-02-02 03:37:09.084
\N	5a079828-12ca-4627-a6d2-35126914ce79	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL719	RECRUITERS_PHONE_CALL	Arjun103	Chatterjee
\N
\N
\N
\N	arjun103@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:37:10.238	2026-02-02 03:37:10.238
\N	5fbb037a-d77b-4764-a708-bdd24cf5c177	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL720	RECRUITERS_PHONE_CALL	Arjun104	Chatterjee
\N
\N
\N
\N	arjun104@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	15.00	2026-02-02 03:37:11.342	2026-02-02 03:37:11.342
\N	8b744a95-7263-48ac-bb44-6b72f040e25f	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL721	RECRUITERS_PHONE_CALL	Arjun105	Chatterjee
\N
\N
\N
\N	arjun105@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:42:25.096	2026-02-02 03:42:25.096
\N	db3ebfd3-f7a8-4027-92a8-66c9143d4ce1	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL726	RECRUITERS_PHONE_CALL	Karan100	Chatterjee
\N
\N
\N
\N	karan100@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-02 03:42:27.302	2026-02-02 03:42:27.302
\N	2e96901f-ac79-4ca0-89ee-60659c35949b	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL727	RECRUITERS_PHONE_CALL	Karan101	Chatterjee
\N
\N
\N
\N	karan101@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	17.00	2026-02-02 03:42:27.782	2026-02-02 03:42:27.782
\N	6f007df0-2705-4a6e-9ab5-589e22cd226f	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL728	RECRUITERS_PHONE_CALL	Karan102	Chatterjee
\N
\N
\N
\N	karan102@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	17.00	2026-02-02 03:42:29.5	2026-02-02 03:42:29.5
\N	07f09542-39db-400e-ac31-382111407c46	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL729	RECRUITERS_PHONE_CALL	Karan103	Chatterjee
\N
\N
\N
\N	karan103@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	12.00	2026-02-02 03:42:30.51	2026-02-02 03:42:30.51
\N	2a1e5490-d7bb-4bd4-8054-7b86cb3fc41e	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL730	RECRUITERS_PHONE_CALL	Karan104	Chatterjee
\N
\N
\N
\N	karan104@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-02
\N
\N
\N
\N
\N
\N
\N
\N	12.00	2026-02-02 03:42:32.139	2026-02-02 03:42:32.139
\N	56d6d0c9-4968-4d76-a5ce-61549c7962e2	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL731	RECRUITERS_PHONE_CALL	Karan105	Chatterjee
\N
\N
\N
\N	karan105@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-11
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-02-11 12:33:02.777	2026-02-11 12:35:13.966
\N	c45548ee-4b81-41ae-8c71-cd7850161f54	474ecc38-9e7d-4809-9913-e336634d6e36
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	OFFER_EXTENDED	APL737	OFFER_NDA_TO_BE_RELEASED	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2026-02-11
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-11 12:34:23.272	2026-02-11 12:34:23.272
\N	7bc1c3f0-1e7e-4ea2-8af4-be64230a402d	474ecc38-9e7d-4809-9913-e336634d6e36
\N	660e8400-e29b-41d4-a716-446655440001	+918928407308	NEW	APL738	RECRUITERS_PHONE_CALL	Avilash	Jha
\N	Test
\N	Goa, India	avilash1005@gmail.com
\N	a598qf1wo12mlhopfqm
\N
\N
\N
\N	0	f
2026-02-11
\N
\N
\N
\N
\N
\N
\N
\N	2.00	2026-02-11 12:34:28.028	2026-02-11 12:34:28.028
\N	daad4894-25e5-41af-b59b-911e9739f9cf	474ecc38-9e7d-4809-9913-e336634d6e36
\N	660e8400-e29b-41d4-a716-446655440001	+91 63797 95820	NEW	APL740	RECRUITERS_PHONE_CALL	Aravindh	Sakthivel
\N
\N
\N
\N	aravindhsk01@gmail.com
\N	a598qf1wo12mlhopfvb	[Riyaz Ali] nnmn
\n---\n[Hr Admin] dsdsd	\N	\N	\N	0	f
2026-02-11
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-11 12:34:30.565	2026-02-11 12:34:30.565
\N	4afac594-5288-4813-b3c7-2702ad83c1b8	474ecc38-9e7d-4809-9913-e336634d6e36
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL741	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-13 15:40:32.954	2026-02-13 15:40:32.954
\N	20e1f51f-60d1-46ec-b5cb-44e260c97c5a	8ef62d5a-cf8c-49c5-9d73-343c6725e75b
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL742	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-13 15:42:14.888	2026-02-13 15:42:14.888
\N	7070dfcc-1bb0-47fc-af68-9c459ccea99c	4d22e68e-e88f-4932-b65c-b411103b3797
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL743	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-13 15:42:33.586	2026-02-13 15:42:33.586
\N	113c7bb3-7492-4820-bdae-0ccd2746d7d7	4d22e68e-e88f-4932-b65c-b411103b3797
\N	660e8400-e29b-41d4-a716-446655440001	+91 90147 66313	NEW	APL744	RECRUITERS_PHONE_CALL	Kanaka	Durga
\N
\N
\N
\N	durga1208.b@gmail.com
\N	a598qf3repmlz195kn
\N
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2026-02-13 15:48:08.856	2026-02-13 15:48:08.856
\N	81646279-455c-4e80-b527-a3dd242eb757	4d22e68e-e88f-4932-b65c-b411103b3797
\N	660e8400-e29b-41d4-a716-446655440001	+91-8328622103	NEW	APL747	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hema1.balusu1994@gmail.com
\N	a598qf3repmlz195m8
\N
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-13 15:49:26.23	2026-02-13 15:49:26.23
\N	81073fca-b5f9-4bbc-a4c7-f052a64c5754	487fc330-6ee5-4d1b-94e1-9d945a06be02
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL748	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-13 15:49:28.804	2026-02-13 15:49:28.804
\N	c59dc07e-bd71-46be-b17a-69b6cde4ead1	487fc330-6ee5-4d1b-94e1-9d945a06be02
\N	660e8400-e29b-41d4-a716-446655440001	+91 90147 66313	NEW	APL749	RECRUITERS_PHONE_CALL	Kanaka	Durga
\N
\N
\N
\N	durga1208.b@gmail.com
\N	a598qf3repmlz195kn
\N
\N
\N
\N	0	f
2026-02-13
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2026-02-13 15:49:30.977	2026-02-13 15:49:30.977
\N	ee4420b5-fa11-4bf8-bf6d-5501ed1b335f	487fc330-6ee5-4d1b-94e1-9d945a06be02
\N	660e8400-e29b-41d4-a716-446655440001	+91-8328622103	NEW	APL750	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hema1.balusu1994@gmail.com
\N	a598qf3repmlz195m8
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-16 15:46:28.101	2026-03-12 09:37:58.232
\N	dc8f61aa-6828-4985-94f7-e41818433b5d	958785f1-d81a-4c71-9edc-cbf04ee78f14
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL752	RECRUITERS_PHONE_CALL	John	Doe	LINKEDIN
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-16 15:51:19.356	2026-02-16 16:55:09.475
\N	88b3a24c-0b7d-4278-8a9a-fd40510915d4	2d6bfba2-dceb-4517-93c6-542d0c210266
\N	660e8400-e29b-41d4-a716-446655440001
\N	INTERVIEW	APL753	HR_FINAL_INTERVIEW_COMPLETED	Logesh	test
\N
\N
\N
\N	logeshgopu@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-16 16:28:28.56	2026-02-16 16:28:28.56
\N	b68f4bf0-4c46-47cb-8ddc-49bb7ab8cfd1	bc1c03fd-1c9f-4089-bdb2-3497bc0fc9c7
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL755	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-16 16:45:38.313	2026-02-16 16:49:56.13
\N	da8fb341-3f96-493e-934e-e4a14a6654c4	2d6bfba2-dceb-4517-93c6-542d0c210266
\N	660e8400-e29b-41d4-a716-446655440001
\N	REJECTED	APL757	PANEL_REJECT	Umapathi	K
\N
\N
\N
\N	rengoku@gmail.com
\N	a598qf2cui6mlp2v0cx
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2026-02-16 16:50:14.175	2026-02-16 16:50:14.175
\N	7819c23f-7cbd-44a6-8048-c2e5169f714f	3db6fe94-3328-47c4-a872-ed4a44975d68
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL758	RECRUITERS_PHONE_CALL	sam	sam
\N
\N
\N
\N	sam24d@gmail.com
\N	a598qf2cui6mlp30wmm
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-02-17 16:48:44.761	2026-02-17 16:48:44.761
\N	143ab1dd-dc23-4034-9aed-f5a276362f2a	d4fab2b0-e22f-472b-86f2-babde77f04e7
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL792	RECRUITERS_PHONE_CALL	John	smith
\N
\N
\N
\N	raj@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-16 16:52:43.418	2026-02-16 16:52:43.418
\N	6754f2dd-0936-4198-86ca-217f3ede9119	2d6bfba2-dceb-4517-93c6-542d0c210266
\N	660e8400-e29b-41d4-a716-446655440001	9876001122	NEW	APL759	RECRUITERS_PHONE_CALL	Sameer	Khan
\N
\N
\N
\N	sameer.khan@gmail.com
\N	a598qf9g2mlq7zoxn
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-16 16:52:49.342	2026-02-16 16:52:49.342
\N	337d966d-1bc6-438a-81aa-36b8b50e9a44	b0fd2c3c-7c20-4cc5-abba-4ff4ca454b22
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL760	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-16
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-16 17:31:23.933	2026-02-16 17:31:23.933
\N	1fcc6f37-dca9-45fe-8a68-f4e643628b3d	edd316ca-e3f6-4e31-a925-6bfd2a7b1dc2
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL761	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-17 09:46:22.198	2026-02-17 09:46:22.198
\N	ab7246b0-f6e5-4d53-af75-3ce2eea03e94	5ef5368e-0168-429c-8b44-a5c328a58706
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL763	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-17 11:55:49.761	2026-02-17 11:55:49.761
\N	3aaa3e10-b9c1-49f1-84f4-cd31fde72bfc	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL764	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 11:56:23.665	2026-02-17 12:10:25.284
\N	ecb5f31b-8b21-4b31-b3d7-57156e8deca2	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	9876001122	SCREENING	APL765	PANEL_REVIEW	Sameer	Khan
\N
\N
\N
\N	sameer.khan@gmail.com
\N	a598qf9g2mlq7zoxn
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-02-17 11:58:57.38	2026-02-17 12:10:28.244
\N	3675d2a0-f7a8-458c-bf7d-8cb7774a1eb9	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+91-9500372667	SCREENING	APL766	PANEL_REVIEW	Sanjeevikumar	M
\N
\N
\N
\N	sanjeevikumarofficial@gmail.com
\N	a598qf3repmm35tptp
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-02-17 11:59:00.106	2026-02-17 12:10:31.168
\N	b2d29aa9-8fc1-444e-ad9f-10a629ecca75	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+917904513166	SCREENING	APL767	PANEL_REVIEW	Thulasi	Ram
\N
\N
\N
\N	rlthulasiram08@gmail.com
\N	a598qf3repmm35tpv8
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-17 11:59:03.028	2026-02-17 11:59:03.028
\N	539131a3-9296-42d9-bc18-9beff312476b	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+91 7397399373	NEW	APL768	RECRUITERS_PHONE_CALL	MOHAMMED	BASHEER J
\N
\N
\N
\N	basheermohammed925@gmail.com
\N	a598qf3repmm35tpxi	[Hr Admin] Test1
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-17 11:59:07.014	2026-02-17 11:59:07.014
\N	a64e793b-8ff9-40c8-b601-64bcdfb85355	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	8056224609	NEW	APL769	RECRUITERS_PHONE_CALL	Kamatchi	Gengatharan
\N
\N
\N
\N	sushmagengatharan@gmail.com
\N	a598qf3repmm35tq14
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-02-17 11:59:09.869	2026-02-17 11:59:09.869
\N	54ca5f0c-12ef-421b-8597-62f4f2995fee	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	NEW	APL770	RECRUITERS_PHONE_CALL	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 11:59:12.48	2026-02-17 11:59:12.48
\N	592ad24b-0183-446b-a68a-d0ac36848d06	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL771	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-17 11:59:15.406	2026-02-17 11:59:15.406
\N	87f5e9d4-b1bd-40a7-9466-8d367895f72e	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+91 9080241701	NEW	APL772	RECRUITERS_PHONE_CALL	Sai	Prasad
\N
\N
\N
\N	saiprasad3112003@gmail.com
\N	a598qf3repmm35tq72
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-17 11:59:18.515	2026-02-17 11:59:18.515
\N	463db0e0-3700-4292-80e0-0d0699bd44f9	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	8015705516	NEW	APL773	RECRUITERS_PHONE_CALL	Jeyarish	J
\N
\N
\N
\N	jeyarish2003@gmail.com
\N	a598qf3repmm35tqcc
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-02-17 11:59:21.451	2026-02-17 11:59:21.451
\N	25ce39c5-361c-434e-b2e6-bf125f1dd11d	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	9791079322	NEW	APL774	RECRUITERS_PHONE_CALL	LISA	M
\N
\N
\N
\N	lisamahendran3@gmail.com
\N	a598qf3repmm35tqe3
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-17 11:59:24.384	2026-02-17 11:59:24.384
\N	f624e758-db6c-4c23-aa5d-4dcbf0a18b7a	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+91 8341847131	NEW	APL775	RECRUITERS_PHONE_CALL	MANISH	SINGH
\N
\N
\N
\N	manish72singh62@gmail.com
\N	a598qf3repmm35tqge
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-17 11:59:27.211	2026-02-17 11:59:27.211
\N	0154b0e1-3ffd-4c23-88bb-2d235c776a00	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	+916374128035	NEW	APL776	RECRUITERS_PHONE_CALL	KAVIYANJALI	S
\N
\N
\N
\N	kaviya2003jan@gmail.com
\N	a598qf3repmm35tqj9
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-17 12:13:11.501	2026-02-17 12:13:11.501
\N	6050206c-a649-4996-8d4a-42358a71c2ae	5d4c82f3-d4bb-49c6-9cc5-40481e5f4bd7
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL777	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-17 14:19:19.034	2026-02-17 14:19:19.034
\N	9e751003-0ee8-421b-bb0d-df9ff0182180	10a90230-aff8-4a58-8b1e-cd8c891fee4d
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL778	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 14:24:45.783	2026-02-17 14:24:45.783
\N	9f51618d-8ae8-4698-9487-7c6418fa36ae	5d4c82f3-d4bb-49c6-9cc5-40481e5f4bd7
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL779	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 14:25:42.171	2026-02-17 14:25:42.171
\N	5a651e23-d95d-4f5e-a042-1d036a344379	2d6bfba2-dceb-4517-93c6-542d0c210266
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL780	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 14:26:45.914	2026-02-17 14:26:45.914
\N	73e2f004-2c9f-4a6f-8975-4efa676f8650	bc1c03fd-1c9f-4089-bdb2-3497bc0fc9c7
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL782	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 14:27:19.676	2026-02-17 14:27:19.676
\N	d0595281-f80b-4701-90ce-8e40e960041d	8ef62d5a-cf8c-49c5-9d73-343c6725e75b
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL783	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 14:27:47.348	2026-02-17 14:27:47.348
\N	0c24f497-5d77-4d96-ac0e-eb8a2608d0ef	4d22e68e-e88f-4932-b65c-b411103b3797
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL784	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 14:28:17.848	2026-02-17 14:28:17.848
\N	5050ec75-0ad9-49bb-93aa-62cefb733ec7	958785f1-d81a-4c71-9edc-cbf04ee78f14
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL785	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-17 14:52:25.218	2026-02-17 14:52:25.218
\N	7446de68-73fe-4172-8b47-87610f00856b	5d4c82f3-d4bb-49c6-9cc5-40481e5f4bd7
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL786	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-17 16:16:12.513	2026-02-17 16:16:12.513
\N	30d9cccc-29ca-47aa-9af0-8047c876fea5	6c27f05e-f721-4b0f-a04d-9157f4651ff0
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL787	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 16:32:55.792	2026-02-17 16:32:55.792
\N	6d309ee3-ae50-4aeb-a836-a034f921cf8c	d4fab2b0-e22f-472b-86f2-babde77f04e7
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL788	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-17 16:40:43.028	2026-02-17 16:40:43.028
\N	7d65392b-66d6-4907-ae43-27a093e43399	d4fab2b0-e22f-472b-86f2-babde77f04e7
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL789	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-17 16:40:45.865	2026-02-17 16:40:45.865
\N	35301d61-e547-445e-a009-80efeeec3930	d4fab2b0-e22f-472b-86f2-babde77f04e7
\N	660e8400-e29b-41d4-a716-446655440001	+91 90147 66313	NEW	APL790	RECRUITERS_PHONE_CALL	Kanaka	Durga
\N
\N
\N
\N	durga1208.b@gmail.com
\N	a598qf3repmlz195kn
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	8.00	2026-02-17 16:40:48.722	2026-02-17 16:40:48.722
\N	cf400fe2-acdd-4e68-9d22-326e355144db	d4fab2b0-e22f-472b-86f2-babde77f04e7
\N	660e8400-e29b-41d4-a716-446655440001	+91-8328622103	NEW	APL791	RECRUITERS_PHONE_CALL	Hema	Balusu
\N
\N
\N
\N	hema1.balusu1994@gmail.com
\N	a598qf3repmlz195m8
\N
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-17 17:13:20.869	2026-02-17 17:13:20.869
\N	7e4421e9-5d62-48ea-85c2-1d123aa81966	6c27f05e-f721-4b0f-a04d-9157f4651ff0
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL793	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 17:13:44.081	2026-02-17 17:13:44.081
\N	937c1a56-b64b-4553-994c-6bfe8432e0be	6c27f05e-f721-4b0f-a04d-9157f4651ff0
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL794	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-17
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-17 17:30:26.028	2026-02-17 17:30:26.028
\N	59c5759a-48e3-4976-a229-1dbad435f40c	d4fab2b0-e22f-472b-86f2-babde77f04e7
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL795	RECRUITERS_PHONE_CALL	John	smith
\N
\N
\N
\N	jgsdfdshdfsdsf@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-18
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-18 12:44:07.105	2026-02-18 12:44:07.105
\N	864d13b0-855d-47b6-8aed-04ab8f870831	b0fd2c3c-7c20-4cc5-abba-4ff4ca454b22
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL796	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N
\N	test14@gmail.com
\N	a598qfizpmlrp4xh1
\N
\N
\N
\N	0	f
2026-02-20
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-02-20 11:13:03.653	2026-02-20 11:13:03.653
\N	578e0be0-440c-4f8d-a8e1-83276c4ebee5	27a35cb8-0c13-4209-8121-3017dbd4240d
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL798	RECRUITERS_PHONE_CALL	John	smith
\N
\N
\N
\N	raj@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-20
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-20 15:06:17.662	2026-02-20 15:06:17.662
\N	10cf1c97-22e9-4914-82eb-2a5eb6e56b5e	27a35cb8-0c13-4209-8121-3017dbd4240d
\N	660e8400-e29b-41d4-a716-446655440001	+91-9000000001	NEW	APL808	RECRUITERS_PHONE_CALL	Divya	C
\N
\N
\N
\N	divya.c@email.com
\N	a598qf3repmm35r9ph
\N
\N
\N
\N	0	f
2026-02-20
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-20 15:09:30.896	2026-02-20 15:09:30.896
\N	839af5ef-a41a-46d6-80eb-7a1472b42dfd	8ef62d5a-cf8c-49c5-9d73-343c6725e75b
\N	660e8400-e29b-41d4-a716-446655440001	+91-9000000001	NEW	APL812	RECRUITERS_PHONE_CALL	Divya	C
\N
\N
\N
\N	divya.c@email.com
\N	a598qf3repmm35r9ph
\N
\N
\N
\N	0	f
2026-02-20
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-20 15:11:37.826	2026-02-20 15:11:37.826
\N	d2bde3b6-8169-4d4f-bae0-ca338a1ab1af	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001	+91-9000000001	NEW	APL814	RECRUITERS_PHONE_CALL	Divya	C
\N
\N
\N
\N	divya.c@email.com
\N	a598qf3repmm35r9ph
\N
\N
\N
\N	0	f
2026-02-23
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-23 16:53:38.744	2026-02-23 16:54:00.036
\N	c0420457-446c-40e1-bde7-06d612c7455f	087684b9-3813-472a-877b-18b15f9c5b3f
\N	660e8400-e29b-41d4-a716-446655440001	+91-9000000001	NEW	APL820	RECRUITERS_PHONE_CALL	Divya	C
\N
\N
\N
\N	divya.c@email.com
\N	a598qf3repmm35r9ph
\N
\N
\N
\N	0	f
2026-02-24
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-24 15:20:21.233	2026-02-24 15:20:21.233
\N	b15e92ed-9d36-4313-81ae-f3f0ae2bb6d6	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL821	RECRUITERS_PHONE_CALL	Piyush100	Chatterjee
\N
\N
\N
\N	piyush100@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-24
\N
\N
\N
\N
\N
\N
\N
\N	14.00	2026-02-24 15:20:21.985	2026-02-24 15:20:21.985
\N	85a9f1a5-fbca-4ad6-b695-6f68ff09e962	9618fd9f-8177-442a-84d8-37b1726e8b00
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL822	RECRUITERS_PHONE_CALL	Piyush101	Chatterjee
\N
\N
\N
\N	piyush101@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-24
\N
\N
\N
\N
\N
\N
\N
\N	17.00	2026-02-24 15:20:23.784	2026-02-24 15:20:23.784
\N	0d99239e-a171-4086-914a-5388e1bc7103	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL823	RECRUITERS_PHONE_CALL	Piyush102	Chatterjee
\N
\N
\N
\N	piyush102@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-24
\N
\N
\N
\N
\N
\N
\N
\N	17.00	2026-02-24 15:20:26.236	2026-02-24 15:20:26.236
\N	f43b6c44-7623-4f9d-a4f2-9fbb822bac61	8c5809af-88ec-4274-92c4-019997274f6f
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL824	RECRUITERS_PHONE_CALL	Piyush103	Chatterjee
\N
\N
\N
\N	piyush103@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-24
\N
\N
\N
\N
\N
\N
\N
\N	12.00	2026-02-24 15:20:26.986	2026-02-24 15:20:26.986
\N	1d7edb3f-64b9-4c0c-9fd3-55b89c4f3942	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL825	RECRUITERS_PHONE_CALL	Piyush104	Chatterjee
\N
\N
\N
\N	piyush104@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-24
\N
\N
\N
\N
\N
\N
\N
\N	12.00	2026-02-24 15:20:29.143	2026-02-24 15:20:29.143
\N	2df565e3-6a73-4a86-9322-6d780d2f7cd1	b998cfb7-e78c-46cd-833b-e7b828f58cbf
\N	660e8400-e29b-41d4-a716-446655440001
\N	NEW	APL826	RECRUITERS_PHONE_CALL	Piyush105	Chatterjee
\N
\N
\N
\N	piyush105@gmail.com
\N
\N
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-26 13:01:05.258	2026-02-26 13:56:22.879
\N	9c161b83-7198-47e9-845c-da1c29feb9dc	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001
\N	INTERVIEW	APL832	TECHNICAL_INTERVIEW_COMPLETED	Ashay	Test
\N
\N
\N
\N	akshay@gmail.com
\N	a598qf3repmm358fgk
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	7.00	2026-02-26 13:12:08.306	2026-02-26 13:56:24.88
\N	0830758e-2434-4ed3-b5da-562109c46c5c	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001
\N	INTERVIEW	APL833	TECHNICAL_INTERVIEW_SCHEDULED	Arun	M
\N
\N
\N
\N	arun@gmail.com
\N	a598qf3repmm35mwhb
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-26 13:14:51.797	2026-02-26 13:56:27.519
\N	b432c2ad-869d-434b-9186-2e1c100bb8d0	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+91-9000000001	INTERVIEW	APL834	HR_FINAL_INTERVIEW_COMPLETED	Divya	C
\N
\N
\N
\N	divya.c@email.com
\N	a598qf3repmm35r9ph
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-02-26 13:16:47.1	2026-02-26 13:56:29.81
\N	791d4d0a-0111-4aeb-bcc7-9154b7b93fdf	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+91-9500372667	INTERVIEW	APL835	MANAGEMENT_INTERVIEW_COMPLETED	Sanjeevikumar	M
\N
\N
\N
\N	sanjeevikumarofficial@gmail.com
\N	a598qf3repmm35tptp
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-02-26 13:16:49.875	2026-02-26 13:56:32.493
\N	d2fb0c0f-d5f2-44d1-90b4-2ac004d59d88	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+917904513166	REJECTED	APL836	CANDIDATE_REJECTED	Thulasi	Ram
\N
\N
\N
\N	rlthulasiram08@gmail.com
\N	a598qf3repmm35tpv8
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-26 13:16:52.924	2026-02-26 13:56:35.366
\N	23dab806-ed3e-4b2c-a201-980f4b4cbd17	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+91 7397399373	REJECTED	APL837	PANEL_REJECT	MOHAMMED	BASHEER J
\N
\N
\N
\N	basheermohammed925@gmail.com
\N	a598qf3repmm35tpxi	[Hr Admin] Test1
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-26 13:16:56.945	2026-02-26 13:56:38.394
\N	5574829f-91ab-485f-b572-bad0af882d10	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	8056224609	REJECTED	APL838	PANEL_REJECT	Kamatchi	Gengatharan
\N
\N
\N
\N	sushmagengatharan@gmail.com
\N	a598qf3repmm35tq14
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	10.00	2026-02-26 13:17:00.31	2026-02-26 13:17:00.31
\N	e22f0054-82e0-455b-bb95-5c9bd1039ef7	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+1 408 461 6323	NEW	APL839	RECRUITERS_PHONE_CALL	Lakshmi	Vemali
\N
\N
\N
\N	nivvi14@gmail.com
\N	a598qf3repmm35tq2r	[Hr Admin] Test one
\n
\n---\n[Hr Admin] Test edited\n---\n[Hr Admin] Test 123\n\n---\n[Hr Admin] delete	\N	\N	\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	3.00	2026-02-26 13:17:03.516	2026-02-26 13:17:03.516
\N	06576fbb-cb57-41f8-96bc-516c0da53aa2	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+91 8459348473	NEW	APL840	RECRUITERS_PHONE_CALL	Akshay	Kohchade
\N
\N
\N	Bihar, India	akshaykohchade1@gmail.com
\N	a598qf3repmm35tq4c	[Hr Admin] Test Test one two three
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-26 13:17:06.51	2026-02-26 13:17:06.51
\N	d7ae3f6d-1c1c-44b7-9743-0e881a3fc87d	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+91 9080241701	NEW	APL841	RECRUITERS_PHONE_CALL	Sai	Prasad
\N
\N
\N
\N	saiprasad3112003@gmail.com
\N	a598qf3repmm35tq72
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-26 13:17:09.406	2026-02-26 13:17:09.406
\N	b292e1fd-e2d5-4ca9-8a06-bcf056c704a0	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	8015705516	NEW	APL842	RECRUITERS_PHONE_CALL	Jeyarish	J
\N
\N
\N
\N	jeyarish2003@gmail.com
\N	a598qf3repmm35tqcc
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N
\N	2026-02-26 13:17:13.239	2026-02-26 13:17:13.239
\N	622ed556-5724-406f-917a-c1c68b96170c	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	9791079322	NEW	APL843	RECRUITERS_PHONE_CALL	LISA	M
\N
\N
\N
\N	lisamahendran3@gmail.com
\N	a598qf3repmm35tqe3
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-26 13:17:16.251	2026-02-26 13:17:16.251
\N	23c699ef-6aec-444f-b9b2-749c57c9036b	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+91 8341847131	NEW	APL844	RECRUITERS_PHONE_CALL	MANISH	SINGH
\N
\N
\N
\N	manish72singh62@gmail.com
\N	a598qf3repmm35tqge
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	1.00	2026-02-26 13:17:19.149	2026-02-26 13:17:19.149
\N	6b31db50-b4ae-4fc7-9f88-56e37410e4cc	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	+916374128035	NEW	APL845	RECRUITERS_PHONE_CALL	KAVIYANJALI	S
\N
\N
\N
\N	kaviya2003jan@gmail.com
\N	a598qf3repmm35tqj9
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-26 13:17:22.235	2026-02-26 13:17:22.235
\N	8aca3066-c408-40fe-8fbe-806eb57dc29e	924c74ae-411e-4742-b853-0e3e6520bbba
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL846	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-02-26 16:05:56.248	2026-02-26 16:05:56.248
\N	dbe4bbfe-f9b3-4f83-89db-ef19767ab02a	b98484bc-8842-4da2-9ee1-6c29fac096b8
\N	660e8400-e29b-41d4-a716-446655440001	9123456789	NEW	APL847	RECRUITERS_PHONE_CALL	Ankit	Sharma
\N
\N
\N
\N	ankit.sharma@gmail.com
\N	a598qfd6gemm3bv9qd
\N
\N
\N
\N	0	f
2026-02-26
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-02-26 16:06:38.416	2026-02-26 16:06:38.416
\N	d38ef928-cbb5-421b-b6c0-0dca4b03145d	b98484bc-8842-4da2-9ee1-6c29fac096b8
\N	660e8400-e29b-41d4-a716-446655440001	8072117943	NEW	APL848	RECRUITERS_PHONE_CALL	Arun	M
\N
\N
\N	Tamil Nadu, India	arunmanimechvit@gmail.com
\N	a598qfd6gemm3bw6dy	[Hr Admin] Test
\N
\N
\N	0	f
2026-03-02
\N
\N
\N
\N
\N
\N
\N
\N	5.00	2026-03-02 13:23:15.585	2026-03-13 11:28:25.969
\N	2eeb26df-ff67-4ca2-be7f-b6898a4ad6e9	f5ea028b-6a38-48d9-9a0c-cd4433adaccd
\N	660e8400-e29b-41d4-a716-446655440001	9999999999	NEW	APL849	RECRUITERS_PHONE_CALL	John	Doe	OTHER
\N
\N	Tamil Nadu, India	john.doe@example.com
\N	a598qfde0jmm8vthl4
\N
\N
\N
\N	0	f
2026-03-13
\N
\N
\N
\N
\N
\N
\N
\N	4.00	2026-03-13 13:35:47.385	2026-03-13 13:35:47.385
\N	45d1c698-7fc1-47a7-8d39-bc08c55a51c2	f5ea028b-6a38-48d9-9a0c-cd4433adaccd
\N	660e8400-e29b-41d4-a716-446655440001	+91-90000-00000	NEW	APL850	RECRUITERS_PHONE_CALL	Levi	Ackerman
\N
\N
\N
\N	levi.ackerman.dev@example.com
\N	sktwiju2mmom3ybt
\N
\N
\N
\N	0	f
\.


--
-- Data for Name: challenge_participants; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.challenge_participants (completion_percentage, current_streak, goal_achieved, goal_achieved_date, is_deleted, last_activity_date, longest_streak, points_earned, rank_position, total_progress, created_at, joined_at, updated_at, version, challenge_id, created_by, employee_id, id, team_id, tenant_id, updated_by, status, team_name) FROM stdin;
\
.


--
-- Data for Name: chatbot_conversations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.chatbot_conversations (resolved, satisfaction_rating, was_escalated, created_at, updated_at, escalated_to, id, session_id, tenant_id, user_id, status, intent, conversation_history, entities) FROM stdin;
f
\
N	f	2026-03-16 09:25:42.256867	2026-03-16 09:25:42.256934
\N	fb7e5a73-26d8-419c-b1ac-b2192a2ba1e5	fb7e5a73-26d8-419c-b1ac-b2192a2ba1e5	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"content":"Hi","role":"user"},{"content":"Hi","role":"user"},{"content":"I found some relevant information in your knowledge base. Based on the wiki pages and articles I've reviewed, here's a summary of what I found. Please note this is a mock response — configure your AI API key to enable real answers.","role":"assistant"}]
\N
f
\N	f	2026-03-16 09:28:44.052452	2026-03-16 09:28:44.052474
\N	369573a9-56ad-4776-b1e0-5b44f1acda6e	369573a9-56ad-4776-b1e0-5b44f1acda6e	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"role":"user","content":"What are the company policies?"},{"role":"assistant","content":"Sorry, something went wrong: Failed to fetch"},{"role":"user","content":"hi"},{"role":"user","content":"hi"},{"role":"assistant","content":"It seems I don't have any information to provide at this time. The knowledge base appears to be empty. If you'd like to add content or ask a question that might be answered in the future, I'd be happy to help."}]
\N
f
\N	f	2026-03-16 09:38:16.658856	2026-03-16 09:39:19.780755
\N	6e02b0c8-7448-4fa5-ab15-b53ab7506207	6e02b0c8-7448-4fa5-ab15-b53ab7506207	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hey! What's up? How can I help today?"},{"role":"user","content":"Tell me about Employee Onboarding"},{"role":"assistant","content":"Employee Onboarding is a big part of getting new people up to speed here. As per our \\"New Hire Onboarding Process
\\" document, it typically starts with a welcome packet, a meeting with HR, and an introduction to the team. We also have a comprehensive training program outlined in \\"Employee Training and Development
\\" that covers everything from company policies to software usage."},{"role":"user","content":"link for the doc"},{"role":"assistant","content":"Unfortunately, I'm a text-based AI and don't have direct links to share. But I can give you the exact document titles, and you can search for them in our internal knowledge base. The two documents I mentioned are \\"New Hire Onboarding Process
\\" and \\"Employee Training and Development
\\". If you need more info, I can try to summarize or provide more context."},{"role":"user","content":"Architect"},{"role":"user","content":"Architect"},{"role":"assistant","content":"Our company's IT infrastructure is designed by our team of expert architects. I think I've seen a document on the \\"Company IT Infrastructure
\\" that might give you some insight into their work. Let me check..."}]
\N
f
\N	f	2026-03-16 09:39:50.293522	2026-03-16 09:39:50.293541
\N	1149e2ac-09fc-4635-a1ab-bbcf50cfadad	1149e2ac-09fc-4635-a1ab-bbcf50cfadad	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"role":"user","content":"tell me about aura architecture"},{"role":"user","content":"tell me about aura architecture"},{"role":"assistant","content":"Aura architecture? Hmm, I'm not familiar with that term in our knowledge base. We have a lot of information on product architecture, but I don't see anything on Aura specifically. Can you tell me more about what you're looking for?"}]
\N
f
\N	f	2026-03-16 18:54:17.232933	2026-03-16 18:54:32.83266
\N	268187d7-04bf-46c2-bef8-90c4cd14c3c3	268187d7-04bf-46c2-bef8-90c4cd14c3c3	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"role":"user","content":"designing schema"},{"role":"assistant","content":"Designing a schema can be a bit of a challenge. What kind of schema are you looking to design? Is it for a database, a data model, or something else? I'm happy to help if I can."},{"role":"user","content":"give guildlines for that"},{"role":"user","content":"give guildlines for that"},{"role":"assistant","content":"Guidelines for designing a schema. Let me check our company's best practices. We have a document on this, actually. Check out [Database Design Guidelines](https://fluence/wiki/db-design-guidelines) for a comprehensive overview. It covers topics like normalization, data types, and relationships."}]
\N
f
\N	f	2026-03-16 18:55:06.084958	2026-03-16 18:55:54.36413
\N	26246291-0e4f-4e22-97ce-06f76e40476f	26246291-0e4f-4e22-97ce-06f76e40476f	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"role":"user","content":"explain designing a schema for database"},{"role":"assistant","content":"Designing a schema for a database is a crucial step in creating a well-structured and efficient database. It's essentially like creating a blueprint for your database. \\n\\nTo start, you'll want to consider the types of data you'll be storing and how it will be used. Think about the relationships between different pieces of data and how they'll be accessed.\\n\\nHere's a general process to follow:\\n\\n1. Identify the entities: These are the main objects or concepts you'll be storing data about. For example, if you're building a database for a bookstore, entities might include books, customers, orders, and employees.\\n\\n2. Determine the attributes: These are the characteristics or properties of each entity. For example, a book might have attributes like title, author, publication date, and price.\\n\\n3. Define the relationships: These are the connections between different entities. For example, a customer might place multiple orders, and an order might contain multiple books.\\n\\n4. Choose a data model: There are several data models to choose from, including relational, NoSQL, and graph databases.\\n\\n5. Normalize the data: This involves breaking down complex data into simpler, more manageable pieces to reduce data redundancy and improve data integrity.\\n\\nFor more information, check out [Database Design Fundamentals](/fluence/wiki/db-design-fundamentals) and [Database Schema Design](/fluence/wiki/db-schema-design)."},{"role":"user","content":"put the document where youread this"},{"role":"assistant","content":"I didn't actually read those documents. I was just providing general information on designing a database schema. I don't have any specific documents to reference on this topic."},{"role":"user","content":"dont u understand from the docs created here"},{"role":"user","content":"dont u understand from the docs created here"},{"role":"assistant","content":"To be honest, I don't have any documents on database design in our knowledge base. I was just providing general information based on my training data. If you need specific information on database design, I'd be happy to try and help you find the information or point you in the right direction."}]
\N
f
\N	f	2026-03-16 18:56:15.357598	2026-03-16 18:56:32.274396
\N	3a68be2c-b8d9-44af-a625-9bb8b20dfc68	3a68be2c-b8d9-44af-a625-9bb8b20dfc68	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	fluence_chat	[{"role":"user","content":"Database Schema Design"},{"role":"assistant","content":"Database Schema Design is a pretty broad topic. What specific aspect of it are you looking for help with? Are you trying to design a schema from scratch or optimize an existing one?"},{"role":"user","content":"leava policy"},{"role":"user","content":"leava policy"},{"role":"assistant","content":"Leave policy. You can check out [Leave Policy](https://fluence/wiki/leave-policy) for the details. It covers everything from vacation days to sick leave and bereavement leave."}]
\N
\.


--
-- Data for Name: comp_off_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.comp_off_requests (attendance_date, comp_off_days, overtime_minutes, created_at, reviewed_at, updated_at, version, employee_id, id, leave_balance_id, requested_by, reviewed_by, tenant_id, status, reason, review_note) FROM stdin;
\
.


--
-- Data for Name: comp_time_balances; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.comp_time_balances (at_max_balance, current_balance, fiscal_year, is_deleted, max_balance, total_accrued, total_expired, total_forfeited, total_used, created_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: comp_time_transactions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.comp_time_transactions (balance_after, expiry_date, hours, original_accrual_date, overtime_date, transaction_date, usage_date, processed_at, balance_id, id, leave_request_id, overtime_request_id, processed_by, description, transaction_type) FROM stdin;
\
.


--
-- Data for Name: compensation_review_cycles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.compensation_review_cycles (allow_promotions, approval_date, average_increment_target, budget_amount, currency, effective_date, end_date, exclude_notice_period, exclude_probationers, fiscal_year, include_all_employees, is_deleted, max_increment_percentage, min_increment_percentage, min_performance_rating, min_tenure_months, require_performance_rating, revisions_applied, revisions_approved, revisions_drafted, start_date, total_employees, utilized_amount, created_at, updated_at, version, approved_by, created_by, id, tenant_id, updated_by, name, description, cycle_type, status) FROM stdin;
\
.


--
-- Data for Name: compliance_alerts; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.compliance_alerts (due_date, is_auto_generated, is_deleted, reminder_count, created_at, last_reminder_sent, resolved_at, updated_at, version, assigned_to, created_by, id, related_entity_id, resolved_by, tenant_id, updated_by, description, priority, related_entity_type, resolution_notes, status, title, type) FROM stdin;
\
.


--
-- Data for Name: compliance_audit_logs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.compliance_audit_logs (is_deleted, created_at, "timestamp", updated_at, version, created_by, entity_id, id, performed_by, tenant_id, updated_by, action, additional_info, changed_fields, entity_name, entity_type, ip_address, new_value, old_value, performed_by_name, severity, user_agent) FROM stdin;
\
.


--
-- Data for Name: compliance_checklists; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.compliance_checklists (completed_items, is_active, is_deleted, last_completed_date, next_due_date, total_items, created_at, updated_at, version, assigned_to, created_by, id, tenant_id, updated_by, category, description, frequency, name, status) FROM stdin;
\
.


--
-- Data for Name: compliance_policies; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.compliance_policies (acknowledgment_frequency_days, approved_at, effective_date, expiry_date, is_deleted, policy_version, requires_acknowledgment, created_at, updated_at, version, approved_by, created_by, id, tenant_id, updated_by, category, code, description, document_url, name, policy_content, status) FROM stdin;
\
.


--
-- Data for Name: content_views; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.content_views (view_count, view_duration_seconds, created_at, last_viewed_at, content_id, employee_id, id, tenant_id, content_type, view_source) FROM stdin;
\
.


--
-- Data for Name: contract_reminders; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.contract_reminders (is_completed, is_deleted, reminder_date, created_at, notified_at, updated_at, version, contract_id, created_by, id, updated_by, reminder_type, tenant_id) FROM stdin;
\
.


--
-- Data for Name: contract_signatures; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.contract_signatures (is_deleted, created_at, signed_at, updated_at, version, contract_id, created_by, id, signer_id, updated_by, ip_address, signer_role, status, signature_image_url, signer_email, signer_name) FROM stdin;
\
.


--
-- Data for Name: contract_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.contract_templates (is_active, is_deleted, created_at, updated_at, version, created_by, id, tenant_id, updated_by, type, name, content) FROM stdin;
\
.


--
-- Data for Name: contract_versions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.contract_versions (is_deleted, version_number, created_at, updated_at, version, contract_id, created_by, id, updated_by, change_notes, content) FROM stdin;
\
.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.contracts (auto_renew, currency, end_date, is_deleted, renewal_period_days, start_date, value, created_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by, status, type, document_url, description, title, vendor_name, terms) FROM stdin;
\
.


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.currencies (country_code, currency_code, decimal_places, exchange_rate_to_base, is_active, is_base_currency, is_deleted, created_at, updated_at, version, symbol, created_by, id, tenant_id, updated_by, currency_name, notes) FROM stdin;
\
.


--
-- Data for Name: custom_field_definitions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.custom_field_definitions (display_order, is_active, is_deleted, is_required, is_searchable, max_length, max_value, min_length, min_value, show_in_list, created_at, max_file_size, updated_at, version, created_by, id, tenant_id, updated_by, edit_visibility, entity_type, field_type, view_visibility, field_code, field_group, allowed_file_types, field_name, placeholder, description, default_value, options, validation_rules) FROM stdin;
\
.


--
-- Data for Name: custom_field_values; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.custom_field_values (boolean_value, currency_code, date_value, is_deleted, number_value, created_at, date_time_value, file_size, updated_at, version, created_by, entity_id, field_definition_id, id, tenant_id, updated_by, entity_type, file_mime_type, file_value, file_name, multi_select_value, text_value) FROM stdin;
\
.


--
-- Data for Name: custom_scope_targets; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.custom_scope_targets (is_deleted, created_at, updated_at, version, created_by, id, role_permission_id, target_id, tenant_id, updated_by, target_type) FROM stdin;
\
.


--
-- Data for Name: dashboard_widgets; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.dashboard_widgets (height, is_visible, position_x, position_y, refresh_interval, width, created_at, updated_at, dashboard_id, id, tenant_id, widget_type, widget_name, configuration, data_source) FROM stdin;
\
.


--
-- Data for Name: dashboards; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.dashboards (is_default, is_public, created_at, updated_at, created_by, id, owner_id, tenant_id, updated_by, dashboard_type, dashboard_name, description, layout_config) FROM stdin;
\
.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.departments (is_active, is_deleted, created_at, updated_at, version, created_by, id, manager_id, parent_department_id, tenant_id, updated_by, cost_center, code, type, name, location, description) FROM stdin;
\
.


--
-- Data for Name: document_access; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_access (is_active, is_deleted, created_at, expires_at, granted_at, updated_at, version, created_by, department_id, document_id, granted_by, id, role_id, tenant_id, updated_by, user_id, access_level, metadata) FROM stdin;
\
.


--
-- Data for Name: document_approval_tasks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_approval_tasks (approval_level, is_deleted, approved_at, created_at, updated_at, version, approver_id, created_by, delegated_to, id, tenant_id, updated_by, workflow_id, status, comments, metadata) FROM stdin;
\
.


--
-- Data for Name: document_approval_workflows; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_approval_workflows (approval_level, is_deleted, total_approval_levels, completed_at, created_at, initiated_at, updated_at, version, created_by, current_approver_id, document_id, id, requested_by, tenant_id, updated_by, workflow_def_id, status, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: document_approvals; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_approvals (approval_level, approved_at, created_at, updated_at, approver_id, document_id, id, tenant_id, status, comments) FROM stdin;
\
.


--
-- Data for Name: document_categories; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_categories (is_active, is_mandatory, requires_expiry_tracking, retention_period_days, created_at, updated_at, created_by, id, parent_category_id, tenant_id, updated_by, category_code, category_name, description) FROM stdin;
\
.


--
-- Data for Name: document_expiry_tracking; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_expiry_tracking (expiry_date, expiry_notification_sent, is_deleted, is_notified, reminder_days_before, created_at, notified_at, updated_at, version, created_by, document_id, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: document_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_requests (is_deleted, priority, required_by_date, created_at, document_generated_at, processed_at, updated_at, version, created_by, employee_id, id, processed_by, tenant_id, updated_by, addressed_to, delivery_address, delivery_mode, document_type, generated_document_url, processing_notes, purpose, rejection_reason, status) FROM stdin;
\
.


--
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_templates (is_active, is_system_template, requires_approval, created_at, updated_at, created_by, id, tenant_id, updated_by, category, template_code, file_name_pattern, template_name, description, placeholders, template_content) FROM stdin;
\
.


--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.document_versions (is_current, version_number, created_at, file_size, created_by, document_id, id, tenant_id, checksum, file_path, change_summary) FROM stdin;
\
.


--
-- Data for Name: email_notifications; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.email_notifications (is_deleted, retry_count, created_at, scheduled_at, sent_at, updated_at, version, created_by, id, tenant_id, updated_by, status, email_type, recipient_email, recipient_name, subject, body, error_message, metadata) FROM stdin;
\
.


--
-- Data for Name: employee_esi_records; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_esi_records (enrollment_date, exit_date, created_at, updated_at, created_by, employee_id, id, tenant_id, updated_by, esi_number, ip_number, status, dispensary_name) FROM stdin;
\
.


--
-- Data for Name: employee_loans; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_loans (approved_date, disbursement_date, emi_amount, first_emi_date, interest_rate, is_deleted, is_salary_deduction, last_emi_date, outstanding_amount, principal_amount, requested_date, tenure_months, total_amount, created_at, updated_at, version, approved_by, created_by, employee_id, guarantor_employee_id, id, tenant_id, updated_by, guarantor_name, loan_number, loan_type, purpose, rejected_reason, remarks, status) FROM stdin;
\
.


--
-- Data for Name: employee_payroll_records; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_payroll_records (allowances_local, base_salary_local, bonuses_local, employer_other_contributions_local, employer_social_security_local, exchange_rate, gross_pay_base, gross_pay_local, income_tax_local, is_deleted, local_currency, net_pay_base, net_pay_local, other_deductions_local, overtime_local, rate_date, social_security_local, total_deductions_base, total_deductions_local, total_employer_cost_base, total_employer_cost_local, created_at, updated_at, version, created_by, department_id, employee_id, id, location_id, payroll_run_id, tenant_id, updated_by, department_name, employee_name, employee_number, error_message, location_code, notes, status) FROM stdin;
\
.


--
-- Data for Name: employee_pf_records; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_pf_records (enrollment_date, exit_date, is_international_worker, previous_pf_balance, vpf_percentage, created_at, updated_at, uan_number, created_by, employee_id, id, tenant_id, updated_by, status, pf_number) FROM stdin;
\
.


--
-- Data for Name: employee_points; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_points (current_balance, is_deleted, recognitions_given, recognitions_received, total_points_earned, total_points_redeemed, created_at, last_activity_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: employee_profile_update_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_profile_update_requests (id, tenant_id, employee_id, requested_by, status, changes, review_comment, reviewed_by, reviewed_at, created_at, updated_at, created_by, last_modified_by, version, is_deleted) FROM stdin;
\
.


--
-- Data for Name: employee_referrals; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_referrals (bonus_amount, bonus_eligible_date, bonus_paid_date, interview_date, is_deleted, joining_date, known_since, offer_date, screening_date, submitted_date, created_at, updated_at, version, created_by, department_id, hired_employee_id, id, job_id, referrer_id, tenant_id, updated_by, bonus_payment_reference, bonus_status, candidate_email, candidate_linkedin, candidate_name, candidate_phone, job_title, processing_notes, referral_code, referrer_notes, rejection_reason, rejection_stage, relationship, resume_path, status) FROM stdin;
\
.


--
-- Data for Name: employee_skills; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_skills (is_deleted, is_verified, proficiency_level, years_of_experience, created_at, last_used, updated_at, verified_at, version, created_by, employee_id, id, tenant_id, updated_by, verified_by, category, skill_name, source) FROM stdin;
\
.


--
-- Data for Name: employee_tds_declarations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employee_tds_declarations (hra_exemption, lta_exemption, other_exemptions, previous_employer_income, previous_employer_tds, section_24, section_80c, section_80d, section_80e, section_80g, approved_at, created_at, submitted_at, updated_at, financial_year, approved_by, created_by, employee_id, id, tenant_id, updated_by, status, tax_regime, remarks) FROM stdin;
\
.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employees (confirmation_date, date_of_birth, exit_date, is_deleted, joining_date, created_at, updated_at, version, created_by, department_id, id, manager_id, office_location_id, team_id, tenant_id, updated_by, user_id, emergency_contact_number, employment_type, gender, phone_number, postal_code, status, bank_ifsc_code, bank_name, employee_code, job_role, level, tax_id, bank_account_number, city, country, designation, first_name, last_name, middle_name, state, personal_email, address, dotted_line_manager1id, dotted_line_manager2id) FROM stdin;
\N
\
N
\N	f	2026-03-13	2026-03-13 04:06:31.873527	2026-03-13 04:06:31.873527	0
\N
\N	550e8400-e29b-41d4-a716-446655440040
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	550e8400-e29b-41d4-a716-446655440030
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-0001	EXECUTIVE	CXO
\N
\N
\N
\N	System Administrator	Fayaz	M
\N
\N	fayaz.m@nulogic.io
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	f9d2dc7c-47d3-4fbd-a3ff-e8eb71e5924f
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	7ea390bc-b247-46cf-80b9-588a0936e073
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1001
\N
\N
\N
\N
\N
\N	Senior Engineer	Arjun	Patel
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	a9576636-0b2c-42e2-800c-246d3b778d7d
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	28b25de8-b69f-4ca2-939d-70985af46b3a
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1002
\N
\N
\N
\N
\N
\N	Product Manager	Priya	Sharma
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	a8d4e4b9-9adb-486c-82ac-f479b8a1da3b
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	4d9ca304-0c7d-49f2-bafe-2ee371c40d73
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1003
\N
\N
\N
\N
\N
\N	Tech Lead	Rahul	Verma
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	2f555af8-eee6-49c7-814f-0cd8c0730eb1
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	a670f8d2-9792-4fbf-9c33-df3151b12071
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1004
\N
\N
\N
\N
\N
\N	UX Designer	Meera	Nair
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	2807ffee-a7a0-47f2-a538-fe5d89fee3ab
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	a746cb17-ef5d-47ff-a26f-3edc09b68f36
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1005
\N
\N
\N
\N
\N
\N	DevOps Engineer	Vikram	Singh
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	d62afd03-3b01-4f1b-a7e3-2c29d06666ac
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	895cdf79-0ec5-48e6-b40d-10409d68140a
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1006
\N
\N
\N
\N
\N
\N	QA Lead	Kavitha	Rajan
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	e6618f04-3cd5-4589-b815-1c760770e18c
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	fe22cf2e-63f8-4c35-8bda-567638b0f214
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1007
\N
\N
\N
\N
\N
\N	HR Manager	Deepa	Kumar
\N
\N
\N
\N
\N
\N
\N
\N
\N	f	2025-09-16	2026-02-13 22:09:22.446914	2026-03-15 22:09:22.446914	0
\N
\N	8ff4eea5-0744-4adc-8901-cf82f87766cf
\N
\N
\N	660e8400-e29b-41d4-a716-446655440001
\N	971688c9-6979-4df4-ae3f-46a344b13742
\N	FULL_TIME
\N
\N
\N	ACTIVE
\N
\N	EMP-1008
\N
\N
\N
\N
\N
\N	Data Analyst	Ananya	Reddy
\N
\N
\N
\N
\N
\N
\.


--
-- Data for Name: employment_change_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.employment_change_requests (current_confirmation_date, effective_date, is_deleted, new_confirmation_date, approved_at, created_at, rejected_at, updated_at, version, approver_id, created_by, current_department_id, current_manager_id, employee_id, id, new_department_id, new_manager_id, requester_id, tenant_id, updated_by, current_employment_type, current_status, new_employment_type, new_status, status, change_type, current_job_role, current_level, new_job_role, new_level, reason, rejection_reason, current_designation, new_designation) FROM stdin;
\
.


--
-- Data for Name: engagement_scores; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.engagement_scores (average_sentiment, communication_score, company_benchmark, company_culture_score, compensation_score, detractors, growth_opportunities_score, industry_benchmark, job_satisfaction_score, leadership_score, manager_relationship_score, negative_responses, neutral_responses, nps_score, overall_score, passives, positive_responses, previous_score, promoters, recognition_score, response_rate, score_date, score_delta, team_collaboration_score, total_eligible, total_responses, work_environment_score, work_life_balance_score, calculated_at, department_id, id, location_id, survey_id, tenant_id, employment_type, grade, score_level, score_type) FROM stdin;
\
.


--
-- Data for Name: esi_configs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.esi_configs (effective_from, effective_to, employee_contribution_percentage, employer_contribution_percentage, is_active, wage_ceiling, created_at, updated_at, created_by, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.exchange_rates (effective_date, expiry_date, from_currency, is_deleted, is_manual_override, rate, to_currency, created_at, updated_at, version, created_by, id, tenant_id, updated_by, notes, rate_type, source) FROM stdin;
\
.


--
-- Data for Name: exit_clearances; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.exit_clearances (approved_date, requested_date, created_at, updated_at, approver_id, exit_process_id, id, tenant_id, status, department, checklist_items, comments) FROM stdin;
\
.


--
-- Data for Name: exit_interviews; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.exit_interviews (actual_date, compensation_rating, growth_opportunities_rating, is_confidential, is_deleted, management_rating, new_salary_increase_percentage, overall_experience_rating, scheduled_date, team_culture_rating, work_life_balance_rating, would_consider_returning, would_recommend_company, created_at, scheduled_time, updated_at, version, created_by, employee_id, exit_process_id, id, interviewer_id, tenant_id, updated_by, detailed_reason, interview_mode, interviewer_notes, new_employer, new_role, primary_reason_for_leaving, public_token, status, suggestions, what_could_improve, what_liked_most) FROM stdin;
\
.


--
-- Data for Name: exit_processes; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.exit_processes (buyout_amount, exit_interview_date, exit_interview_scheduled, final_settlement_amount, last_working_date, notice_period_days, notice_period_served, rehire_eligible, resignation_date, settlement_date, created_at, updated_at, employee_id, hr_spoc_id, id, manager_id, tenant_id, exit_type, status, new_company, new_designation, exit_interview_feedback, notes, reason_for_leaving) FROM stdin;
\
.


--
-- Data for Name: expense_claims; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.expense_claims (amount, claim_date, currency, is_deleted, payment_date, approved_at, created_at, rejected_at, submitted_at, updated_at, version, approved_by, created_by, employee_id, id, rejected_by, tenant_id, updated_by, status, category, claim_number, payment_reference, description, receipt_url, rejection_reason, notes) FROM stdin;
\
.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.feature_flags (enabled, percentage_rollout, created_at, updated_at, created_by, id, tenant_id, updated_by, category, feature_key, feature_name, description, metadata) FROM stdin;
\
.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.feedback (is_anonymous, is_deleted, is_public, created_at, updated_at, version, created_by, giver_id, id, recipient_id, related_review_id, tenant_id, updated_by, feedback_type, category, feedback_text) FROM stdin;
\
.


--
-- Data for Name: feedback_360_cycles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.feedback_360_cycles (end_date, include_manager_review, include_peer_review, include_self_review, include_upward_review, is_anonymous, is_deleted, manager_review_deadline, max_peers_allowed, min_peers_required, nomination_deadline, peer_review_deadline, self_review_deadline, start_date, created_at, updated_at, version, created_by, id, template_id, tenant_id, updated_by, status, name, description) FROM stdin;
\
.


--
-- Data for Name: feedback_360_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.feedback_360_requests (is_deleted, nomination_approved, reminder_count, approved_at, created_at, reminder_sent_at, updated_at, version, approved_by, created_by, cycle_id, id, nominated_by, reviewer_id, subject_employee_id, tenant_id, updated_by, reviewer_type, status) FROM stdin;
\
.


--
-- Data for Name: feedback_360_responses; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.feedback_360_responses (adaptability_rating, communication_rating, is_deleted, is_draft, leadership_rating, overall_rating, problem_solving_rating, teamwork_rating, technical_skills_rating, time_management_rating, work_quality_rating, created_at, submitted_at, updated_at, version, created_by, cycle_id, id, request_id, reviewer_id, subject_employee_id, tenant_id, updated_by, reviewer_type, additional_comments, areas_for_improvement, custom_responses, development_suggestions, specific_examples, strengths) FROM stdin;
\
.


--
-- Data for Name: feedback_360_summaries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.feedback_360_summaries (avg_adaptability, avg_communication, avg_leadership, avg_problem_solving, avg_teamwork, avg_technical_skills, avg_time_management, avg_work_quality, final_rating, is_deleted, manager_overall_rating, manager_review_completed, peer_avg_rating, peer_reviews_completed, responses_received, self_overall_rating, self_review_completed, shared_with_employee, total_reviewers, upward_avg_rating, upward_reviews_completed, created_at, generated_at, shared_at, updated_at, version, created_by, cycle_id, id, subject_employee_id, tenant_id, updated_by, action_items, consolidated_improvements, consolidated_strengths) FROM stdin;
\
.


--
-- Data for Name: file_metadata; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.file_metadata (is_deleted, created_at, file_size, updated_at, version, created_by, entity_id, id, tenant_id, updated_by, category, checksum, content_type, entity_type, storage_path, description, file_name) FROM stdin;
\
.


--
-- Data for Name: flex_benefit_allocations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.flex_benefit_allocations (allocation_date, carryover_amount, carryover_from_year, education_allocation, education_used, expiry_date, fiscal_year, forfeited_credits, health_allocation, health_used, is_deleted, lifestyle_allocation, lifestyle_used, remaining_credits, retirement_allocation, retirement_used, total_credits, transport_allocation, transport_used, used_credits, wellness_allocation, wellness_used, created_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by, status) FROM stdin;
\
.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	0	init	SQL	V0__init.sql	445302432	hrms	2026-03-12 01:16:47.545228	1051	t
2	1	pm schema initial	SQL	V1__pm_schema_initial.sql	-1089822079	hrms	2026-03-12 01:16:48.665049	50	t
3	2	performance review columns	SQL	V2__performance_review_columns.sql	-1122645040	hrms	2026-03-12 01:16:48.727455	10	t
4	3	exit interview public token	SQL	V3__exit_interview_public_token.sql	-467648898	hrms	2026-03-12 01:16:48.743541	3	t
5	4	project allocation columns	SQL	V4__project_allocation_columns.sql	2047166811	hrms	2026-03-12 01:16:48.752054	1	t
6	5	lms completions	SQL	V5__lms_completions.sql	999306351	hrms	2026-03-12 01:16:48.758082	3	t
7	6	payroll statutory columns	SQL	V6__payroll_statutory_columns.sql	1649087821	hrms	2026-03-12 01:16:48.765486	3	t
8	7	report templates	SQL	V7__report_templates.sql	-88855723	hrms	2026-03-12 01:16:48.772429	2	t
9	8	demo seed data	SQL	V8__demo_seed_data.sql	934398779	hrms	2026-03-12 01:16:48.779049	1	t
10	9	performance indexes	SQL	V9__performance_indexes.sql	-1595189335	hrms	2026-03-12 01:16:48.784109	28	t
11	10	comp off shift swap job boards	SQL	V10__comp_off_shift_swap_job_boards.sql	56232974	hrms	2026-03-12 01:16:48.817079	25	t
12	11	mfa quiz learning paths	SQL	V11__mfa_quiz_learning_paths.sql	303188769	hrms	2026-03-12 01:16:48.875044	25	t
13	12	recruitment offer workflow	SQL	V12__recruitment_offer_workflow.sql	1142569731	hrms	2026-03-12 01:16:48.906335	1	t
14	13	user app access join tables	SQL	V13__user_app_access_join_tables.sql	-1743208721	hrms	2026-03-12 01:24:14.820066	21	t
15	14	add webhook delivery columns	SQL	V14__add_webhook_delivery_columns.sql	-1682921816	hrms	2026-03-12 03:43:26.505944	126	t
16	15	knowledge fluence schema	SQL	V15__knowledge_fluence_schema.sql	0	hrms	2026-03-13 04:51:21.685778	0	t
17	16	contract management schema	SQL	V16__contract_management_schema.sql	0	hrms	2026-03-13 04:51:21.685778	0	t
18	17	payment gateway schema	SQL	V17__payment_gateway_schema.sql	0	hrms	2026-03-13 04:51:21.685778	0	t
19	18	document workflow enhancement	SQL	V18__document_workflow_enhancement.sql	0	hrms	2026-03-13 04:51:21.685778	0	t
20	19	platform seed data	SQL	V19__platform_seed_data.sql	-627569337	hrms	2026-03-13 10:24:46.085663	101	t
21	20	recruitment stage pipeline	SQL	V20__recruitment_stage_pipeline.sql	-1647460125	hrms	2026-03-13 13:03:11.988543	130	t
22	21	backfill recruitment audit fields	SQL	V21__backfill_recruitment_audit_fields.sql	-664993330	hrms	2026-03-13 14:32:51.586241	60	t
23	22	add google meet fields to interviews	SQL	V22__add_google_meet_fields_to_interviews.sql	866892741	hrms	2026-03-13 15:20:06.959401	32	t
24	23	add tenant id to contract reminders	SQL	V23__add_tenant_id_to_contract_reminders.sql	1678012423	hrms	2026-03-15 00:18:16.195247	189	t
25	24	fix rls policies	SQL	V24__fix_rls_policies.sql	1423721921	hrms	2026-03-15 00:18:16.460176	59	t
\.


--
-- Data for Name: full_and_final_settlements; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.full_and_final_settlements (advance_recovery, approval_date, asset_damage_deduction, bonus_amount, gratuity_amount, is_deleted, is_gratuity_eligible, last_drawn_salary, leave_encashment, loan_recovery, net_payable, notice_buyout, notice_period_recovery, other_deductions, other_earnings, payment_date, pending_salary, reimbursements, tax_deduction, total_deductions, total_earnings, years_of_service, created_at, updated_at, version, approved_by, created_by, employee_id, exit_process_id, id, prepared_by, tenant_id, updated_by, payment_mode, payment_reference, remarks, status) FROM stdin;
\
.


--
-- Data for Name: generated_documents; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.generated_documents (is_signed, created_at, file_size, updated_at, valid_until, created_by, employee_id, id, template_id, tenant_id, updated_by, status, document_number, mime_type, file_path, generated_data, signature_data) FROM stdin;
\
.


--
-- Data for Name: generated_letters; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.generated_letters (downloaded_by_employee, effective_date, expiry_date, is_deleted, letter_date, letter_version, sent_to_employee, approved_at, created_at, downloaded_at, generated_at, issued_at, sent_at, updated_at, version, approved_by, candidate_id, created_by, employee_id, generated_by, id, issued_by, previous_version_id, template_id, tenant_id, updated_by, additional_notes, approval_comments, category, custom_placeholder_values, generated_content, letter_title, pdf_url, reference_number, status) FROM stdin;
\
.


--
-- Data for Name: global_payroll_runs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.global_payroll_runs (base_currency, employee_count, error_count, is_deleted, location_count, pay_period_end, pay_period_start, payment_date, total_deductions_base, total_employer_cost_base, total_gross_base, total_net_base, warning_count, approved_at, created_at, processed_at, updated_at, version, approved_by, created_by, id, processed_by, tenant_id, updated_by, description, notes, run_code, status) FROM stdin;
\
.


--
-- Data for Name: goals; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.goals (current_value, due_date, is_deleted, progress_percentage, start_date, target_value, weight, created_at, updated_at, version, approved_by, created_by, employee_id, id, parent_goal_id, tenant_id, updated_by, goal_type, measurement_unit, status, category, description, title) FROM stdin;
\
.


--
-- Data for Name: headcount_budgets; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.headcount_budgets (actual_attrition, actual_headcount, actual_hires, actual_salary_spend, actual_total_spend, allocated_budget, attrition_rate, benefits_budget, bonus_budget, closing_headcount, contingency_budget, current_headcount, fiscal_year, is_deleted, opening_headcount, other_budget, planned_attrition, planned_hires, planned_transfers_in, planned_transfers_out, recruitment_budget, salary_budget, total_budget, training_budget, approved_at, created_at, updated_at, version, currency, approved_by, cost_center_id, created_by, department_id, id, submitted_by, tenant_id, updated_by, approval_notes, budget_name, cost_center, cost_center_code, department_name, description, notes, quarter, status) FROM stdin;
\
.


--
-- Data for Name: headcount_positions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.headcount_positions (actual_fill_date, budgeted_benefits, budgeted_salary, fte_count, is_deleted, max_salary, min_salary, planned_fill_date, planned_start_date, total_cost, created_at, updated_at, version, budget_id, created_by, current_employee_id, hiring_manager_id, id, replacement_for, requisition_id, tenant_id, updated_by, employment_type, job_family, job_level, justification, location, position_code, position_title, position_type, status) FROM stdin;
\
.


--
-- Data for Name: health_logs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.health_logs (is_deleted, log_date, points_awarded, value, verified, created_at, logged_at, updated_at, verified_at, version, created_by, employee_id, id, participant_id, tenant_id, updated_by, verified_by, metric_type, notes, source, unit) FROM stdin;
\
.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.holidays (holiday_date, is_deleted, is_optional, is_restricted, year, created_at, updated_at, version, created_by, id, tenant_id, updated_by, holiday_type, holiday_name, applicable_departments, applicable_locations, description) FROM stdin;
\
.


--
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.interviews (duration_minutes, rating, created_at, scheduled_at, updated_at, candidate_id, id, interviewer_id, job_opening_id, tenant_id, interview_type, result, status, interview_round, location, meeting_link, feedback, notes, created_by, updated_by, version, is_deleted, google_meet_link, google_calendar_event_id) FROM stdin;
60
\N	2025-11-03 11:46:25.674	2025-11-05 11:46:00	2025-11-04 12:20:39.923	6f5dd141-f35e-4d33-88be-fdab69f79057	4b64a7c3-c517-4622-8e19-dffbeff7fc96
\N	3db6fe94-3328-47c4-a872-ed4a44975d68	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N	https://meet.google.com/xzx-hhfk-zpz	Worthy canditate
\nStrengths: will power
\nAreas of improvement: none
\nDecision: STRONG_YES	react
\N
\N	0	f
\N
\N
60
\N	2025-11-13 19:20:48.293	2025-11-20 19:19:00	2025-11-13 19:22:51.346	89ab2d95-8af8-41d9-a3ae-d17b1014435c	5cee1d21-22f8-4eb9-ae7e-af0fc9402447
\N	88330396-7d10-42ea-a454-709f2677e7e6	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N	qwertyuoppkhfd
\nStrengths: Test
\nAreas of improvement: Test test
\nDecision: STRONG_YES	qwertyu
\N
\N	0	f
\N
\N
60
\N	2025-12-04 10:36:13.401	2025-12-05 10:30:00	2025-12-04 10:41:43.291	dbcd1542-2791-4777-b74e-5bb1fdd7ac64	054d593c-0732-4ce0-abad-b518b12481eb
\N	8c5809af-88ec-4274-92c4-019997274f6f	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N	This is a test feedback
\nStrengths: Communication, Active , Technical
\nAreas of improvement: Confidence, Test
\nDecision: YES	Tech Interview des
\N
\N	0	f
\N
\N
60
\N	2025-12-09 14:17:22.69	2025-12-31 11:10:00	2025-12-09 14:18:39.212	7b4549ed-fc0d-4dd9-84af-163770bb1cd1	55ab135a-ed45-4fd4-874b-fdcc1c95cacc
\N	9618fd9f-8177-442a-84d8-37b1726e8b00	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N	test test test
\nStrengths: test
\nAreas of improvement: test
\nDecision: MAY_BE	testing
\N
\N	0	f
\N
\N
60
\N	2026-01-05 12:33:12.232	2026-01-16 16:33:00	2026-01-05 12:33:12.232	4f8c0dcb-d0a8-465a-8b8e-580a3c1f8d3b	7f219b9b-ca43-4c60-ae97-83c2c4dd8eec
\N	88330396-7d10-42ea-a454-709f2677e7e6	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N	https://meet.google.com/frk-tpyo-fyo?authuser=0
\N	dcdssdfhj
\N
\N	0	f
\N
\N
60
\N	2026-02-16 18:50:22.428	2026-02-18 02:53:00	2026-02-16 18:50:22.428	d8312e76-14cc-422c-9cf0-1b939c4062e4	d833eb5b-354c-41d6-b8c4-93eb370ea70e
\N	fdc2865d-440d-48a3-8bc7-fed850ce137b	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N
\N	A Support Engineer provides technical assistance to users by troubleshooting software, application, or system issues. Responsible for handling support tickets, diagnosing problems, resolving incidents, and ensuring smooth system operations. Works closely with development and QA teams to escalate and track critical issues while maintaining high customer satisfaction.
\N
\N	0	f
\N
\N
60
\N	2026-02-23 17:02:39.206	2026-02-22 20:02:00	2026-02-23 17:02:39.206	c0420457-446c-40e1-bde7-06d612c7455f	bd00d3ae-5539-4825-aea9-ffcec1f3f9c4
\N	087684b9-3813-472a-877b-18b15f9c5b3f	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N
\N	DHJFKY
\N
\N	0	f
\N
\N
60
\N	2025-11-03 11:46:25.674	2025-11-05 11:46:00	2025-11-04 12:20:39.923	6f5dd141-f35e-4d33-88be-fdab69f79057	4331b0d9-3c7d-4b32-a838-2b708dc1a94c
\N	3db6fe94-3328-47c4-a872-ed4a44975d68	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N	https://meet.google.com/xzx-hhfk-zpz	Worthy canditate
\nStrengths: will power
\nAreas of improvement: none
\nDecision: STRONG_YES	react
\N
\N	0	f
\N
\N
60
\N	2025-11-13 19:20:48.293	2025-11-20 19:19:00	2025-11-13 19:22:51.346	89ab2d95-8af8-41d9-a3ae-d17b1014435c	1e30469c-1724-41ad-9aa2-da0f8723daac
\N	88330396-7d10-42ea-a454-709f2677e7e6	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N	qwertyuoppkhfd
\nStrengths: Test
\nAreas of improvement: Test test
\nDecision: STRONG_YES	qwertyu
\N
\N	0	f
\N
\N
60
\N	2025-12-04 10:36:13.401	2025-12-05 10:30:00	2025-12-04 10:41:43.291	dbcd1542-2791-4777-b74e-5bb1fdd7ac64	1cf1bee2-081f-4bd0-9c4b-55e7404f04ec
\N	8c5809af-88ec-4274-92c4-019997274f6f	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N	This is a test feedback
\nStrengths: Communication, Active , Technical
\nAreas of improvement: Confidence, Test
\nDecision: YES	Tech Interview des
\N
\N	0	f
\N
\N
60
\N	2025-12-09 14:17:22.69	2025-12-31 11:10:00	2025-12-09 14:18:39.212	7b4549ed-fc0d-4dd9-84af-163770bb1cd1	9000b618-83b4-4701-9e20-0781fb256cc8
\N	9618fd9f-8177-442a-84d8-37b1726e8b00	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N	test test test
\nStrengths: test
\nAreas of improvement: test
\nDecision: MAY_BE	testing
\N
\N	0	f
\N
\N
60
\N	2026-01-05 12:33:12.232	2026-01-16 16:33:00	2026-01-05 12:33:12.232	4f8c0dcb-d0a8-465a-8b8e-580a3c1f8d3b	ed516cde-9144-4f2a-a99c-91956ba67549
\N	88330396-7d10-42ea-a454-709f2677e7e6	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N	https://meet.google.com/frk-tpyo-fyo?authuser=0
\N	dcdssdfhj
\N
\N	0	f
\N
\N
60
\N	2026-02-16 18:50:22.428	2026-02-18 02:53:00	2026-02-16 18:50:22.428	d8312e76-14cc-422c-9cf0-1b939c4062e4	9a865855-3abf-450d-9cbe-11895f8923d1
\N	fdc2865d-440d-48a3-8bc7-fed850ce137b	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N
\N	A Support Engineer provides technical assistance to users by troubleshooting software, application, or system issues. Responsible for handling support tickets, diagnosing problems, resolving incidents, and ensuring smooth system operations. Works closely with development and QA teams to escalate and track critical issues while maintaining high customer satisfaction.
\N
\N	0	f
\N
\N
60
\N	2026-02-23 17:02:39.206	2026-02-22 20:02:00	2026-02-23 17:02:39.206	c0420457-446c-40e1-bde7-06d612c7455f	5beb0fe2-235a-4c44-a001-767b805d37fa
\N	087684b9-3813-472a-877b-18b15f9c5b3f	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	TECHNICAL_1
\N
\N
\N	DHJFKY
\N
\N	0	f
\N
\N
60
\N	2026-03-13 15:54:48.811479	2026-03-14 10:00:00	2026-03-13 15:54:48.811479	1bc78612-5d9c-4c26-921a-1c77e66c8e01	1a4463ad-8b26-4be5-8294-78ad96b1b2e0
\N	9618fd9f-8177-442a-84d8-37b1726e8b00	660e8400-e29b-41d4-a716-446655440001	VIDEO
\N	SCHEDULED	SCREENING		https://meet.google.com/tqr-orgx-gie
\N		550e8400-e29b-41d4-a716-446655440030	550e8400-e29b-41d4-a716-446655440030	0	f	https://meet.google.com/tqr-orgx-gie	17sun4n2nieuetdsgvs5ci5ejs
\.


--
-- Data for Name: job_board_postings; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.job_board_postings (applications_count, views_count, created_at, expires_at, last_synced_at, posted_at, updated_at, id, job_opening_id, tenant_id, status, board_name, external_job_id, error_message, external_url) FROM stdin;
\
.


--
-- Data for Name: job_openings; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.job_openings (closing_date, is_active, max_salary, min_salary, number_of_openings, posted_date, created_at, updated_at, department_id, hiring_manager_id, id, tenant_id, priority, status, employment_type, job_code, experience_required, job_title, location, job_description, requirements, skills_required, created_by, updated_by, version, is_deleted) FROM stdin;
\N
t	800000.00	500000.00	1	2025-11-20	2025-11-20 10:39:22.06	2026-01-13 09:19:24.196
\N
\N	b998cfb7-e78c-46cd-833b-e7b828f58cbf	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB012	3-5	IT Support	Chennai	<p>Test description</p>
\N	Networking, Windows, Linux, AWS, Scalefusion, Troubleshooting
\N
\N	0	f
\N	t	3000000.00	1000000.00	1	2026-01-06	2025-12-05 14:53:08.471	2026-01-12 10:48:32.611
\N
\N	fdc2865d-440d-48a3-8bc7-fed850ce137b	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB014	5-10	IT Support II	Chennai	<p>This is a test description</p>
\N	Networking, Windows, Linux, Admin, Team Management
\N
\N	0	f
\N	t	1200000.00	1000000.00	1	2026-01-27	2025-12-08 16:22:23.173	2026-01-27 10:08:59.173
\N
\N	9618fd9f-8177-442a-84d8-37b1726e8b00	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB015	5-10	QA Lead	New York	<p>This is a test description</p>
\N	Test
\N
\N	0	f
\N	t	1600000.00	1200000.00	1	2025-12-26	2025-12-26 12:45:18.91	2025-12-26 15:03:34.823
\N
\N	6b175566-c71b-4f93-98d0-5003b147e61f	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB016	15+	Technical Lead	chile	<p>Test description</p>
\N	Test
\N
\N	0	f
\N	t	500000.00	300000.00	1	2026-01-06	2026-01-05 15:37:01.809	2026-01-22 17:24:15.145
\N
\N	07ebcb55-add5-4909-af5e-f6992ba68acc	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB017	0-1	Test II	New York	<p>This is the test desctiption</p>
\N	Test
\N
\N	0	f
\N	t	500000.00	400000.00	1	2026-02-10	2026-01-22 17:26:18.714	2026-02-10 17:26:45.711
\N
\N	302e0d94-d31f-4228-8e7d-507cc6a1a853	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB020	4	Test III	Mexico	<p>Sample</p>
\N	Java
\N
\N	0	f
\N	f	1000000.00	800000.00	1	2026-01-29	2026-01-27 10:20:58.613	2026-02-02 17:30:32.985
\N
\N	ba7dfc20-75f8-4fa5-8e77-3cade5d673bb	660e8400-e29b-41d4-a716-446655440001	MEDIUM	CLOSED	FULL_TIME	JOB021	5-10	Senior Engineer	Chennai	<p>This is the test description for Senior Engineer</p>
\N	Test
\N
\N	0	f
\N	f	500000.00	300000.00	1	2026-01-29	2026-01-29 12:05:46.376	2026-01-30 11:16:55.142
\N
\N	407c6f39-7e39-40ba-9888-9ec2f9ba3bed	660e8400-e29b-41d4-a716-446655440001	MEDIUM	CLOSED	CONTRACT	JOB022	2-3	Test Z	Chennai	<p>This is test jd for Test Z</p>
\N	Test, Test two
\N
\N	0	f
\N	t	800000.00	500000.00	1	2026-01-29	2026-01-29 18:42:33.588	2026-01-29 18:42:33.588
\N
\N	87491c94-705b-4d85-908e-c278515f8837	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB023	3+	AI Developer	Chennai	<p>This is the test JD for AI developer</p>
\N	AI, ML, Python, SQL
\N
\N	0	f
\N	t	100000000000.00	34355555.00	1	2026-02-09	2026-02-09 17:25:50.318	2026-02-09 17:25:50.318
\N
\N	79f4a6aa-bb59-4312-b888-701fe0ed7bea	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB024	4	 Frontend Engineer (ReactJS/NextJS) 	Mexico	<p>testing purpose sjhdbsds </p>
\N	react
\N
\N	0	f
\N	t	100000.00	10000.00	1	2026-02-10	2026-02-10 12:59:09.931	2026-02-10 17:26:08.45
\N
\N	0ed7fbc4-c076-4847-b7ad-8d7b90cc0811	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB029	3-6	Testing v3	Chennai	<p>test</p>
\N	react
\N
\N	0	f
\N	t	100.00	10.00	1	2026-02-10	2026-02-10 13:21:17.978	2026-02-10 13:21:17.978
\N
\N	5ef5368e-0168-429c-8b44-a5c328a58706	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB031	3-6	Full stack - Test 	Chennai	<p>test <span style="color: rgb(2, 8, 23);">test test test testtesttest</span></p>
\N	test
\N
\N	0	f
\N	t	500000.00	300000.00	1	2026-02-11	2026-02-11 12:28:21.718	2026-02-11 12:32:27.667
\N
\N	474ecc38-9e7d-4809-9913-e336634d6e36	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB032	0-1	Test xyz	Chennai	<p>This is the test dis</p>
\N	skill1, sql, python
\N
\N	0	f
\N	t	9999.00	10.00	1	2026-02-12	2026-02-12 12:34:54.572	2026-02-12 14:23:39.867
\N
\N	edd316ca-e3f6-4e31-a925-6bfd2a7b1dc2	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB033	3-5	Full stack - Test 	Test Location	<p>this is for testing</p>
\N	test
\N
\N	0	f
\N	t	10000.00	10.00	1	2026-02-12	2026-02-12 12:41:43.191	2026-02-12 14:10:12.452
\N
\N	b0fd2c3c-7c20-4cc5-abba-4ff4ca454b22	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB034	3-5	Full stack - Test 	Test Location	<p>test for email</p>
\N	test
\N
\N	0	f
\N	t	9999.00	10.00	1	2026-02-12	2026-02-12 14:31:29.709	2026-02-12 15:11:14.942
\N
\N	1a48e124-c3b1-4c96-b88c-189c95e6765e	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB035	5	Full stack - Test 	Bangalore	<p>This is for testing one</p>
\N	test
\N
\N	0	f
\N	t	9999999.00	10.00	1	2026-02-12	2026-02-12 15:22:47.954	2026-02-12 15:30:37.674
\N
\N	487fc330-6ee5-4d1b-94e1-9d945a06be02	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB036	3-6	Testing	Test Location	<p>this is for testing</p>
\N	test
\N
\N	0	f
\N	t	9998.00	10.00	1	2026-02-13	2026-02-13 10:55:03.722	2026-02-13 10:55:03.722
\N
\N	958785f1-d81a-4c71-9edc-cbf04ee78f14	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB037	3-6	Java Developer	US	<p>testing testing testing </p>
\N	test
\N
\N	0	f
\N	t	1999.00	10.00	1	2026-02-13	2026-02-13 11:15:16.999	2026-02-13 11:59:08.684
\N
\N	4d22e68e-e88f-4932-b65c-b411103b3797	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB040	5-10	DevOps Engineer	Test Location	<p>this is for testing</p>
\N	test
\N
\N	0	f
\N	t	600000.00	400000.00	1	2026-02-13	2026-02-13 14:36:42.295	2026-02-13 19:04:19.521
\N
\N	8ef62d5a-cf8c-49c5-9d73-343c6725e75b	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB041	1	QA	Bangalore	<p>A QA Engineer ensures software quality through manual and automated testing. Responsible for writing test cases, executing test scenarios, identifying defects, and collaborating with developers to resolve issues. Supports regression, functional, and API testing activities.</p>
\N	Testing, Automation, SQL, API
\N
\N	0	f
\N	t	1500000.00	1000000.00	1	2026-02-16	2026-02-16 10:36:53.036	2026-02-16 10:36:53.036
\N
\N	bc1c03fd-1c9f-4089-bdb2-3497bc0fc9c7	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB042	4+	SQL Developer -2	Chennai	<p>A SQL Developer writes and optimizes SQL queries, stored procedures, and database objects. Responsible for data retrieval, report generation, database performance tuning, and maintaining data integrity within relational databases.</p>
\N	SQL, PLSQL
\N
\N	0	f
\N	t	1999999.00	1500000.00	1	2026-02-17	2026-02-16 10:46:01.808	2026-02-17 11:13:18.293
\N
\N	2d6bfba2-dceb-4517-93c6-542d0c210266	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB044	4	Data Sciene-3	Bangalore	<p>A Data Scientist analyzes large datasets to extract insights and build predictive models. Responsible for data cleaning, feature engineering, machine learning model development, and presenting business insights using visualization tools. Works closely with stakeholders to support data-driven decision makin</p>
\N	Data, SQL
\N
\N	0	f
\N	f	2999999.00	2500000.00	1	2026-02-16	2026-02-16 11:14:57.78	2026-02-16 15:13:12.501
\N
\N	f84affef-f776-413e-b491-2212051d7a77	660e8400-e29b-41d4-a716-446655440001	MEDIUM	CLOSED	FULL_TIME	JOB045	7+	Data Engineer	Bangalore	<p>A Data Engineer designs, builds, and maintains scalable data pipelines and ETL processes. Responsible for data integration, transformation, and storage in data warehouses or cloud platforms. Ensures high data quality, performance optimization, and reliable data flow for analytics teams.</p>
\N	Data, Pandas, Management
\N
\N	0	f
\N	f	1600000.00	1100000.00	1	2026-02-16	2026-02-16 15:07:16.952	2026-02-16 15:09:15.511
\N
\N	1d37ae9b-828c-46d9-803e-76ed040f9c31	660e8400-e29b-41d4-a716-446655440001	MEDIUM	CLOSED	FULL_TIME	JOB046	4+	Developer- Java	Delhi	<p>A Software Developer designs and develops web or application features using programming languages and frameworks. Responsible for coding, debugging, API development, database integration, and supporting deployment activities in an Agile environment.</p>
\N	Java, Data base
\N
\N	0	f
\N	t	799999.00	500000.00	1	2026-03-03	2026-02-17 11:28:57.606	2026-03-03 15:11:53.924
\N
\N	5d4c82f3-d4bb-49c6-9cc5-40481e5f4bd7	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB047	2+	Data Analyst	Bangalore	<p>A Data Engineer designs, builds, and maintains scalable data pipelines and ETL processes. Responsible for data integration, transformation, and storage in data warehouses or cloud platforms. Ensures high data quality, performance optimization, and reliable data flow for analytics teams</p>
\N	Data, SQL, Pyrhon, pandas
\N
\N	0	f
\N	t	5000000.00	400000.00	1	2026-02-18	2026-02-17 11:54:16.308	2026-02-18 17:27:01.628
\N
\N	10a90230-aff8-4a58-8b1e-cd8c891fee4d	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB048	1	Bala- Test	Chennai	<p>A QA Engineer ensures software quality through manual and automated testing. Responsible for writing test cases, executing test scenarios, identifying defects, and collaborating with developers to resolve issues. Supports regression, functional, and API testing activities.</p>
\N	QA, Selenium, API, Framework
\N
\N	0	f
\N	t	400000.00	300000.00	1	2026-02-26	2026-02-26 14:08:23.661	2026-02-26 14:10:08.437
\N
\N	02c676b1-8d51-4a07-9a48-0ad6ea0d7789	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB069	1	Python developer	Chennai	<p><span style="color: rgb(0, 0, 0); background-color: transparent;">A Software Developer designs and develops web or application features using programming languages and frameworks. Responsible for coding, debugging, API development, database integration, and supporting deployment activities in an Agile environment.</span></p><p><br></p>
\N	python
\N
\N	0	f
\N	t	3999999.00	290000.00	1	2026-02-26	2026-02-26 15:12:12.167	2026-02-26 15:17:07.583
\N
\N	555aa969-7f33-4698-9057-b3b09872959d	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB070	3-6	QA Engineer	Chennai	<p>A Quality Assurance (QA) Engineer&nbsp;ensures
software products meet quality standards by developing, documenting, and executing manual and automated test plans. They identify, debug, and track defects while collaborating with development teams to ensure high-performance, user-friendly, and bug-free releases.&nbsp;
</p><p><span style="color: rgb(158, 158, 158);">&nbsp;
+3</span></p><p><strong>Key Responsibilities</strong></p><ul><li><strong>Test Strategy &amp; Execution
:</strong>&nbsp;Design
, create, and maintain comprehensive test plans, cases, and automated test scripts.</li><li><strong>Defect Tracking:</strong>&nbsp;Identify
, document, and track software bugs through to resolution, including performing regression testing.</li><li><strong>Testing Types:</strong>&nbsp;Conduct
functional, integration, system, performance, and security testing.</li><li><strong>Collaboration:</strong>&nbsp;
Work with developers and product managers to understand requirements and provide feedback for improvements.</li></ul>
\N	test
\N
\N	0	f
\N	t	39999.00	2999.00	1	2026-02-26	2026-02-26 15:19:51.841	2026-03-03 16:16:11.099
\N
\N	83af8a2c-9fed-4422-9e9e-fd023c350eca	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB072	6	DevOps Engineer	Chennai	<p>this is for testing</p>
\N	tets
\N
\N	0	f
\N	t	30000.00	20000.00	1	2026-02-26	2026-02-26 15:34:00.86	2026-03-11 16:19:57.493
\N
\N	0e8eb295-34d0-487e-9ea9-33b73ba960cc	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB073	1	QA Engineer	Mexico	<p>this is for testing</p>
\N	test
\N
\N	0	f
\N	t	350000.00	250000.00	1	2026-03-03	2026-02-26 16:00:43.564	2026-03-03 15:10:33.938
\N
\N	b98484bc-8842-4da2-9ee1-6c29fac096b8	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB074	1	node js developer	Chile	<ul><li><span style="color: rgb(0, 0, 0); background-color: transparent;">A Software Developer designs and develops web or application features using programming languages and frameworks. Responsible for coding, debugging, API development, database integration, and supporting deployment activities in an Agile environment.</span></li></ul>
\N	Java, Node js
\N
\N	0	f
\N	t	19999.00	1000.00	1	2026-03-02	2026-03-02 11:32:06.953	2026-03-13 12:55:30.82
\N
\N	f5ea028b-6a38-48d9-9a0c-cd4433adaccd	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB075	1-2	Full stack - Test 	Chennai	<p>this is of testing</p>
\N	test
\N
\N	0	f
\N	f	300.00	1.00	1	2025-11-20	2025-09-23 09:57:50.052	2026-02-16 15:11:19.466
\N
\N	d4540c54-fb21-45ce-9c1a-638cf5652ca0	660e8400-e29b-41d4-a716-446655440001	MEDIUM	CLOSED	FULL_TIME	JOB005	3-5	QA Engineer	WFH	<p>This is for testing</p>
\N	Testing
\N
\N	0	f
\N	t	39494.00	2929.00	1	2025-11-27	2025-10-13 12:28:54.755	2026-01-09 12:39:47.332
\N
\N	3db6fe94-3328-47c4-a872-ed4a44975d68	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB006	5	Testing	Chennai	<p>testing purpose</p>
\N	test
\N
\N	0	f
\N	t	200000.00	100000.00	1	2026-01-09	2025-11-04 09:48:05.786	2026-01-09 16:14:02.432
\N
\N	f24e9086-6449-434f-aa2b-aabba679651e	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB007	1-2	Testing v2	Chennai	<p>testing</p>
\N	selenium, java
\N
\N	0	f
\N	t	200.00	10.00	1	2026-01-05	2025-11-07 10:36:14.827	2026-01-05 15:34:11.941
\N
\N	88330396-7d10-42ea-a454-709f2677e7e6	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB008	2	Full stack - Test	New York	<p>Testing Job</p>
\N	test
\N
\N	0	f
\N	t	49998.00	30000.00	1	2026-01-06	2025-11-17 11:53:10.005	2026-01-06 15:54:18.695
\N
\N	dbbb6d45-06ea-4898-9641-97e9245fa0bd	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB010	15	Testing Job	Delhi	<p>Testing Purpose</p>
\N	Testing
\N
\N	0	f
\N	t	59994.00	50000.00	1	2026-01-06	2025-11-17 16:57:35.789	2026-01-12 10:35:23.433
\N
\N	c8ffd341-dacd-4e7b-8add-ca746f223e66	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB011	5-10	Job Testing	Chennai	<p>Testing Purpose Testing</p>
\N	React
\N
\N	0	f
\N	t	500000.00	300000.00	1	2026-02-17	2026-02-17 15:05:16.21	2026-02-17 15:05:16.21
\N
\N	6c27f05e-f721-4b0f-a04d-9157f4651ff0	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB049	1	Support Role	Bangalore	<p><span style="background-color: transparent; color: rgb(0, 0, 0);">A Support Engineer provides technical assistance to users by troubleshooting software, application, or system issues.</span><span class="ql-cursor">
﻿</span></p><p><br></p><p><br></p>
\N	Tehnial, Sq, database
\N
\N	0	f
\N	t	299999.00	1000.00	1	2026-03-03	2026-03-02 14:07:26.917	2026-03-11 13:10:21.594
\N
\N	c96a7999-e6ee-4078-a34e-1d8a75e1c059	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	PART_TIME	JOB076	3-6	DevOps Engineer	Mumbai	<p>djnsdkjcndskjnjsdknkjsdnjksdcs</p>
\N	tetst
\N
\N	0	f
\N	t	700000.00	400000.00	1	2026-03-03	2026-03-03 16:18:29.958	2026-03-03 16:20:09.804
\N
\N	2e53ad5f-bfee-4edb-ab67-2377f169e3e7	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB077	9	Data Analyst	Chennai	<p>test</p>
\N	python, sql
\N
\N	0	f
\N	t	26.00	2.00	1	2025-12-01	2025-12-01 14:56:47.319	2025-12-01 15:02:25.512
\N
\N	8c5809af-88ec-4274-92c4-019997274f6f	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB013	0-1	Network Engineer	Delhi	<p>Networking test description
﻿</p>
\N	Networking, Troubleshooting, IT, Admin, Testing, Windows, Linux
\N
\N	0	f
\N	t	800000.00	500000.00	1	2026-02-17	2026-02-17 16:31:02.616	2026-02-18 10:56:04.428
\N
\N	d4fab2b0-e22f-472b-86f2-babde77f04e7	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB050	2	Software Developer - Java	Chennai	<p><span style="background-color: transparent; color: rgb(0, 0, 0);">&nbsp;A
Software Developer designs and develops web or application features using programming languages and frameworks. Responsible for coding, debugging, API development, database integration, and supporting deployment activities in an Agile environment.</span></p>
\N	Java, Database, Mysql, spring boot
\N
\N	0	f
\N	t	900000.00	600000.00	1	2026-02-18	2026-02-18 18:03:27.904	2026-02-18 18:14:36.927
\N
\N	27a35cb8-0c13-4209-8121-3017dbd4240d	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	CONTRACT	JOB051	3	Data Analyst	Bangalore	<p><span style="background-color: transparent; color: rgb(0, 0, 0);">A Data Analyst analyzes large datasets to extract insights and build predictive models. Responsible for data cleaning, feature engineering, machine learning model development, and presenting business insights using visualization tools. Works closely with stakeholders to support data-driven decision making</span></p>
\N	database, python, sql, server
\N
\N	0	f
\N	t	3000000.00	2500000.00	1	2026-02-23	2026-02-23 16:51:01.985	2026-02-23 17:00:16.062
\N
\N	087684b9-3813-472a-877b-18b15f9c5b3f	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB055	8	Data Sciene- L3	Chennai	<p><span style="color: rgb(0, 0, 0); background-color: transparent;">A Data Science designs, builds, and maintains scalable data pipelines and ETL processes. Responsible for data integration, transformation, and storage in data warehouses or cloud platforms. Ensures high data quality, performance optimization, and reliable data flow for analytics teams.</span></p><p><br></p>
\N	Data, Managing
\N
\N	0	f
\N	t	800000.00	700000.00	1	2026-02-26	2026-02-26 12:36:36.333	2026-02-26 13:58:55.901
\N
\N	924c74ae-411e-4742-b853-0e3e6520bbba	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB064	5	Senior QA engineer	Chennai	<p><span style="color: rgb(0, 0, 0); background-color: transparent;">&nbsp;The
QA technical round evaluates a candidate
’s knowledge of software testing concepts, test case design, defect lifecycle, and testing methodologies. For developer</span></p>
\N	Manual, Automation, java
\N
\N	0	f
\N	t	29999.00	10000.00	1	2026-02-26	2026-02-26 15:18:15.4	2026-02-26 15:18:15.4
\N
\N	3ea4793b-5d56-4670-801d-aaf24df62dc2	660e8400-e29b-41d4-a716-446655440001	MEDIUM	OPEN	FULL_TIME	JOB071	5	Data Engineer	Delhi	<p>this is for testing</p>
\N	test
\N
\N	0	f
\.


--
-- Data for Name: keka_import_history; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.keka_import_history (id, created_at, created_by, is_deleted, updated_by, updated_at, version, tenant_id, created_count, duration, error_count, error_summary, file_name, mapping_config, skipped_count, status, total_rows, updated_count, uploaded_at, uploaded_by) FROM stdin;
\
.


--
-- Data for Name: key_results; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.key_results (confidence_level, current_value, due_date, is_deleted, is_milestone, milestone_order, progress_percentage, start_value, target_value, weight, created_at, updated_at, version, created_by, id, objective_id, owner_id, tenant_id, updated_by, measurement_type, status, measurement_unit, title, description, last_updated_notes) FROM stdin;
\
.


--
-- Data for Name: knowledge_attachments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.knowledge_attachments (is_deleted, created_at, file_size, updated_at, version, content_id, created_by, id, tenant_id, updated_by, uploaded_by, content_type, file_type, mime_type, file_name, storage_path, url) FROM stdin;
\
.


--
-- Data for Name: knowledge_searches; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.knowledge_searches (is_deleted, results_count, created_at, updated_at, version, created_by, id, searched_by, tenant_id, updated_by, query) FROM stdin;
\
.


--
-- Data for Name: knowledge_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.knowledge_templates (is_active, is_deleted, is_featured, usage_count, created_at, updated_at, version, created_by, id, tenant_id, updated_by, category, name, slug, thumbnail_url, tags, content, description, sample_data, template_variables) FROM stdin;
\
.


--
-- Data for Name: knowledge_views; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.knowledge_views (duration_seconds, is_deleted, created_at, updated_at, version, content_id, created_by, id, tenant_id, updated_by, user_id, ip_address, content_type, user_agent) FROM stdin;
\
.


--
-- Data for Name: leave_balances; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.leave_balances (accrued, available, carried_forward, encashed, is_deleted, lapsed, last_accrual_date, opening_balance, pending, used, year, created_at, updated_at, version, created_by, employee_id, id, leave_type_id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.leave_requests (end_date, is_deleted, is_half_day, start_date, total_days, applied_on, approved_on, cancelled_on, created_at, updated_at, version, approved_by, created_by, employee_id, id, leave_type_id, tenant_id, updated_by, half_day_period, request_number, status, cancellation_reason, comments, document_path, reason, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: leave_types; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.leave_types (accrual_rate, annual_quota, applicable_after_days, is_active, is_carry_forward_allowed, is_deleted, is_encashable, is_paid, max_carry_forward_days, max_consecutive_days, max_days_per_request, min_days_notice, requires_document, created_at, updated_at, version, created_by, id, tenant_id, updated_by, color_code, gender_specific, accrual_type, leave_code, leave_name, description) FROM stdin;
\
.


--
-- Data for Name: letter_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.letter_templates (include_company_logo, include_signature, is_active, is_deleted, is_system_template, requires_approval, template_version, created_at, updated_at, version, created_by, id, tenant_id, updated_by, available_placeholders, category, code, css_styles, description, footer_html, header_html, name, signatory_designation, signatory_name, signature_title, template_content) FROM stdin;
\
.


--
-- Data for Name: lms_certificates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_certificates (completion_date, expiry_date, is_active, is_deleted, score_achieved, created_at, issued_at, updated_at, version, course_id, created_by, employee_id, enrollment_id, id, issued_by, template_id, tenant_id, updated_by, certificate_number, employee_name, issuer_name, certificate_url, verification_url, additional_info, course_title) FROM stdin;
\
.


--
-- Data for Name: lms_content_progress; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_content_progress (current_page, is_deleted, progress_percentage, time_spent_seconds, total_pages, video_position_seconds, completed_at, created_at, started_at, updated_at, version, content_id, created_by, enrollment_id, id, module_id, tenant_id, updated_by, status) FROM stdin;
\
.


--
-- Data for Name: lms_course_enrollments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_course_enrollments (is_deleted, progress_percentage, quiz_attempts, quiz_passed, quiz_score, rating, total_time_spent_minutes, certificate_issued_at, completed_at, created_at, due_date, enrolled_at, last_accessed_at, started_at, updated_at, version, certificate_id, course_id, created_by, employee_id, enrolled_by, id, last_content_id, last_module_id, tenant_id, updated_by, status, feedback) FROM stdin;
\
.


--
-- Data for Name: lms_course_modules; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_course_modules (duration_minutes, is_deleted, is_mandatory, order_index, unlock_after_days, created_at, updated_at, version, course_id, created_by, id, tenant_id, updated_by, description, title) FROM stdin;
\
.


--
-- Data for Name: lms_courses; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_courses (avg_rating, completion_deadline, duration_hours, enrollment_deadline, is_certificate_enabled, is_deleted, is_mandatory, is_self_paced, max_attempts, passing_score, total_enrollments, total_ratings, created_at, updated_at, version, category_id, certificate_template_id, created_by, id, instructor_id, tenant_id, updated_by, difficulty_level, status, code, instructor_name, preview_video_url, short_description, tags, thumbnail_url, description, prerequisites, skills_covered, title) FROM stdin;
\
.


--
-- Data for Name: lms_learning_path_courses; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_learning_path_courses (is_required, order_index, created_at, course_id, id, path_id, tenant_id) FROM stdin;
\
.


--
-- Data for Name: lms_learning_paths; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_learning_paths (estimated_hours, is_deleted, is_mandatory, is_published, total_courses, created_at, updated_at, version, created_by, id, prerequisite_path_id, tenant_id, updated_by, difficulty_level, thumbnail_url, description, target_roles, title) FROM stdin;
\
.


--
-- Data for Name: lms_module_contents; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_module_contents (completion_required, duration_minutes, is_deleted, is_mandatory, order_index, created_at, updated_at, version, created_by, id, module_id, quiz_id, tenant_id, updated_by, document_type, content_type, video_provider, document_url, external_url, scorm_package_url, video_url, assignment_instructions, text_content, title) FROM stdin;
\
.


--
-- Data for Name: lms_quiz_attempts; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_quiz_attempts (attempt_number, is_deleted, max_score, passed, passing_score, score, time_taken_seconds, completed_at, created_at, started_at, updated_at, version, attempted_by, created_by, employee_id, enrollment_id, id, quiz_id, tenant_id, updated_by, status, answers, feedback) FROM stdin;
\
.


--
-- Data for Name: lms_quiz_questions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_quiz_questions (correct_answer, is_deleted, is_mandatory, order_index, points, created_at, updated_at, version, created_by, id, quiz_id, tenant_id, updated_by, question_type, question_image_url, correct_answers, explanation, keywords, options, question_text) FROM stdin;
\
.


--
-- Data for Name: lms_quizzes; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.lms_quizzes (is_active, is_deleted, max_attempts, passing_score, questions_per_attempt, show_correct_answers, show_score_immediately, shuffle_options, shuffle_questions, time_limit_minutes, created_at, updated_at, version, course_id, created_by, id, module_id, tenant_id, updated_by, instructions, title) FROM stdin;
\
.


--
-- Data for Name: loan_repayments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.loan_repayments (due_date, installment_number, interest_amount, is_deleted, is_prepayment, late_fee, outstanding_after_payment, paid_amount, payment_date, principal_amount, total_amount, created_at, updated_at, version, created_by, employee_id, id, loan_id, payroll_run_id, tenant_id, updated_by, payment_mode, payment_reference, remarks, status) FROM stdin;
\
.


--
-- Data for Name: meeting_action_items; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.meeting_action_items (due_date, is_carried_over, is_deleted, reminder_sent, completed_at, created_at, updated_at, version, assignee_id, carried_from_meeting_id, created_by, id, meeting_id, tenant_id, updated_by, assignee_role, priority, status, title, completion_notes, description) FROM stdin;
\
.


--
-- Data for Name: meeting_agenda_items; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.meeting_agenda_items (duration_minutes, is_deleted, is_discussed, item_order, created_at, updated_at, version, added_by_id, created_by, id, meeting_id, tenant_id, updated_by, added_by, priority, category, title, description, discussion_notes) FROM stdin;
\
.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.milestones (is_celebrated, is_deleted, milestone_date, notification_sent, wishes_count, years_completed, celebrated_at, created_at, notification_sent_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by, description, title, type) FROM stdin;
\
.


--
-- Data for Name: monthly_statutory_contributions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.monthly_statutory_contributions (eps_contribution, esi_employee_contribution, esi_employer_contribution, esi_wage, gross_salary, month, pf_employee_contribution, pf_employer_contribution, pf_wage, professional_tax, tds_deducted, vpf_contribution, year, created_at, updated_at, employee_id, id, payslip_id, tenant_id) FROM stdin;
\
.


--
-- Data for Name: multi_channel_notifications; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.multi_channel_notifications (is_deleted, is_group_summary, retry_count, created_at, delivered_at, last_retry_at, read_at, scheduled_at, sent_at, updated_at, version, created_by, id, recipient_id, reference_id, template_id, tenant_id, updated_by, subject, action_url, body, channel, context_data, error_message, external_id, group_key, icon, priority, recipient_email, recipient_name, recipient_phone, reference_type, status, template_code, title) FROM stdin;
\
.


--
-- Data for Name: notification_channel_configs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.notification_channel_configs (exponential_backoff, is_deleted, is_enabled, max_retries, rate_limit_per_day, rate_limit_per_hour, rate_limit_per_minute, retry_delay_seconds, created_at, updated_at, version, created_by, id, tenant_id, updated_by, channel, config_json, email_from_address, email_from_name, email_reply_to, provider, push_sender_id, push_server_key, slack_bot_token, slack_default_channel, slack_workspace_id, sms_from_number, teams_tenant_id, teams_webhook_url, webhook_headers, webhook_secret, webhook_url, whatsapp_business_id, whatsapp_phone_number_id) FROM stdin;
\
.


--
-- Data for Name: notification_template_channels; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.notification_template_channels (template_id, channel) FROM stdin;
\
.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.notification_templates (email_html, is_active, is_deleted, is_system_template, created_at, updated_at, version, created_by, id, tenant_id, updated_by, in_app_title, push_title, email_subject, push_body, sms_body, in_app_body, category, code, default_priority, description, email_body, event_type, in_app_action_url, in_app_icon, name, push_action, push_icon, slack_message, teams_message, webhook_payload, whatsapp_body, whatsapp_template_id) FROM stdin;
\
.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.notifications (is_deleted, is_read, created_at, read_at, updated_at, version, created_by, id, related_entity_id, tenant_id, updated_by, user_id, priority, type, related_entity_type, title, action_url, message, metadata) FROM stdin;
\
.


--
-- Data for Name: nu_applications; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.nu_applications (display_order, is_deleted, is_system_app, created_at, updated_at, version, created_by, id, updated_by, app_version, code, status, api_base_path, name, base_url, icon_url, description) FROM stdin;
0	f	f	2026-03-12 18:03:16.124942	2026-03-12 18:03:16.124942	0
\N	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N
\N	HRMS	ACTIVE	/api/v1	NU-HRMS	http://localhost:3000
\N	Human Resource Management System - Complete HR operations platform
2	f	t	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	550e8400-e29b-41d4-a716-446655440011
\N	1.0.0	HIRE	ACTIVE	/api/v1	NU-Hire	http://localhost:3000	/assets/icons/hire.svg	Recruitment & Onboarding Platform
3	f	t	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	550e8400-e29b-41d4-a716-446655440012
\N	1.0.0	GROW	ACTIVE	/api/v1	NU-Grow	http://localhost:3000	/assets/icons/grow.svg	Performance, Learning & Engagement
4	f	t	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	550e8400-e29b-41d4-a716-446655440013
\N	1.0.0	FLUENCE	ACTIVE	/api/v1	NU-Fluence	http://localhost:3000	/assets/icons/fluence.svg	Knowledge Management & Collaboration
\.


--
-- Data for Name: objectives; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.objectives (end_date, is_deleted, is_stretch_goal, last_check_in_date, progress_percentage, start_date, weight, created_at, updated_at, version, aligned_to_company_objective, approved_by, created_by, cycle_id, department_id, id, owner_id, parent_objective_id, team_id, tenant_id, updated_by, check_in_frequency, visibility, objective_level, status, title, description) FROM stdin;
\
.


--
-- Data for Name: office_locations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.office_locations (allow_remote_checkin, geofence_radius_meters, is_active, is_deleted, is_geofence_enabled, is_headquarters, latitude, longitude, created_at, updated_at, version, created_by, id, tenant_id, updated_by, zip_code, location_code, timezone, working_days, city, country, location_name, state, address) FROM stdin;
\
.


--
-- Data for Name: okr_check_ins; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.okr_check_ins (confidence_level, is_deleted, new_progress, new_value, previous_progress, previous_value, check_in_date, created_at, updated_at, version, created_by, employee_id, id, key_result_id, objective_id, tenant_id, updated_by, check_in_type, blockers, next_steps, notes) FROM stdin;
\
.


--
-- Data for Name: onboarding_checklist_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.onboarding_checklist_templates (estimated_days, is_active, is_default, is_deleted, created_at, updated_at, version, created_by, department_id, id, tenant_id, updated_by, applicable_for, description, job_level, name) FROM stdin;
\
.


--
-- Data for Name: onboarding_documents; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.onboarding_documents (expiry_date, is_deleted, is_mandatory, uploaded_date, verified_date, created_at, file_size, updated_at, version, created_by, employee_id, id, process_id, tenant_id, updated_by, verified_by, document_name, document_type, file_name, file_path, mime_type, rejection_reason, remarks, status) FROM stdin;
\
.


--
-- Data for Name: onboarding_processes; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.onboarding_processes (actual_completion_date, completion_percentage, expected_completion_date, start_date, created_at, updated_at, version, assigned_buddy_id, employee_id, id, tenant_id, process_type, status, notes) FROM stdin;
\
.


--
-- Data for Name: onboarding_tasks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.onboarding_tasks (completed_date, due_date, is_deleted, is_mandatory, order_sequence, created_at, updated_at, version, assigned_to, completed_by, created_by, dependent_on_task_id, employee_id, id, process_id, tenant_id, updated_by, category, description, priority, remarks, status, task_name) FROM stdin;
\
.


--
-- Data for Name: onboarding_template_tasks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.onboarding_template_tasks (estimated_days_from_start, is_deleted, is_mandatory, order_sequence, created_at, updated_at, version, created_by, id, template_id, tenant_id, updated_by, category, description, priority, task_name) FROM stdin;
\
.


--
-- Data for Name: one_on_one_meetings; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.one_on_one_meetings (duration_minutes, employee_rating, end_time, is_deleted, is_recurring, meeting_date, recurrence_end_date, reminder_minutes_before, reminder_sent, start_time, actual_end_time, actual_start_time, cancelled_at, created_at, updated_at, version, cancelled_by, created_by, employee_id, id, manager_id, parent_meeting_id, rescheduled_from, tenant_id, updated_by, recurrence_pattern, status, meeting_type, location, title, cancellation_reason, meeting_link, description, employee_feedback, employee_notes, manager_notes, meeting_summary, shared_notes) FROM stdin;
\
.


--
-- Data for Name: organization_units; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.organization_units (employee_count, is_active, is_deleted, level, sort_order, created_at, updated_at, version, created_by, head_id, id, parent_id, tenant_id, updated_by, code, cost_center, description, location, name, path, type) FROM stdin;
\
.


--
-- Data for Name: overtime_policies; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.overtime_policies (auto_approve_limit_hours, comp_time_allowed, comp_time_expiry_days, comp_time_multiplier, consecutive_day_multiplier, consecutive_day_threshold, count_break_time, daily_max_ot_hours, daily_ot_multiplier, daily_threshold_hours, double_time_multiplier, double_time_threshold_hours, holiday_ot_multiplier, is_active, is_default, max_comp_time_balance, minimum_ot_minutes, night_shift_ot_multiplier, requires_pre_approval, round_to_nearest_minutes, weekend_ot_multiplier, weekly_max_ot_hours, weekly_ot_multiplier, weekly_threshold_hours, created_at, updated_at, version, created_by, department_id, id, tenant_id, updated_by, policy_code, policy_name, description) FROM stdin;
\
.


--
-- Data for Name: overtime_rate_tiers; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.overtime_rate_tiers (hours_threshold, multiplier, tier_order, id, policy_id, tier_name, tier_type) FROM stdin;
\
.


--
-- Data for Name: overtime_records; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.overtime_records (actual_hours, auto_calculated, effective_hours, is_pre_approved, multiplier, overtime_date, overtime_hours, processed_in_payroll, regular_hours, approved_at, created_at, processed_at, rejected_at, updated_at, version, approved_by, attendance_record_id, created_by, employee_id, id, payroll_run_id, rejected_by, shift_id, tenant_id, updated_by, overtime_type, status, notes, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: overtime_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.overtime_requests (actual_end_time, actual_hours, actual_start_time, approved_amount, base_hourly_rate, calculated_amount, comp_time_hours, is_deleted, is_holiday, is_night_shift, is_weekend, overtime_date, overtime_multiplier, payment_date, planned_end_time, planned_hours, planned_start_time, processed_in_payroll, take_as_comp_time, approved_at, created_at, rejected_at, updated_at, version, approved_by, created_by, employee_id, id, payroll_run_id, policy_id, project_id, rejected_by, tenant_id, updated_by, approval_comments, holiday_name, project_code, reason, rejection_reason, request_number, request_type, status, task_description) FROM stdin;
\
.


--
-- Data for Name: payment_batches; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payment_batches (failed_count, is_deleted, success_count, total_amount, transaction_count, completed_at, created_at, updated_at, version, completed_by, created_by, id, initiated_by, payroll_run_id, tenant_id, updated_by, status, type, batch_ref, metadata) FROM stdin;
\
.


--
-- Data for Name: payment_configs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payment_configs (is_active, is_deleted, created_at, updated_at, version, created_by, id, tenant_id, updated_by, provider, api_key_encrypted, config_key, merchant_id, metadata, webhook_secret) FROM stdin;
\
.


--
-- Data for Name: payment_refunds; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payment_refunds (amount, is_deleted, completed_at, created_at, updated_at, version, created_by, id, initiated_by, tenant_id, transaction_id, updated_by, status, refund_ref, external_refund_id, metadata, reason) FROM stdin;
\
.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payment_transactions (amount, currency, is_deleted, completed_at, created_at, initiated_at, refunded_at, updated_at, version, recipient_ifsc, created_by, employee_id, expense_claim_id, id, loan_id, payroll_run_id, tenant_id, updated_by, provider, status, type, transaction_ref, external_ref, failed_reason, metadata, recipient_account_number, recipient_name) FROM stdin;
\
.


--
-- Data for Name: payment_webhooks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payment_webhooks (processed, created_at, processed_at, updated_at, id, tenant_id, provider, status, event_type, error_message, external_event_id, payload) FROM stdin;
\
.


--
-- Data for Name: payroll_locations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payroll_locations (base_income_tax_rate, country_code, income_tax_applicable, is_active, is_deleted, local_currency, max_working_hours_week, min_wage, overtime_multiplier, pay_day, social_security_applicable, social_security_employee_rate, social_security_employer_rate, statutory_bonus_applicable, created_at, updated_at, version, created_by, id, tenant_id, updated_by, compliance_notes, country_name, location_code, location_name, min_wage_unit, pay_frequency, region, timezone) FROM stdin;
\
.


--
-- Data for Name: payroll_runs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payroll_runs (is_deleted, pay_period_month, pay_period_year, payroll_date, total_employees, approved_at, created_at, processed_at, updated_at, version, approved_by, created_by, id, processed_by, tenant_id, updated_by, status, remarks) FROM stdin;
\
.


--
-- Data for Name: payslips; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.payslips (basic_salary, conveyance_allowance, employee_esi, employee_pf, employer_esi, employer_pf, gross_salary, hra, income_tax, is_deleted, leave_days, medical_allowance, net_salary, other_allowances, other_deductions, pay_date, pay_period_month, pay_period_year, present_days, professional_tax, provident_fund, special_allowance, tds_monthly, total_deductions, working_days, created_at, statutory_calculated_at, updated_at, version, created_by, employee_id, id, payroll_run_id, pdf_file_id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: peer_recognitions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.peer_recognitions (is_public, created_at, badge_id, giver_id, id, receiver_id, tenant_id, message) FROM stdin;
\
.


--
-- Data for Name: performance_improvement_plans; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.performance_improvement_plans (end_date, is_deleted, start_date, created_at, updated_at, version, created_by, employee_id, id, manager_id, tenant_id, updated_by, check_in_frequency, status, close_notes, goals, reason) FROM stdin;
\
.


--
-- Data for Name: performance_reviews; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.performance_reviews (final_rating, goal_achievement_percent, increment_recommendation, is_deleted, manager_rating, overall_rating, promotion_recommended, review_period_end, review_period_start, self_rating, completed_at, created_at, submitted_at, updated_at, version, created_by, employee_id, id, review_cycle_id, reviewer_id, tenant_id, updated_by, review_type, status, achievements, areas_for_improvement, employee_comments, goals_for_next_period, manager_comments, overall_comments, strengths) FROM stdin;
\
.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.permissions (is_deleted, created_at, updated_at, version, created_by, id, updated_by, action, resource, code, name, description) FROM stdin;
f
2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000001
\N	read	employee	employee.read	View Employees	View employee profiles
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000002
\N	create
employee	employee.create	Create Employees	Add new employees
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000003
\N
update employee employee.update
Update Employees Modify employee info
  f 2026-03-13 04:06:31.882179 2026-03-13 04:06:31.882179 0 \N 660e8401-0001-0001-0001-000000000004 \N
delete
employee	employee.delete	Delete Employees	Remove employees
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000011
\N	read	department	department.read	View Departments	View departments
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000012
\N	create
department	department.create	Create Departments	Create departments
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000013
\N
update department department.update
Update Departments Modify departments
  f 2026-03-13 04:06:31.882179 2026-03-13 04:06:31.882179 0 \N 660e8401-0001-0001-0001-000000000014 \N
delete
department	department.delete	Delete Departments	Remove departments
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000021
\N	read	attendance	attendance.read	View Attendance	View attendance
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000022
\N	manage	attendance	attendance.manage	Manage Attendance	Manage attendance
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000031
\N	read	leave	leave.read	View Leave	View leave info
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000032
\N	request	leave	leave.request	Request Leave	Apply for leave
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000033
\N	approve	leave	leave.approve	Approve Leave	Approve leave
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000034
\N	manage	leave	leave.manage	Manage Leave	Full leave management
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000041
\N	read	payroll	payroll.read	View Payroll	View payroll
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000042
\N	manage	payroll	payroll.manage	Manage Payroll	Manage payroll
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000051
\N	read	performance	performance.read	View Performance	View performance
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000052
\N	manage	performance	performance.manage	Manage Performance	Manage performance
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000061
\N	read	recruitment	recruitment.read	View Recruitment	View recruitment
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000062
\N	manage	recruitment	recruitment.manage	Manage Recruitment	Manage recruitment
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000071
\N	view	report	report.view	View Reports	View reports
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000072
\N	manage	report	report.manage	Manage Reports	Manage reports
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000081
\N	read	settings	settings.read	View Settings	View settings
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000082
\N	manage	settings	settings.manage	Manage Settings	Manage settings
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000091
\N	read	role	role.read	View Roles	View roles
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000092
\N	manage	role	role.manage	Manage Roles	Manage roles
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000093
\N	read	user	user.read	View Users	View users
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000094
\N	manage	user	user.manage	Manage Users	Manage users
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000101
\N	view	project	project.view	View Projects	View projects
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000102
\N	manage	project	project.manage	Manage Projects	Manage projects
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000111
\N	read	announcement	announcement.read	View Announcements	View announcements
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000112
\N	manage	announcement	announcement.manage	Manage Announcements	Manage announcements
f	2026-03-13 04:06:31.882179	2026-03-13 04:06:31.882179	0
\N	660e8401-0001-0001-0001-000000000999
\N	admin	system	system.admin	System Admin	Full system admin
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000201
\N	wiki.read	knowledge	knowledge.wiki.read	View Wiki	View wiki pages
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000202
\N	wiki.manage	knowledge	knowledge.wiki.manage	Manage Wiki	Create
/edit wiki pages
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000203
\N	blog.read	knowledge	knowledge.blog.read	View Blogs	View blog posts
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000204
\N	blog.manage	knowledge	knowledge.blog.manage	Manage Blogs	Create
/edit blog posts
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000205
\N	template.manage	knowledge	knowledge.template.manage	Manage Templates	Manage doc templates
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000301
\N	read	contract	contract.read	View Contracts	View contracts
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000302
\N	manage	contract	contract.manage	Manage Contracts	Create
/edit contracts
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000401
\N	view	payment	payment.view	View Payments	View payments
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000402
\N	initiate	payment	payment.initiate	Initiate Payments	Initiate payments
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000403
\N	refund	payment	payment.refund	Process Refunds	Process payment refunds
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	660e8401-0001-0001-0001-000000000404
\N	config	payment	payment.config	Manage Payment Config	Manage payment settings
\.


--
-- Data for Name: pip_check_ins; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.pip_check_ins (check_in_date, is_deleted, created_at, updated_at, version, created_by, id, pip_id, tenant_id, updated_by, goal_updates, manager_comments, progress_notes) FROM stdin;
\
.


--
-- Data for Name: policy_acknowledgments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.policy_acknowledgments (is_deleted, policy_version, acknowledged_at, created_at, updated_at, version, created_by, employee_id, id, policy_id, tenant_id, updated_by, digital_signature, ip_address, user_agent) FROM stdin;
\
.


--
-- Data for Name: poll_options; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.poll_options (display_order, id, post_id, tenant_id, option_text) FROM stdin;
0	ff6bbc9f-b4b6-4a2a-b8cb-f2441e4defa1	f35d07e4-5703-40c8-ad90-4759ce846d2a	660e8400-e29b-41d4-a716-446655440001	React
1	c578b8d0-2832-4d30-90ee-080b1edac632	f35d07e4-5703-40c8-ad90-4759ce846d2a	660e8400-e29b-41d4-a716-446655440001	Vue
2	7e8331e6-9314-423f-99ae-8b13c539cfb0	f35d07e4-5703-40c8-ad90-4759ce846d2a	660e8400-e29b-41d4-a716-446655440001	Angular
\.


--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.poll_votes (created_at, employee_id, id, poll_option_id, tenant_id) FROM stdin;
2026-03-16 04:30:40.04618	550e8400-e29b-41d4-a716-446655440040	be806022-1b48-462c-a9b9-089076d6672e	ff6bbc9f-b4b6-4a2a-b8cb-f2441e4defa1	660e8400-e29b-41d4-a716-446655440001
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.positions (filled_count, headcount, is_active, is_critical, is_deleted, created_at, updated_at, version, created_by, department_id, id, reports_to_position_id, tenant_id, updated_by, code, description, grade_max, grade_min, job_family, level, location, required_skills, responsibilities, title) FROM stdin;
\
.


--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.post_comments (is_deleted, likes_count, created_at, updated_at, author_id, created_by, id, parent_comment_id, post_id, tenant_id, updated_by, content) FROM stdin;
f
0	2026-03-16 02:06:29.26252	2026-03-16 02:06:29.26252	550e8400-e29b-41d4-a716-446655440040	550e8400-e29b-41d4-a716-446655440030	10265437-a4ae-452d-824d-8666af4fedcb
\N	0658d311-0e14-4185-b4cb-b7653a2802c8	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	hello
f	0	2026-03-16 02:14:21.485287	2026-03-16 02:14:21.485287	550e8400-e29b-41d4-a716-446655440040	550e8400-e29b-41d4-a716-446655440030	15f9d28e-eeab-43f2-9671-b80cf6839871	10265437-a4ae-452d-824d-8666af4fedcb	0658d311-0e14-4185-b4cb-b7653a2802c8	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	hello hiii
f	0	2026-03-16 02:52:24.541609	2026-03-16 02:52:24.541609	550e8400-e29b-41d4-a716-446655440040	550e8400-e29b-41d4-a716-446655440030	39405f14-3f4c-44ee-a89d-967263a4b29e
\N	17439cda-bd18-4210-a6f8-d5c7b736148f	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	1
f	0	2026-03-16 02:52:32.116232	2026-03-16 02:52:32.116232	550e8400-e29b-41d4-a716-446655440040	550e8400-e29b-41d4-a716-446655440030	bf681208-01ee-44af-81d6-d1d8e7d61a20
\N	17439cda-bd18-4210-a6f8-d5c7b736148f	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	2
\.


--
-- Data for Name: post_reactions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.post_reactions (created_at, comment_id, employee_id, id, post_id, tenant_id, reaction_type) FROM stdin;
2026-03-16 02:06:20.569188
\N	550e8400-e29b-41d4-a716-446655440040	79747dec-847c-48fb-92c4-ccc979df546a	0658d311-0e14-4185-b4cb-b7653a2802c8	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-16 02:39:17.960762
\N	550e8400-e29b-41d4-a716-446655440040	2de73ed2-4956-498c-aae4-9cc885639f9f	82a564b1-8dbb-48a3-ac8d-b49774bc4a3b	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 21:59:22.446914
\N	f9d2dc7c-47d3-4fbd-a3ff-e8eb71e5924f	c5f8911a-490e-4dc1-ad11-e67068c1a68b	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 21:49:22.446914
\N	a9576636-0b2c-42e2-800c-246d3b778d7d	4ecf657d-a2bc-455c-b2c1-b02924719073	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 21:39:22.446914
\N	a8d4e4b9-9adb-486c-82ac-f479b8a1da3b	294141ec-ef6b-44ec-bc21-0fdec11d2cd2	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 21:29:22.446914
\N	2f555af8-eee6-49c7-814f-0cd8c0730eb1	3b2f8445-cb4c-44cb-8ec5-0cd040f4d211	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 21:19:22.446914
\N	2807ffee-a7a0-47f2-a538-fe5d89fee3ab	0ab5ee57-2620-43fe-83fd-22c2d57f9ab7	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 21:09:22.446914
\N	d62afd03-3b01-4f1b-a7e3-2c29d06666ac	b2ffa56e-9818-41b5-a3d8-d0eb2fdbabee	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 20:59:22.446914
\N	e6618f04-3cd5-4589-b815-1c760770e18c	da0fb261-579f-468f-b9df-519a002d404a	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-15 20:49:22.446914
\N	8ff4eea5-0744-4adc-8901-cf82f87766cf	044180aa-255a-4082-9a60-0ef7d5a8ec68	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-16 04:01:54.177828
\N	550e8400-e29b-41d4-a716-446655440040	00116bc0-4475-4120-aff7-f7c8829c1a1c	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	LIKE
2026-03-17 22:55:53.518309
\N	550e8400-e29b-41d4-a716-446655440040	d527e313-5cad-45f6-9bb0-8a83907b05aa	a1864f65-8f9e-4417-b232-8551b482f247	660e8400-e29b-41d4-a716-446655440001	LIKE
\.


--
-- Data for Name: preboarding_candidates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.preboarding_candidates (address_proof_uploaded, completion_percentage, date_of_birth, education_docs_uploaded, expected_joining_date, id_proof_uploaded, offer_letter_signed, photo_uploaded, created_at, token_expires_at, updated_at, version, department_id, employee_id, id, reporting_manager_id, tenant_id, emergency_contact_number, phone_number, postal_code, status, bank_ifsc_code, tax_id, bank_account_number, bank_name, city, country, designation, emergency_contact_name, first_name, last_name, state, email, access_token, address) FROM stdin;
\
.


--
-- Data for Name: probation_evaluations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.probation_evaluations (acknowledged_date, attendance_rating, communication_rating, employee_acknowledged, evaluation_date, is_deleted, is_final_evaluation, overall_rating, performance_rating, teamwork_rating, technical_skills_rating, created_at, updated_at, version, created_by, evaluator_id, id, probation_period_id, tenant_id, updated_by, recommendation_reason, areas_for_improvement, employee_comments, goals_for_next_period, manager_comments, strengths, evaluation_type, recommendation) FROM stdin;
\
.


--
-- Data for Name: probation_periods; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.probation_periods (confirmation_date, duration_months, end_date, evaluation_frequency_days, extension_count, final_rating, is_deleted, next_evaluation_date, original_end_date, start_date, termination_date, total_extension_days, created_at, updated_at, version, confirmation_letter_id, created_by, employee_id, hr_id, id, manager_id, tenant_id, updated_by, termination_reason, notes, status) FROM stdin;
\
.


--
-- Data for Name: professional_tax_slabs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.professional_tax_slabs (deduction_month, effective_from, effective_to, is_active, max_salary, min_salary, tax_amount, state_code, created_at, updated_at, created_by, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: profile_update_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.profile_update_requests (auto_approved, is_deleted, created_at, reviewed_at, updated_at, version, created_by, employee_id, id, reviewed_by, tenant_id, updated_by, category, current_value, field_name, reason, rejection_reason, requested_value, review_comments, status, supporting_document_url) FROM stdin;
\
.


--
-- Data for Name: project_employees; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.project_employees (allocation_percentage, end_date, is_active, is_deleted, start_date, created_at, updated_at, version, created_by, employee_id, id, project_id, tenant_id, updated_by, role) FROM stdin;
\
.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.project_members (allocation_percentage, billing_rate, can_approve_time, cost_rate, end_date, is_active, start_date, created_at, updated_at, employee_id, id, project_id, tenant_id, role, notes) FROM stdin;
\
.


--
-- Data for Name: project_time_entries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.project_time_entries (billed_amount, billing_rate, hours_worked, is_billable, work_date, approved_at, created_at, submitted_at, updated_at, approved_by, employee_id, id, project_id, tenant_id, entry_type, status, task_name, description, rejected_reason) FROM stdin;
\
.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.projects (budget, currency, end_date, expected_end_date, is_deleted, start_date, created_at, updated_at, version, created_by, id, project_manager_id, tenant_id, updated_by, priority, status, project_code, client_name, name, description) FROM stdin;
\N
USD
\N	2026-03-27	f	2026-03-01	2026-03-16 08:37:37.682472	2026-03-16 08:37:37.682472	0	550e8400-e29b-41d4-a716-446655440030	b7b5ea53-1f33-4c22-9b60-9d22c4c33b91	550e8400-e29b-41d4-a716-446655440040	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	HIGH	IN_PROGRESS	TEST001	Test-client	Test-project	Detail Test
\.


--
-- Data for Name: provident_fund_configs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.provident_fund_configs (effective_from, effective_to, employee_contribution_percentage, employer_contribution_percentage, eps_contribution_percentage, is_active, is_vpf_allowed, max_vpf_percentage, wage_ceiling, created_at, updated_at, created_by, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: psa_invoices; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.psa_invoices (billable_amount, billing_period_end, billing_period_start, due_date, invoice_date, tax_amount, total_amount, total_hours, created_at, paid_at, updated_at, client_id, created_by, id, project_id, tenant_id, updated_by, status, invoice_number, notes) FROM stdin;
\
.


--
-- Data for Name: psa_project_allocations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.psa_project_allocations (allocation_percentage, billing_rate, end_date, is_active, start_date, created_at, updated_at, created_by, employee_id, id, project_id, tenant_id, updated_by, role_name) FROM stdin;
\
.


--
-- Data for Name: psa_projects; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.psa_projects (billing_rate, budget, end_date, is_billable, start_date, created_at, updated_at, client_id, created_by, id, project_manager_id, tenant_id, updated_by, billing_type, status, project_code, project_name, description) FROM stdin;
\
.


--
-- Data for Name: psa_time_entries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.psa_time_entries (entry_date, hours, is_billable, is_overtime, created_at, updated_at, employee_id, id, project_id, task_id, tenant_id, timesheet_id, activity_type, work_description) FROM stdin;
\
.


--
-- Data for Name: psa_timesheets; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.psa_timesheets (billable_hours, non_billable_hours, total_hours, week_end_date, week_start_date, approved_at, created_at, submitted_at, updated_at, approved_by, employee_id, id, tenant_id, status, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: pulse_survey_answers; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.pulse_survey_answers (boolean_value, is_deleted, is_skipped, numeric_value, created_at, updated_at, version, created_by, id, question_id, response_id, survey_id, tenant_id, updated_by, selected_options, text_value) FROM stdin;
\
.


--
-- Data for Name: pulse_survey_questions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.pulse_survey_questions (is_active, is_deleted, is_required, max_value, min_value, question_order, created_at, updated_at, version, created_by, id, survey_id, tenant_id, updated_by, category, question_type, max_label, min_label, help_text, options, question_text) FROM stdin;
\
.


--
-- Data for Name: pulse_survey_responses; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.pulse_survey_responses (is_deleted, overall_score, time_spent_seconds, created_at, started_at, submitted_at, updated_at, version, created_by, employee_id, id, survey_id, tenant_id, updated_by, status, device_type, ip_address, browser) FROM stdin;
\
.


--
-- Data for Name: pulse_surveys; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.pulse_surveys (average_score, end_date, is_anonymous, is_deleted, is_mandatory, next_occurrence_date, reminder_days_before, reminder_enabled, start_date, total_invited, total_questions, total_responses, closed_at, created_at, published_at, updated_at, version, closed_by, created_by, id, published_by, tenant_id, updated_by, frequency, status, survey_type, title, description, target_departments, target_locations) FROM stdin;
\
.


--
-- Data for Name: recognition_badges; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.recognition_badges (is_active, is_deleted, is_system_badge, points_value, sort_order, created_at, updated_at, version, created_by, id, tenant_id, updated_by, icon_url, badge_name, category, code, color, description, level) FROM stdin;
\
.


--
-- Data for Name: recognition_reactions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.recognition_reactions (is_deleted, created_at, reacted_at, updated_at, version, created_by, employee_id, id, recognition_id, tenant_id, updated_by, reaction_type) FROM stdin;
\
.


--
-- Data for Name: recognitions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.recognitions (comments_count, is_anonymous, is_approved, is_deleted, is_public, likes_count, points_awarded, approved_at, created_at, recognized_at, updated_at, version, approved_by, badge_id, created_by, giver_id, id, receiver_id, tenant_id, updated_by, category, message, title, type, wall_post_id) FROM stdin;
\
.


--
-- Data for Name: referral_policies; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.referral_policies (base_bonus_amount, effective_from, effective_to, is_active, is_deleted, joining_bonus_percentage, max_referrals_per_month, min_service_months, probation_eligible, retention_bonus_percentage, retention_period_months, same_department_allowed, self_referral_allowed, created_at, updated_at, version, created_by, department_id, id, tenant_id, updated_by, applicable_for, description, job_level, name) FROM stdin;
\
.


--
-- Data for Name: report_definitions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.report_definitions (is_active, is_system_report, created_at, updated_at, created_by, id, tenant_id, updated_by, output_format, access_level, category, report_code, report_name, description, parameters, query_template) FROM stdin;
\
.


--
-- Data for Name: report_executions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.report_executions (row_count, completed_at, execution_time_ms, file_size, started_at, executed_by, id, report_definition_id, scheduled_report_id, tenant_id, execution_type, status, error_message, file_path, parameters) FROM stdin;
\
.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.report_templates (is_deleted, sort_direction, created_at, updated_at, created_by, id, tenant_id, module, sort_by, name, description, filters, selected_columns) FROM stdin;
\
.


--
-- Data for Name: resource_conflict_log; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.resource_conflict_log (id, tenant_id, employee_id, project_id_a, project_id_b, overlap_start_date, overlap_end_date, total_allocation_pct, detected_at, resolved_at, resolved_by, status) FROM stdin;
\
.


--
-- Data for Name: resume_parsing_results; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.resume_parsing_results (confidence_score, total_experience_years, created_at, candidate_id, created_by, id, job_application_id, tenant_id, phone, parsing_model, email, full_name, file_path, certifications, education, parsed_data, skills, work_experience) FROM stdin;
\
.


--
-- Data for Name: review_competencies; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.review_competencies (is_deleted, rating, created_at, updated_at, version, created_by, id, review_id, tenant_id, updated_by, category, competency_name, comments) FROM stdin;
\
.


--
-- Data for Name: review_cycles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.review_cycles (end_date, is_deleted, manager_review_deadline, self_review_deadline, start_date, created_at, updated_at, version, created_by, id, tenant_id, updated_by, cycle_type, status, cycle_name, description) FROM stdin;
\
.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.role_permissions (is_deleted, created_at, updated_at, version, created_by, id, permission_id, role_id, tenant_id, updated_by, scope) FROM stdin;
f
2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	aa5ea790-4c93-4cf3-bd31-8c696a362c2b	660e8401-0001-0001-0001-000000000001	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	ecc29a47-3199-427b-880f-871010989b1f	660e8401-0001-0001-0001-000000000002	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	29a030e4-2547-4101-891f-9cb23f0c556c	660e8401-0001-0001-0001-000000000003	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	be1c3ae1-1774-4e97-a8ba-bc1f1dd1a574	660e8401-0001-0001-0001-000000000004	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	d360bf0a-3bbf-46ee-9e0f-b6c3c7cda824	660e8401-0001-0001-0001-000000000011	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	555dd4c5-0795-4985-81c8-aa48ccbec272	660e8401-0001-0001-0001-000000000012	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	a13d4949-da50-472f-af72-0eb47e82fafc	660e8401-0001-0001-0001-000000000013	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	7a1d374b-31e9-493f-b19d-adb8692c741b	660e8401-0001-0001-0001-000000000014	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	a4895937-59ed-4946-8e67-f731e41202ff	660e8401-0001-0001-0001-000000000021	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	a2666005-75ac-47c0-9a1f-2ef65999eb8d	660e8401-0001-0001-0001-000000000022	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	fe4db63e-bd2e-41b6-9b5b-ad7c701a1efc	660e8401-0001-0001-0001-000000000031	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	122b52bc-91c6-476d-87a5-c8cd553fea33	660e8401-0001-0001-0001-000000000032	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	f080cfad-d056-4a80-93df-68d4d5a1ffbb	660e8401-0001-0001-0001-000000000033	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	958e4d4d-0720-4aa2-be1d-deef5f06aa75	660e8401-0001-0001-0001-000000000034	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	02dd9f77-3c9f-4e15-94f9-af50cd9ca324	660e8401-0001-0001-0001-000000000041	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	54e8bf86-e3fd-428f-826c-a976f5c82ac8	660e8401-0001-0001-0001-000000000042	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	2d1cf4b6-7d3a-4e99-9ecd-ead0b2c80a2c	660e8401-0001-0001-0001-000000000051	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	5c2f9040-a7c9-4435-80d1-367194696f98	660e8401-0001-0001-0001-000000000052	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	facdbe9b-0640-43c0-a93f-85f9efb96f89	660e8401-0001-0001-0001-000000000061	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	d137996d-116c-4a2f-9342-02fa8e72f996	660e8401-0001-0001-0001-000000000062	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	a3b98565-949a-4989-addb-18ce1ea0755a	660e8401-0001-0001-0001-000000000071	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	5487842d-12db-4b9a-bcfe-3dfb23a37a58	660e8401-0001-0001-0001-000000000072	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	c314e478-d939-43f8-958d-86b83d6c707b	660e8401-0001-0001-0001-000000000081	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	64f16c1f-3cd8-4364-819f-1b78d5f0f7df	660e8401-0001-0001-0001-000000000082	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	4f6a9d84-e88a-42b4-b34d-b9fa0949bbb8	660e8401-0001-0001-0001-000000000091	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	2852ea1b-3094-41d9-b0cb-14a7bd5ded04	660e8401-0001-0001-0001-000000000092	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	ae170955-5f6c-4214-89e0-9ae575e5e747	660e8401-0001-0001-0001-000000000093	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	ee179365-5e82-494c-a5dc-d1df5f4b7dfc	660e8401-0001-0001-0001-000000000094	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	870a2ee6-ef46-4117-9fbe-e3d093cbbf45	660e8401-0001-0001-0001-000000000101	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	186ff0cc-4f27-4db4-a50f-62bf76d1b51c	660e8401-0001-0001-0001-000000000102	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	88eae07f-8d2c-4ae6-bd2d-104cb64eb744	660e8401-0001-0001-0001-000000000111	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	7bd466f2-7896-424c-aa6f-49c1d1837a5f	660e8401-0001-0001-0001-000000000112	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 04:06:31.889654	2026-03-13 04:06:31.889654	0
\N	86b04643-a02e-4d98-821e-a3bc5525a67c	660e8401-0001-0001-0001-000000000999	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	83fc933a-a481-4492-a714-c54cbe510e35	660e8401-0001-0001-0001-000000000201	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	1cbf3523-875c-4436-b0dc-2d1436621d7f	660e8401-0001-0001-0001-000000000202	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	9b3c90eb-7743-4b6c-8453-1bc9ba6ea25d	660e8401-0001-0001-0001-000000000203	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	dc8927d0-f57d-4aa7-832a-ebd553ad8fd2	660e8401-0001-0001-0001-000000000204	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	09b8d884-38df-4f89-84fd-df9626a925d2	660e8401-0001-0001-0001-000000000205	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	defbbb45-1cf1-4ebb-881e-9c6ba3fbee2f	660e8401-0001-0001-0001-000000000301	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	70f983db-44ec-467e-bb8b-1e9fceb1e9ce	660e8401-0001-0001-0001-000000000302	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	493794a0-c3ff-4e1c-a8bd-2fd5bc8c06a2	660e8401-0001-0001-0001-000000000401	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	89c16d41-1df7-4afb-9b8e-7f8318db7628	660e8401-0001-0001-0001-000000000402	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	8fa99f0c-4a43-4549-9084-8220ecf1806a	660e8401-0001-0001-0001-000000000403	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
f	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	c6196775-d483-449a-8061-550dbdc40d24	660e8401-0001-0001-0001-000000000404	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	ALL
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.roles (is_deleted, is_system_role, created_at, updated_at, version, created_by, id, tenant_id, updated_by, code, name, description) FROM stdin;
f
t	2026-03-13 04:06:31.862551	2026-03-13 04:06:31.862551	0
\N	550e8400-e29b-41d4-a716-446655440020	660e8400-e29b-41d4-a716-446655440001
\N	SUPER_ADMIN	Super Administrator	Full system access - bypasses all RBAC checks
f	t	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	550e8400-e29b-41d4-a716-446655440021	660e8400-e29b-41d4-a716-446655440001
\N	HR_ADMIN	HR Administrator	Full HR module access
f	t	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	550e8400-e29b-41d4-a716-446655440022	660e8400-e29b-41d4-a716-446655440001
\N	MANAGER	Manager	Team management access
f	t	2026-03-13 10:24:46.151936	2026-03-13 10:24:46.151936	0
\N	550e8400-e29b-41d4-a716-446655440023	660e8400-e29b-41d4-a716-446655440001
\N	EMPLOYEE	Employee	Basic employee self-service access
\.


--
-- Data for Name: roster_entries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.roster_entries (acknowledged_date, is_acknowledged, is_deleted, is_overtime, is_published, work_date, created_at, updated_at, version, created_by, employee_id, id, roster_id, shift_id, tenant_id, updated_by, day_type, notes) FROM stdin;
\
.


--
-- Data for Name: rosters; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.rosters (end_date, is_deleted, is_recurring, published_date, recurrence_weeks, start_date, created_at, updated_at, version, created_by, department_id, id, published_by, team_id, tenant_id, updated_by, name, notes, pattern_type, status) FROM stdin;
\
.


--
-- Data for Name: salary_revisions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.salary_revisions (approved_date, currency, effective_date, increment_amount, increment_percentage, is_deleted, letter_generated, new_salary, payroll_processed, performance_rating, previous_salary, proposed_date, reviewed_date, created_at, updated_at, version, approved_by, created_by, employee_id, id, letter_id, proposed_by, review_cycle_id, reviewed_by, tenant_id, updated_by, new_level, previous_level, new_designation, previous_designation, approver_comments, rejection_reason, reviewer_comments, justification, revision_type, status) FROM stdin;
\
.


--
-- Data for Name: salary_structures; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.salary_structures (basic_salary, conveyance_allowance, effective_date, end_date, hra, income_tax, is_active, is_deleted, medical_allowance, other_allowances, other_deductions, professional_tax, provident_fund, special_allowance, created_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: scheduled_reports; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.scheduled_reports (day_of_month, day_of_week, is_active, time_of_day, created_at, last_run_at, next_run_at, updated_at, created_by, id, report_definition_id, tenant_id, updated_by, frequency, schedule_name, parameters, recipients) FROM stdin;
\
.


--
-- Data for Name: sentiment_analysis; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.sentiment_analysis (confidence_score, sentiment_score, created_at, id, source_id, tenant_id, sentiment, ai_model_version, source_type, emotions, key_phrases, text_content, topics) FROM stdin;
\
.


--
-- Data for Name: shift_assignments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.shift_assignments (assignment_date, effective_from, effective_to, is_recurring, created_at, updated_at, version, assigned_by, created_by, employee_id, id, shift_id, tenant_id, updated_by, assignment_type, status, recurrence_pattern, notes) FROM stdin;
\
.


--
-- Data for Name: shift_swap_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.shift_swap_requests (requester_shift_date, target_shift_date, approved_at, completed_at, created_at, rejected_at, requested_at, target_employee_response, updated_at, version, approver_id, id, requester_assignment_id, requester_employee_id, target_assignment_id, target_employee_id, tenant_id, status, swap_type, target_employee_action, reason, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.shifts (allows_overtime, break_duration_minutes, end_time, full_day_hours, grace_period_in_minutes, half_day_after_minutes, is_active, is_night_shift, late_mark_after_minutes, overtime_multiplier, start_time, color_code, created_at, updated_at, version, created_by, id, tenant_id, updated_by, shift_type, shift_code, working_days, shift_name, description) FROM stdin;
\
.


--
-- Data for Name: signature_approvals; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.signature_approvals (is_required, reminder_count, signing_order, created_at, declined_at, last_reminded_at, sent_at, signed_at, token_expires_at, updated_at, viewed_at, id, signature_request_id, signer_id, tenant_id, signature_ip, signature_method, status, signer_role, authentication_token, comments, decline_reason, signature_data, signature_device, signer_email) FROM stdin;
\
.


--
-- Data for Name: signature_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.signature_requests (is_template, received_signatures, reminder_frequency_days, required_signatures, signature_order, cancelled_at, completed_at, created_at, document_size, expires_at, last_reminder_sent_at, updated_at, cancelled_by, created_by, id, tenant_id, status, document_type, mime_type, document_name, title, document_url, cancellation_reason, description, metadata, template_name) FROM stdin;
\
.


--
-- Data for Name: skill_gaps; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.skill_gaps (analysis_date, avg_proficiency_level, current_supply, estimated_attrition_loss, estimated_hiring_cost, estimated_retirement_loss, estimated_training_cost, gap_count, gap_severity, is_deleted, proficiency_gap, projected_demand_growth, projection_date, required_proficiency_level, required_supply, time_to_close_months, training_available, created_at, updated_at, version, created_by, department_id, id, tenant_id, updated_by, department_name, job_family, priority, resolution_strategy, skill_category, skill_name) FROM stdin;
\
.


--
-- Data for Name: smart_recommendations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.smart_recommendations (confidence_score, is_acted_upon, was_useful, created_at, expires_at, id, target_id, tenant_id, priority, ai_model_version, recommendation_type, target_type, action_taken, recommendation_data) FROM stdin;
\
.


--
-- Data for Name: social_posts; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.social_posts (comments_count, is_deleted, is_pinned, likes_count, created_at, updated_at, author_id, celebrated_employee_id, id, tenant_id, visibility, celebration_type, post_type, achievement_title, content, media_urls) FROM stdin;
2	t	f	0	2026-03-16 02:52:15.187083	2026-03-16 03:11:06.127972	550e8400-e29b-41d4-a716-446655440040
\N	17439cda-bd18-4210-a6f8-d5c7b736148f	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	hello
\N
0	t	f	0	2026-03-16 02:50:28.478472	2026-03-16 03:11:08.96098	550e8400-e29b-41d4-a716-446655440040
\N	591761fe-d56f-4067-a15e-922989ba6f84	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	Hello Guys !!
\N
0	t	f	1	2026-03-16 02:00:11.651355	2026-03-16 03:11:12.09609	550e8400-e29b-41d4-a716-446655440040
\N	82a564b1-8dbb-48a3-ac8d-b49774bc4a3b	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	test
\N
0	t	f	0	2026-03-16 01:59:54.892215	2026-03-16 03:11:13.680563	550e8400-e29b-41d4-a716-446655440040
\N	50380167-44cf-41ce-b0fa-01a3e74231eb	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	Test
\N
2	t	f	1	2026-03-16 01:53:32.723945	2026-03-16 03:11:15.246779	550e8400-e29b-41d4-a716-446655440040
\N	0658d311-0e14-4185-b4cb-b7653a2802c8	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	Test
\N
0	t	f	0	2026-03-16 01:30:13.738949	2026-03-16 03:11:16.699863	550e8400-e29b-41d4-a716-446655440040
\N	c21ec6be-1bc4-42a4-9656-50355d519d16	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	Hello Test
\N
0	f	f	9	2026-03-15 18:59:41.268031	2026-03-16 04:01:54.18815	550e8400-e29b-41d4-a716-446655440040
\N	a56ea103-cb66-4712-baff-4d30ecacedad	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	Hello 1
\N
0	f	f	0	2026-03-16 04:26:42.525208	2026-03-16 04:26:42.525208	550e8400-e29b-41d4-a716-446655440040	f9d2dc7c-47d3-4fbd-a3ff-e8eb71e5924f	40a937f1-5479-457b-af99-49a298dbed2f	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION	team_player	PRAISE
\N	nice
\N
0	f	f	0	2026-03-16 04:30:17.49275	2026-03-16 04:30:17.49275	550e8400-e29b-41d4-a716-446655440040
\N	f35d07e4-5703-40c8-ad90-4759ce846d2a	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POLL
\N	What is your favorite frontend framework?
\N
0	f	f	1	2026-03-17 22:55:50.673719	2026-03-17 22:55:53.527275	550e8400-e29b-41d4-a716-446655440040
\N	a1864f65-8f9e-4417-b232-8551b482f247	660e8400-e29b-41d4-a716-446655440001	ORGANIZATION
\N	POST
\N	Todays Post newly creating on Mar 17 2026, 10:55PM
\N
\.


--
-- Data for Name: step_executions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.step_executions (delegated, escalated, is_deleted, reminder_count, step_order, time_taken_hours, assigned_at, created_at, deadline, escalated_at, executed_at, last_reminder_sent_at, updated_at, version, action_by_user_id, approval_step_id, assigned_to_user_id, created_by, delegated_from_user_id, escalated_to_user_id, id, tenant_id, updated_by, workflow_execution_id, action, action_by_user_name, action_device_info, action_ip_address, alternative_approvers, assigned_to_user_name, attachments_json, comments, status, step_name) FROM stdin;
\
.


--
-- Data for Name: succession_candidates; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.succession_candidates (estimated_ready_date, is_confidential, is_deleted, priority, created_at, updated_at, version, candidate_id, created_by, id, succession_plan_id, tenant_id, updated_by, development_needs, development_plan, gaps, notes, performance_rating, potential_rating, readiness, strengths) FROM stdin;
\
.


--
-- Data for Name: succession_plans; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.succession_plans (expected_vacancy_date, is_deleted, created_at, last_reviewed_at, updated_at, version, created_by, current_incumbent_id, id, last_reviewed_by, position_id, tenant_id, updated_by, notes, risk_level, risk_reason, status) FROM stdin;
\
.


--
-- Data for Name: survey_answers; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.survey_answers (nps_score, numeric_answer, rating_answer, seconds_spent, selected_option, sentiment_score, weighted_score, answered_at, id, question_id, response_id, tenant_id, key_phrases, ranking, selected_options, sentiment_level, text_answer, topics) FROM stdin;
\
.


--
-- Data for Name: survey_insights; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.survey_insights (affected_employees, confidence_score, impact_score, is_acknowledged, percentage_change, trend_period_weeks, acknowledged_at, action_due_date, generated_at, acknowledged_by, assigned_to, department_id, id, location_id, survey_id, tenant_id, title, action_notes, action_status, category, description, insight_type, key_themes, priority, recommendation, related_questions, trend) FROM stdin;
\
.


--
-- Data for Name: survey_questions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.survey_questions (is_required, max_scale, min_scale, question_order, weight, created_at, depends_on_question_id, id, survey_id, tenant_id, depends_on_answer, engagement_category, max_label, min_label, options, question_text, question_type) FROM stdin;
\
.


--
-- Data for Name: survey_responses; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.survey_responses (completion_time_minutes, engagement_score, nps_score, sentiment_score, tenure_months, created_at, started_at, submitted_at, employee_id, id, survey_id, tenant_id, anonymous_id, department, grade, ip_address, location, overall_sentiment, status, user_agent) FROM stdin;
\
.


--
-- Data for Name: surveys; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.surveys (is_anonymous, total_responses, created_at, end_date, start_date, updated_at, version, created_by, id, tenant_id, status, survey_code, survey_type, target_audience, title, description) FROM stdin;
\
.


--
-- Data for Name: talent_pool_members; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.talent_pool_members (added_date, is_deleted, review_date, created_at, updated_at, version, added_by, created_by, employee_id, id, talent_pool_id, tenant_id, updated_by, notes, status) FROM stdin;
\
.


--
-- Data for Name: talent_pools; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.talent_pools (is_active, is_deleted, member_count, created_at, updated_at, version, created_by, id, owner_id, tenant_id, updated_by, criteria, description, name, type) FROM stdin;
\
.


--
-- Data for Name: tax_declarations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tax_declarations (estimated_tax, hra_exemption, hra_metro_city, hra_rent_paid, other_income_capital_gains, other_income_interest, other_income_rental, other_income_total, previous_employer_income, previous_employer_tax, "sec d_parents", sec_24_home_loan_interest, sec_80c_elss, sec_80c_epf, sec_80c_home_loan_principal, sec_80c_life_insurance, sec_80c_nps_employee, sec_80c_nsc, sec_80c_ppf, sec_80c_sukanya_samriddhi, sec_80c_total, sec_80c_tuition_fees, sec_80ccd_1b_nps_additional, sec_80d_preventive_health, sec_80d_self_family, sec_80d_total, sec_80e_education_loan, sec_80g_donations, sec_80gg_rent_paid, taxable_income, total_deductions, approved_at, created_at, locked_at, rejected_at, submitted_at, updated_at, financial_year, previous_employer_pan, approved_by, employee_id, id, rejected_by, tenant_id, tax_regime, status, notes, previous_employer_name, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: tax_proofs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tax_proofs (approved_amount, declared_amount, end_date, start_date, created_at, document_size, rejected_at, submitted_at, updated_at, verified_at, employee_id, id, rejected_by, tax_declaration_id, tenant_id, verified_by, document_type, investment_section, status, certificate_number, policy_number, proof_type, document_name, proof_description, document_url, issuer_name, rejection_reason, verification_notes) FROM stdin;
\
.


--
-- Data for Name: tax_regime_comparisons; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tax_regime_comparisons (gross_salary, new_regime_cess, new_regime_rebate, new_regime_tax, new_regime_taxable_income, new_regime_total_tax, old_regime_cess, old_regime_tax, old_regime_taxable_income, old_regime_total_deductions, old_regime_total_tax, standard_deduction, tax_savings, created_at, updated_at, financial_year, employee_id, id, tenant_id, recommended_regime, selected_regime, calculation_details) FROM stdin;
\
.


--
-- Data for Name: tds_slabs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tds_slabs (is_active, max_income, min_income, tax_percentage, created_at, updated_at, assessment_year, created_by, id, tenant_id, updated_by, tax_regime) FROM stdin;
\
.


--
-- Data for Name: template_instantiations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.template_instantiations (is_deleted, created_at, updated_at, version, created_by, id, template_id, tenant_id, updated_by, generated_document_url, title, content, variable_values) FROM stdin;
\
.


--
-- Data for Name: tenant_applications; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tenant_applications (expires_at, is_deleted, max_users, activated_at, created_at, updated_at, version, application_id, created_by, id, tenant_id, updated_by, status, subscription_tier, configuration) FROM stdin;
\N
f	1000	2026-03-12 18:03:16.529287	2026-03-12 18:03:16.530666	2026-03-12 18:03:16.530666	0	b63547a7-eb8c-4661-a22a-a9d6c3f8ee81
\N	a4f60f62-a02c-4a95-bc57-44a2088d89ed	550e8400-e29b-41d4-a716-446655440000
\N	ACTIVE	ENTERPRISE
\N
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tenants (is_deleted, created_at, updated_at, version, created_by, id, updated_by, contact_phone, status, code, contact_email, name, description, settings) FROM stdin;
f
2026-03-13 04:06:31.844946	2026-03-13 04:06:31.844946	0
\N	660e8400-e29b-41d4-a716-446655440001
\N	+91-9876543210	ACTIVE	nulogic	admin@nulogic.io	NuLogic	NuLogic - Primary tenant	{}
\.


--
-- Data for Name: ticket_categories; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.ticket_categories (auto_close_after_days, display_order, is_active, is_visible_to_employees, requires_approval, sla_hours, created_at, updated_at, approval_workflow_id, default_assignee_id, id, parent_category_id, sla_id, tenant_id, color, department_type, code, icon, default_assignee_role, name, description) FROM stdin;
\
.


--
-- Data for Name: ticket_comments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.ticket_comments (is_internal, created_at, updated_at, commenter_id, id, tenant_id, ticket_id, attachment_urls, comment) FROM stdin;
\
.


--
-- Data for Name: ticket_escalations; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.ticket_escalations (is_auto_escalated, acknowledged_at, created_at, escalated_at, acknowledged_by, escalated_from, escalated_to, id, tenant_id, ticket_id, escalation_level, escalation_reason, notes) FROM stdin;
\
.


--
-- Data for Name: ticket_metrics; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.ticket_metrics (comment_count, csat_rating, escalation_count, first_contact_resolution, first_response_minutes, first_response_sla_breached, reassignment_count, reopen_count, resolution_minutes, resolution_sla_breached, sla_met, total_handle_time_minutes, total_wait_time_minutes, csat_submitted_at, first_response_at, resolution_at, updated_at, id, sla_id, tenant_id, ticket_id, csat_feedback) FROM stdin;
\
.


--
-- Data for Name: ticket_slas; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.ticket_slas (apply_to_all_categories, business_end_hour, business_start_hour, escalation_after_minutes, first_response_minutes, is_active, is_business_hours_only, resolution_minutes, second_escalation_minutes, created_at, updated_at, category_id, escalation_to, id, second_escalation_to, tenant_id, priority, working_days, name, description) FROM stdin;
\
.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.tickets (current_escalation_level, first_response_breached, is_escalated, resolution_breached, satisfaction_rating, assigned_at, closed_at, created_at, due_date, first_response_at, first_response_due, resolution_due, resolved_at, updated_at, assigned_to, category_id, employee_id, id, sla_id, tenant_id, priority, source, status, ticket_number, subject, tags, attachment_urls, description, resolution_notes, satisfaction_feedback) FROM stdin;
\
.


--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.time_entries (approved_date, billable_hours, billing_amount, end_time, entry_date, hourly_rate, hours_worked, is_billable, is_deleted, start_time, submitted_date, created_at, updated_at, version, approved_by, client_id, created_by, employee_id, id, project_id, task_id, tenant_id, updated_by, client_name, description, entry_type, external_ref, notes, rejection_reason, status) FROM stdin;
\
.


--
-- Data for Name: training_enrollments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.training_enrollments (assessment_score, attendance_percentage, certificate_issued, completion_date, enrollment_date, score_percentage, completed_at, created_at, enrolled_at, updated_at, version, employee_id, id, program_id, tenant_id, status, certificate_url, feedback, notes) FROM stdin;
\
.


--
-- Data for Name: training_programs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.training_programs (cost, cost_per_participant, duration_hours, end_date, is_mandatory, max_participants, start_date, created_at, updated_at, version, created_by, id, instructor_id, tenant_id, updated_by, status, delivery_mode, category, program_code, trainer_email, trainer_name, location, program_name, certificate_template_url, materials_url, description, learning_objectives, prerequisites) FROM stdin;
\
.


--
-- Data for Name: travel_expenses; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.travel_expenses (amount, amount_in_base_currency, approved_amount, approved_date, exchange_rate, expense_date, is_deleted, created_at, updated_at, version, approved_by, created_by, employee_id, id, tenant_id, travel_request_id, updated_by, currency, description, expense_type, receipt_number, receipt_path, rejection_reason, remarks, status) FROM stdin;
\
.


--
-- Data for Name: travel_requests; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.travel_requests (accommodation_required, advance_approved, advance_disbursed_date, advance_required, approved_date, cab_required, check_in_date, check_out_date, departure_date, estimated_cost, is_deleted, is_international, return_date, submitted_date, visa_required, created_at, departure_time, return_time, updated_at, version, approved_by, created_by, employee_id, id, project_id, tenant_id, updated_by, client_name, destination_city, hotel_preference, origin_city, purpose, rejection_reason, request_number, special_instructions, status, transport_class, transport_mode, travel_type) FROM stdin;
\
.


--
-- Data for Name: user_app_access; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_app_access (is_deleted, created_at, granted_at, last_accessed_at, updated_at, version, application_id, created_by, granted_by, id, tenant_id, updated_by, user_id, status) FROM stdin;
\
.


--
-- Data for Name: user_app_direct_permissions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_app_direct_permissions (permission_id, user_app_access_id) FROM stdin;
\
.


--
-- Data for Name: user_app_roles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_app_roles (role_id, user_app_access_id) FROM stdin;
\
.


--
-- Data for Name: user_basic_notification_preferences; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_basic_notification_preferences (email_notifications, is_deleted, push_notifications, security_alerts, sms_notifications, created_at, updated_at, version, created_by, id, tenant_id, updated_by, user_id) FROM stdin;
\
.


--
-- Data for Name: user_notification_preferences; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_notification_preferences (digest_time, email_enabled, in_app_enabled, is_deleted, push_enabled, quiet_hours_enabled, quiet_hours_end, quiet_hours_start, slack_enabled, sms_enabled, teams_enabled, whatsapp_enabled, created_at, updated_at, version, created_by, id, tenant_id, updated_by, user_id, category, digest_day, digest_frequency, minimum_priority) FROM stdin;
\
.


--
-- Data for Name: user_notification_quiet_days; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_notification_quiet_days (preference_id, day_of_week) FROM stdin;
\
.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.user_roles (role_id, user_id) FROM stdin;
550e8400-e29b-41d4-a716-446655440020	550e8400-e29b-41d4-a716-446655440030
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.users (failed_login_attempts, is_deleted, mfa_enabled, created_at, last_login_at, locked_until, mfa_setup_at, password_changed_at, password_reset_token_expiry, updated_at, version, created_by, id, tenant_id, updated_by, status, first_name, last_name, mfa_secret, email, profile_picture_url, mfa_backup_codes, password_hash, password_reset_token) FROM stdin;
0	f	f	2026-03-13 04:06:31.858451	2026-03-18 01:51:16.383301
\N
\N
\N
\N	2026-03-18 01:51:16.432216	58
\N	550e8400-e29b-41d4-a716-446655440030	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440030	ACTIVE	Fayaz	M
\N	fayaz.m@nulogic.io	https://lh3.googleusercontent.com/a/ACg8ocLQDbyYnhCLgkEAIMTXn7WdQf9GmL5JCZSMzYQF3HqEGLXZA6Rk=s96-c
\N	$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	7ea390bc-b247-46cf-80b9-588a0936e073	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Arjun	Patel
\N	arjun.patel@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	28b25de8-b69f-4ca2-939d-70985af46b3a	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Priya	Sharma
\N	priya.sharma@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	4d9ca304-0c7d-49f2-bafe-2ee371c40d73	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Rahul	Verma
\N	rahul.verma@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	a670f8d2-9792-4fbf-9c33-df3151b12071	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Meera	Nair
\N	meera.nair@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	a746cb17-ef5d-47ff-a26f-3edc09b68f36	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Vikram	Singh
\N	vikram.singh@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	895cdf79-0ec5-48e6-b40d-10409d68140a	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Kavitha	Rajan
\N	kavitha.rajan@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	fe22cf2e-63f8-4c35-8bda-567638b0f214	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Deepa	Kumar
\N	deepa.kumar@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\N	f	f	2026-02-13 22:09:22.446914
\N
\N
\N
\N
\N	2026-03-15 22:09:22.446914	0
\N	971688c9-6979-4df4-ae3f-46a344b13742	660e8400-e29b-41d4-a716-446655440001
\N	ACTIVE	Ananya	Reddy
\N	ananya.reddy@nulogic.io
\N
\N	$2a$10$dummyhashnotusedforlogin000000000000000000000000000000
\N
\.


--
-- Data for Name: verification_checks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.verification_checks (end_date, is_critical, is_deleted, start_date, verification_date, created_at, updated_at, version, bgv_id, created_by, employee_id, id, tenant_id, updated_by, check_name, check_type, discrepancy_details, document_reference, institution_name, remarks, result, status, verifier_contact, verifier_name) FROM stdin;
\
.


--
-- Data for Name: webhook_deliveries; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.webhook_deliveries (attempts, is_deleted, response_status, created_at, delivered_at, duration_ms, first_attempt_at, last_attempt_at, next_retry_at, updated_at, version, created_by, id, tenant_id, updated_by, webhook_id, status, event_id, event_type, error_message, response_body, payload) FROM stdin;
\
.


--
-- Data for Name: webhook_events; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.webhook_events (webhook_id, event_type) FROM stdin;
\
.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.webhooks (consecutive_failures, include_payload, is_deleted, max_retries, timeout_seconds, created_at, last_failure_at, last_success_at, updated_at, version, created_by, id, tenant_id, updated_by, status, name, secret, description, last_error_message, url, custom_headers) FROM stdin;
\
.


--
-- Data for Name: wellness_challenges; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wellness_challenges (bonus_points_for_goal, daily_target, end_date, is_active, is_deleted, is_team_based, leaderboard_enabled, max_participants, min_participants, points_per_completion, start_date, target_value, team_size, created_at, updated_at, version, badge_id, created_by, id, program_id, tenant_id, updated_by, challenge_type, description, name, target_unit, tracking_type) FROM stdin;
\
.


--
-- Data for Name: wellness_points; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wellness_points (badges_earned, challenges_completed, current_level, current_streak, is_deleted, lifetime_points, longest_streak, points_to_next_level, redeemable_points, total_points, created_at, last_activity_at, updated_at, version, created_by, employee_id, id, tenant_id, updated_by) FROM stdin;
\
.


--
-- Data for Name: wellness_points_transactions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wellness_points_transactions (balance_after, is_deleted, points, created_at, transaction_at, updated_at, version, created_by, employee_id, id, reference_id, tenant_id, updated_by, description, reference_type, transaction_type) FROM stdin;
\
.


--
-- Data for Name: wellness_programs; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wellness_programs (budget_amount, end_date, is_active, is_deleted, is_featured, max_participants, points_reward, start_date, created_at, updated_at, version, created_by, id, tenant_id, updated_by, category, description, external_link, image_url, instructions, name, program_type) FROM stdin;
\
.


--
-- Data for Name: wiki_page_approval_tasks; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wiki_page_approval_tasks (is_deleted, created_at, reviewed_at, updated_at, version, approval_task_id, created_by, id, page_id, reviewed_by, submitted_by, tenant_id, updated_by, status, change_summary, rejection_reason) FROM stdin;
\
.


--
-- Data for Name: wiki_page_comments; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wiki_page_comments (is_deleted, is_pinned, like_count, created_at, updated_at, version, created_by, id, page_id, parent_comment_id, tenant_id, updated_by, content) FROM stdin;
\
.


--
-- Data for Name: wiki_page_versions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wiki_page_versions (is_deleted, version_number, created_at, updated_at, version, created_by, id, page_id, tenant_id, updated_by, change_summary, title, content, excerpt) FROM stdin;
\
.


--
-- Data for Name: wiki_page_watches; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wiki_page_watches (is_deleted, created_at, updated_at, version, created_by, id, page_id, tenant_id, updated_by, user_id, watch_type) FROM stdin;
\
.


--
-- Data for Name: wiki_pages; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wiki_pages (comment_count, is_deleted, is_pinned, like_count, view_count, created_at, last_viewed_at, pinned_at, published_at, updated_at, version, created_by, id, last_viewed_by, parent_page_id, pinned_by, published_by, space_id, tenant_id, updated_by, status, visibility, slug, title, content, excerpt) FROM stdin;
\
.


--
-- Data for Name: wiki_spaces; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.wiki_spaces (is_archived, is_deleted, order_index, color, archived_at, created_at, updated_at, version, archived_by, created_by, id, tenant_id, updated_by, icon, visibility, name, slug, description) FROM stdin;
\
.


--
-- Data for Name: workflow_definitions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.workflow_definitions (allow_parallel_approval, auto_approve_enabled, default_sla_hours, escalation_after_hours, escalation_enabled, is_active, is_default, is_deleted, max_amount, min_amount, notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission, skip_level_allowed, workflow_version, created_at, updated_at, version, created_by, department_id, id, location_id, tenant_id, updated_by, applicable_grades, auto_approve_condition, description, entity_type, name, workflow_type) FROM stdin;
\
.


--
-- Data for Name: workflow_executions; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.workflow_executions (amount, current_step_order, is_deleted, cancelled_at, completed_at, created_at, deadline, escalation_due_at, submitted_at, updated_at, version, created_by, current_step_id, department_id, entity_id, id, location_id, requester_id, tenant_id, updated_by, workflow_definition_id, cancellation_reason, context_json, entity_type, priority, reference_number, requester_name, status, title) FROM stdin;
\
.


--
-- Data for Name: workflow_rules; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.workflow_rules (is_active, is_deleted, priority, skip_step_order, created_at, effective_from, effective_to, updated_at, version, additional_approver_id, additional_approver_role_id, created_by, id, target_workflow_id, tenant_id, updated_by, action, description, entity_type, name, notification_recipients, notification_template, rule_expression, rule_type, target_priority) FROM stdin;
\
.


--
-- Data for Name: workforce_trends; Type: TABLE DATA; Schema: public; Owner: hrms
--

COPY public.workforce_trends (attrition_rate, avg_age, avg_engagement_score, avg_performance_rating, avg_salary, avg_salary_increase, avg_tenure_months, avg_time_to_fill_days, cost_per_hire, gender_diversity_ratio, growth_rate, high_performers_count, hiring_rate, internal_transfers_in, internal_transfers_out, involuntary_attrition, is_deleted, low_performers_count, new_hires, open_positions, period_month, period_year, terminations, total_compensation, total_headcount, training_cost, voluntary_attrition, voluntary_attrition_rate, created_at, updated_at, version, created_by, department_id, id, tenant_id, updated_by, department_name, trend_type) FROM stdin;
\
.


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: project_members idx_pm_member_project_user; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.project_members
  ADD CONSTRAINT idx_pm_member_project_user UNIQUE (project_id, user_id);


--
-- Name: projects idx_pm_project_code_tenant; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.projects
  ADD CONSTRAINT idx_pm_project_code_tenant UNIQUE (project_code, tenant_id);


--
-- Name: project_tasks idx_pm_task_code_tenant; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.project_tasks
  ADD CONSTRAINT idx_pm_task_code_tenant UNIQUE (task_code, tenant_id);


--
-- Name: project_comments project_comments_pkey; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.project_comments
  ADD CONSTRAINT project_comments_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.project_members
  ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.project_milestones
  ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.project_tasks
  ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: pm; Owner: hrms
--

ALTER TABLE ONLY pm.projects
  ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: allocation_requests allocation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.allocation_requests
  ADD CONSTRAINT allocation_requests_pkey PRIMARY KEY (id);


--
-- Name: analytics_insights analytics_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.analytics_insights
  ADD CONSTRAINT analytics_insights_pkey PRIMARY KEY (id);


--
-- Name: analytics_metrics analytics_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.analytics_metrics
  ADD CONSTRAINT analytics_metrics_pkey PRIMARY KEY (id);


--
-- Name: analytics_snapshots analytics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.analytics_snapshots
  ADD CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id);


--
-- Name: announcement_reads announcement_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.announcement_reads
  ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.announcements
  ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.api_keys
  ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.api_keys
  ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: app_permissions app_permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_permissions
  ADD CONSTRAINT app_permissions_code_key UNIQUE (code);


--
-- Name: app_permissions app_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_permissions
  ADD CONSTRAINT app_permissions_pkey PRIMARY KEY (id);


--
-- Name: app_role_permissions app_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_role_permissions
  ADD CONSTRAINT app_role_permissions_pkey PRIMARY KEY (permission_id, role_id);


--
-- Name: app_roles app_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_roles
  ADD CONSTRAINT app_roles_pkey PRIMARY KEY (id);


--
-- Name: applicants applicants_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.applicants
  ADD CONSTRAINT applicants_pkey PRIMARY KEY (id);


--
-- Name: approval_delegates approval_delegates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.approval_delegates
  ADD CONSTRAINT approval_delegates_pkey PRIMARY KEY (id);


--
-- Name: approval_steps approval_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.approval_steps
  ADD CONSTRAINT approval_steps_pkey PRIMARY KEY (id);


--
-- Name: asset_recoveries asset_recoveries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.asset_recoveries
  ADD CONSTRAINT asset_recoveries_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.assets
  ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.attendance_records
  ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_regularization_config attendance_regularization_config_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.attendance_regularization_config
  ADD CONSTRAINT attendance_regularization_config_pkey PRIMARY KEY (id);


--
-- Name: attendance_regularization_config attendance_regularization_config_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.attendance_regularization_config
  ADD CONSTRAINT attendance_regularization_config_tenant_id_key UNIQUE (tenant_id);


--
-- Name: attendance_time_entries attendance_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.attendance_time_entries
  ADD CONSTRAINT attendance_time_entries_pkey PRIMARY KEY (id);


--
-- Name: attrition_predictions attrition_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.attrition_predictions
  ADD CONSTRAINT attrition_predictions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.audit_logs
  ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: background_verifications background_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.background_verifications
  ADD CONSTRAINT background_verifications_pkey PRIMARY KEY (id);


--
-- Name: benefit_claims benefit_claims_claim_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_claims
  ADD CONSTRAINT benefit_claims_claim_number_key UNIQUE (claim_number);


--
-- Name: benefit_claims benefit_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_claims
  ADD CONSTRAINT benefit_claims_pkey PRIMARY KEY (id);


--
-- Name: benefit_dependents benefit_dependents_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_dependents
  ADD CONSTRAINT benefit_dependents_pkey PRIMARY KEY (id);


--
-- Name: benefit_enrollments benefit_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_enrollments
  ADD CONSTRAINT benefit_enrollments_pkey PRIMARY KEY (id);


--
-- Name: benefit_plans_enhanced benefit_plans_enhanced_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_plans_enhanced
  ADD CONSTRAINT benefit_plans_enhanced_pkey PRIMARY KEY (id);


--
-- Name: benefit_plans benefit_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_plans
  ADD CONSTRAINT benefit_plans_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_categories
  ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_categories
  ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);


--
-- Name: blog_comments blog_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_comments
  ADD CONSTRAINT blog_comments_pkey PRIMARY KEY (id);


--
-- Name: blog_likes blog_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_likes
  ADD CONSTRAINT blog_likes_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_posts
  ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_posts
  ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: budget_scenarios budget_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.budget_scenarios
  ADD CONSTRAINT budget_scenarios_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.calendar_events
  ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: candidate_match_scores candidate_match_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.candidate_match_scores
  ADD CONSTRAINT candidate_match_scores_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.candidates
  ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: challenge_participants challenge_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.challenge_participants
  ADD CONSTRAINT challenge_participants_pkey PRIMARY KEY (id);


--
-- Name: chatbot_conversations chatbot_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.chatbot_conversations
  ADD CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id);


--
-- Name: comp_off_requests comp_off_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.comp_off_requests
  ADD CONSTRAINT comp_off_requests_pkey PRIMARY KEY (id);


--
-- Name: comp_time_balances comp_time_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.comp_time_balances
  ADD CONSTRAINT comp_time_balances_pkey PRIMARY KEY (id);


--
-- Name: comp_time_transactions comp_time_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.comp_time_transactions
  ADD CONSTRAINT comp_time_transactions_pkey PRIMARY KEY (id);


--
-- Name: compensation_review_cycles compensation_review_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.compensation_review_cycles
  ADD CONSTRAINT compensation_review_cycles_pkey PRIMARY KEY (id);


--
-- Name: compliance_alerts compliance_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.compliance_alerts
  ADD CONSTRAINT compliance_alerts_pkey PRIMARY KEY (id);


--
-- Name: compliance_audit_logs compliance_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.compliance_audit_logs
  ADD CONSTRAINT compliance_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: compliance_checklists compliance_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.compliance_checklists
  ADD CONSTRAINT compliance_checklists_pkey PRIMARY KEY (id);


--
-- Name: compliance_policies compliance_policies_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.compliance_policies
  ADD CONSTRAINT compliance_policies_code_key UNIQUE (code);


--
-- Name: compliance_policies compliance_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.compliance_policies
  ADD CONSTRAINT compliance_policies_pkey PRIMARY KEY (id);


--
-- Name: content_views content_views_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.content_views
  ADD CONSTRAINT content_views_pkey PRIMARY KEY (id);


--
-- Name: contract_reminders contract_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.contract_reminders
  ADD CONSTRAINT contract_reminders_pkey PRIMARY KEY (id);


--
-- Name: contract_signatures contract_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.contract_signatures
  ADD CONSTRAINT contract_signatures_pkey PRIMARY KEY (id);


--
-- Name: contract_templates contract_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.contract_templates
  ADD CONSTRAINT contract_templates_pkey PRIMARY KEY (id);


--
-- Name: contract_versions contract_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.contract_versions
  ADD CONSTRAINT contract_versions_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.contracts
  ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.currencies
  ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_field_definitions
  ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: custom_field_values custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_field_values
  ADD CONSTRAINT custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: custom_scope_targets custom_scope_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_scope_targets
  ADD CONSTRAINT custom_scope_targets_pkey PRIMARY KEY (id);


--
-- Name: dashboard_widgets dashboard_widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.dashboard_widgets
  ADD CONSTRAINT dashboard_widgets_pkey PRIMARY KEY (id);


--
-- Name: dashboards dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.dashboards
  ADD CONSTRAINT dashboards_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.departments
  ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: document_access document_access_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_access
  ADD CONSTRAINT document_access_pkey PRIMARY KEY (id);


--
-- Name: document_approval_tasks document_approval_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_approval_tasks
  ADD CONSTRAINT document_approval_tasks_pkey PRIMARY KEY (id);


--
-- Name: document_approval_workflows document_approval_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_approval_workflows
  ADD CONSTRAINT document_approval_workflows_pkey PRIMARY KEY (id);


--
-- Name: document_approvals document_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_approvals
  ADD CONSTRAINT document_approvals_pkey PRIMARY KEY (id);


--
-- Name: document_categories document_categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_categories
  ADD CONSTRAINT document_categories_category_code_key UNIQUE (category_code);


--
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_categories
  ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- Name: document_expiry_tracking document_expiry_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_expiry_tracking
  ADD CONSTRAINT document_expiry_tracking_pkey PRIMARY KEY (id);


--
-- Name: document_requests document_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_requests
  ADD CONSTRAINT document_requests_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_templates
  ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_template_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_templates
  ADD CONSTRAINT document_templates_template_code_key UNIQUE (template_code);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.document_versions
  ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: email_notifications email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.email_notifications
  ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);


--
-- Name: employee_esi_records employee_esi_records_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_esi_records
  ADD CONSTRAINT employee_esi_records_pkey PRIMARY KEY (id);


--
-- Name: employee_loans employee_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_loans
  ADD CONSTRAINT employee_loans_pkey PRIMARY KEY (id);


--
-- Name: employee_payroll_records employee_payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_payroll_records
  ADD CONSTRAINT employee_payroll_records_pkey PRIMARY KEY (id);


--
-- Name: employee_pf_records employee_pf_records_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_pf_records
  ADD CONSTRAINT employee_pf_records_pkey PRIMARY KEY (id);


--
-- Name: employee_points employee_points_employee_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_points
  ADD CONSTRAINT employee_points_employee_id_tenant_id_key UNIQUE (employee_id, tenant_id);


--
-- Name: employee_points employee_points_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_points
  ADD CONSTRAINT employee_points_pkey PRIMARY KEY (id);


--
-- Name: employee_profile_update_requests employee_profile_update_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_profile_update_requests
  ADD CONSTRAINT employee_profile_update_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_referrals employee_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_referrals
  ADD CONSTRAINT employee_referrals_pkey PRIMARY KEY (id);


--
-- Name: employee_skills employee_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_skills
  ADD CONSTRAINT employee_skills_pkey PRIMARY KEY (id);


--
-- Name: employee_tds_declarations employee_tds_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_tds_declarations
  ADD CONSTRAINT employee_tds_declarations_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employees
  ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employees
  ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);


--
-- Name: employment_change_requests employment_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employment_change_requests
  ADD CONSTRAINT employment_change_requests_pkey PRIMARY KEY (id);


--
-- Name: engagement_scores engagement_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.engagement_scores
  ADD CONSTRAINT engagement_scores_pkey PRIMARY KEY (id);


--
-- Name: esi_configs esi_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.esi_configs
  ADD CONSTRAINT esi_configs_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.exchange_rates
  ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: exit_clearances exit_clearances_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.exit_clearances
  ADD CONSTRAINT exit_clearances_pkey PRIMARY KEY (id);


--
-- Name: exit_interviews exit_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.exit_interviews
  ADD CONSTRAINT exit_interviews_pkey PRIMARY KEY (id);


--
-- Name: exit_interviews exit_interviews_public_token_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.exit_interviews
  ADD CONSTRAINT exit_interviews_public_token_key UNIQUE (public_token);


--
-- Name: exit_processes exit_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.exit_processes
  ADD CONSTRAINT exit_processes_pkey PRIMARY KEY (id);


--
-- Name: expense_claims expense_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.expense_claims
  ADD CONSTRAINT expense_claims_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feature_flags
  ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_tenant_id_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feature_flags
  ADD CONSTRAINT feature_flags_tenant_id_feature_key_key UNIQUE (tenant_id, feature_key);


--
-- Name: feedback_360_cycles feedback_360_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feedback_360_cycles
  ADD CONSTRAINT feedback_360_cycles_pkey PRIMARY KEY (id);


--
-- Name: feedback_360_requests feedback_360_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feedback_360_requests
  ADD CONSTRAINT feedback_360_requests_pkey PRIMARY KEY (id);


--
-- Name: feedback_360_responses feedback_360_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feedback_360_responses
  ADD CONSTRAINT feedback_360_responses_pkey PRIMARY KEY (id);


--
-- Name: feedback_360_summaries feedback_360_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feedback_360_summaries
  ADD CONSTRAINT feedback_360_summaries_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feedback
  ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: file_metadata file_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.file_metadata
  ADD CONSTRAINT file_metadata_pkey PRIMARY KEY (id);


--
-- Name: flex_benefit_allocations flex_benefit_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.flex_benefit_allocations
  ADD CONSTRAINT flex_benefit_allocations_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.flyway_schema_history
  ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: full_and_final_settlements full_and_final_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.full_and_final_settlements
  ADD CONSTRAINT full_and_final_settlements_pkey PRIMARY KEY (id);


--
-- Name: generated_documents generated_documents_document_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.generated_documents
  ADD CONSTRAINT generated_documents_document_number_key UNIQUE (document_number);


--
-- Name: generated_documents generated_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.generated_documents
  ADD CONSTRAINT generated_documents_pkey PRIMARY KEY (id);


--
-- Name: generated_letters generated_letters_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.generated_letters
  ADD CONSTRAINT generated_letters_pkey PRIMARY KEY (id);


--
-- Name: generated_letters generated_letters_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.generated_letters
  ADD CONSTRAINT generated_letters_reference_number_key UNIQUE (reference_number);


--
-- Name: global_payroll_runs global_payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.global_payroll_runs
  ADD CONSTRAINT global_payroll_runs_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.goals
  ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: headcount_budgets headcount_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.headcount_budgets
  ADD CONSTRAINT headcount_budgets_pkey PRIMARY KEY (id);


--
-- Name: headcount_positions headcount_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.headcount_positions
  ADD CONSTRAINT headcount_positions_pkey PRIMARY KEY (id);


--
-- Name: health_logs health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.health_logs
  ADD CONSTRAINT health_logs_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.holidays
  ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: api_keys idx_api_keys_key_hash; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.api_keys
  ADD CONSTRAINT idx_api_keys_key_hash UNIQUE (key_hash);


--
-- Name: app_permissions idx_app_perm_code; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_permissions
  ADD CONSTRAINT idx_app_perm_code UNIQUE (code);


--
-- Name: custom_field_definitions idx_cfd_code_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_field_definitions
  ADD CONSTRAINT idx_cfd_code_tenant UNIQUE (field_code, tenant_id);


--
-- Name: custom_field_values idx_cfv_definition_entity; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_field_values
  ADD CONSTRAINT idx_cfv_definition_entity UNIQUE (field_definition_id, entity_id);


--
-- Name: departments idx_department_code_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.departments
  ADD CONSTRAINT idx_department_code_tenant UNIQUE (code, tenant_id);


--
-- Name: employees idx_employee_code_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employees
  ADD CONSTRAINT idx_employee_code_tenant UNIQUE (employee_code, tenant_id);


--
-- Name: nu_applications idx_nu_app_code; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.nu_applications
  ADD CONSTRAINT idx_nu_app_code UNIQUE (code);


--
-- Name: payment_batches idx_payment_batch_ref; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_batches
  ADD CONSTRAINT idx_payment_batch_ref UNIQUE (tenant_id, batch_ref);


--
-- Name: payment_transactions idx_payment_transaction_ref; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_transactions
  ADD CONSTRAINT idx_payment_transaction_ref UNIQUE (tenant_id, transaction_ref);


--
-- Name: payroll_runs idx_payroll_tenant_period; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payroll_runs
  ADD CONSTRAINT idx_payroll_tenant_period UNIQUE (tenant_id, pay_period_month, pay_period_year);


--
-- Name: payslips idx_payslip_employee_period; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payslips
  ADD CONSTRAINT idx_payslip_employee_period UNIQUE (employee_id, pay_period_month, pay_period_year);


--
-- Name: permissions idx_permission_code; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.permissions
  ADD CONSTRAINT idx_permission_code UNIQUE (code);


--
-- Name: preboarding_candidates idx_preboard_token; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.preboarding_candidates
  ADD CONSTRAINT idx_preboard_token UNIQUE (access_token);


--
-- Name: projects idx_project_code_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.projects
  ADD CONSTRAINT idx_project_code_tenant UNIQUE (project_code, tenant_id);


--
-- Name: project_employees idx_project_employees_unique; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.project_employees
  ADD CONSTRAINT idx_project_employees_unique UNIQUE (project_id, employee_id, tenant_id);


--
-- Name: roles idx_role_code_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.roles
  ADD CONSTRAINT idx_role_code_tenant UNIQUE (code, tenant_id);


--
-- Name: tenants idx_tenant_code; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tenants
  ADD CONSTRAINT idx_tenant_code UNIQUE (code);


--
-- Name: users idx_user_email_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.users
  ADD CONSTRAINT idx_user_email_tenant UNIQUE (email, tenant_id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.interviews
  ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: job_board_postings job_board_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.job_board_postings
  ADD CONSTRAINT job_board_postings_pkey PRIMARY KEY (id);


--
-- Name: job_openings job_openings_job_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.job_openings
  ADD CONSTRAINT job_openings_job_code_key UNIQUE (job_code);


--
-- Name: job_openings job_openings_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.job_openings
  ADD CONSTRAINT job_openings_pkey PRIMARY KEY (id);


--
-- Name: keka_import_history keka_import_history_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.keka_import_history
  ADD CONSTRAINT keka_import_history_pkey PRIMARY KEY (id);


--
-- Name: key_results key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.key_results
  ADD CONSTRAINT key_results_pkey PRIMARY KEY (id);


--
-- Name: knowledge_attachments knowledge_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.knowledge_attachments
  ADD CONSTRAINT knowledge_attachments_pkey PRIMARY KEY (id);


--
-- Name: knowledge_searches knowledge_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.knowledge_searches
  ADD CONSTRAINT knowledge_searches_pkey PRIMARY KEY (id);


--
-- Name: knowledge_templates knowledge_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.knowledge_templates
  ADD CONSTRAINT knowledge_templates_pkey PRIMARY KEY (id);


--
-- Name: knowledge_templates knowledge_templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.knowledge_templates
  ADD CONSTRAINT knowledge_templates_slug_key UNIQUE (slug);


--
-- Name: knowledge_views knowledge_views_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.knowledge_views
  ADD CONSTRAINT knowledge_views_pkey PRIMARY KEY (id);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.leave_balances
  ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.leave_requests
  ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.leave_types
  ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: letter_templates letter_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.letter_templates
  ADD CONSTRAINT letter_templates_code_key UNIQUE (code);


--
-- Name: letter_templates letter_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.letter_templates
  ADD CONSTRAINT letter_templates_pkey PRIMARY KEY (id);


--
-- Name: lms_certificates lms_certificates_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_certificates
  ADD CONSTRAINT lms_certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: lms_certificates lms_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_certificates
  ADD CONSTRAINT lms_certificates_pkey PRIMARY KEY (id);


--
-- Name: lms_content_progress lms_content_progress_enrollment_id_content_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_content_progress
  ADD CONSTRAINT lms_content_progress_enrollment_id_content_id_tenant_id_key UNIQUE (enrollment_id, content_id, tenant_id);


--
-- Name: lms_content_progress lms_content_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_content_progress
  ADD CONSTRAINT lms_content_progress_pkey PRIMARY KEY (id);


--
-- Name: lms_course_enrollments lms_course_enrollments_course_id_employee_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_course_enrollments
  ADD CONSTRAINT lms_course_enrollments_course_id_employee_id_tenant_id_key UNIQUE (course_id, employee_id, tenant_id);


--
-- Name: lms_course_enrollments lms_course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_course_enrollments
  ADD CONSTRAINT lms_course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: lms_course_modules lms_course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_course_modules
  ADD CONSTRAINT lms_course_modules_pkey PRIMARY KEY (id);


--
-- Name: lms_courses lms_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_courses
  ADD CONSTRAINT lms_courses_pkey PRIMARY KEY (id);


--
-- Name: lms_learning_path_courses lms_learning_path_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_learning_path_courses
  ADD CONSTRAINT lms_learning_path_courses_pkey PRIMARY KEY (id);


--
-- Name: lms_learning_paths lms_learning_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_learning_paths
  ADD CONSTRAINT lms_learning_paths_pkey PRIMARY KEY (id);


--
-- Name: lms_module_contents lms_module_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_module_contents
  ADD CONSTRAINT lms_module_contents_pkey PRIMARY KEY (id);


--
-- Name: lms_quiz_attempts lms_quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_quiz_attempts
  ADD CONSTRAINT lms_quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: lms_quiz_questions lms_quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_quiz_questions
  ADD CONSTRAINT lms_quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: lms_quizzes lms_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_quizzes
  ADD CONSTRAINT lms_quizzes_pkey PRIMARY KEY (id);


--
-- Name: loan_repayments loan_repayments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.loan_repayments
  ADD CONSTRAINT loan_repayments_pkey PRIMARY KEY (id);


--
-- Name: meeting_action_items meeting_action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.meeting_action_items
  ADD CONSTRAINT meeting_action_items_pkey PRIMARY KEY (id);


--
-- Name: meeting_agenda_items meeting_agenda_items_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.meeting_agenda_items
  ADD CONSTRAINT meeting_agenda_items_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.milestones
  ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: monthly_statutory_contributions monthly_statutory_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.monthly_statutory_contributions
  ADD CONSTRAINT monthly_statutory_contributions_pkey PRIMARY KEY (id);


--
-- Name: multi_channel_notifications multi_channel_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.multi_channel_notifications
  ADD CONSTRAINT multi_channel_notifications_pkey PRIMARY KEY (id);


--
-- Name: notification_channel_configs notification_channel_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notification_channel_configs
  ADD CONSTRAINT notification_channel_configs_pkey PRIMARY KEY (id);


--
-- Name: notification_channel_configs notification_channel_configs_tenant_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notification_channel_configs
  ADD CONSTRAINT notification_channel_configs_tenant_id_channel_key UNIQUE (tenant_id, channel);


--
-- Name: notification_templates notification_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notification_templates
  ADD CONSTRAINT notification_templates_code_key UNIQUE (code);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notification_templates
  ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nu_applications nu_applications_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.nu_applications
  ADD CONSTRAINT nu_applications_code_key UNIQUE (code);


--
-- Name: nu_applications nu_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.nu_applications
  ADD CONSTRAINT nu_applications_pkey PRIMARY KEY (id);


--
-- Name: objectives objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.objectives
  ADD CONSTRAINT objectives_pkey PRIMARY KEY (id);


--
-- Name: office_locations office_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.office_locations
  ADD CONSTRAINT office_locations_pkey PRIMARY KEY (id);


--
-- Name: okr_check_ins okr_check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.okr_check_ins
  ADD CONSTRAINT okr_check_ins_pkey PRIMARY KEY (id);


--
-- Name: onboarding_checklist_templates onboarding_checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.onboarding_checklist_templates
  ADD CONSTRAINT onboarding_checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: onboarding_documents onboarding_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.onboarding_documents
  ADD CONSTRAINT onboarding_documents_pkey PRIMARY KEY (id);


--
-- Name: onboarding_processes onboarding_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.onboarding_processes
  ADD CONSTRAINT onboarding_processes_pkey PRIMARY KEY (id);


--
-- Name: onboarding_tasks onboarding_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.onboarding_tasks
  ADD CONSTRAINT onboarding_tasks_pkey PRIMARY KEY (id);


--
-- Name: onboarding_template_tasks onboarding_template_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.onboarding_template_tasks
  ADD CONSTRAINT onboarding_template_tasks_pkey PRIMARY KEY (id);


--
-- Name: one_on_one_meetings one_on_one_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.one_on_one_meetings
  ADD CONSTRAINT one_on_one_meetings_pkey PRIMARY KEY (id);


--
-- Name: organization_units organization_units_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.organization_units
  ADD CONSTRAINT organization_units_code_key UNIQUE (code);


--
-- Name: organization_units organization_units_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.organization_units
  ADD CONSTRAINT organization_units_pkey PRIMARY KEY (id);


--
-- Name: overtime_policies overtime_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_policies
  ADD CONSTRAINT overtime_policies_pkey PRIMARY KEY (id);


--
-- Name: overtime_rate_tiers overtime_rate_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_rate_tiers
  ADD CONSTRAINT overtime_rate_tiers_pkey PRIMARY KEY (id);


--
-- Name: overtime_records overtime_records_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_records
  ADD CONSTRAINT overtime_records_pkey PRIMARY KEY (id);


--
-- Name: overtime_requests overtime_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_requests
  ADD CONSTRAINT overtime_requests_pkey PRIMARY KEY (id);


--
-- Name: overtime_requests overtime_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_requests
  ADD CONSTRAINT overtime_requests_request_number_key UNIQUE (request_number);


--
-- Name: payment_batches payment_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_batches
  ADD CONSTRAINT payment_batches_pkey PRIMARY KEY (id);


--
-- Name: payment_configs payment_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_configs
  ADD CONSTRAINT payment_configs_config_key_key UNIQUE (config_key);


--
-- Name: payment_configs payment_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_configs
  ADD CONSTRAINT payment_configs_pkey PRIMARY KEY (id);


--
-- Name: payment_refunds payment_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_refunds
  ADD CONSTRAINT payment_refunds_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_transactions
  ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_webhooks payment_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payment_webhooks
  ADD CONSTRAINT payment_webhooks_pkey PRIMARY KEY (id);


--
-- Name: payroll_locations payroll_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payroll_locations
  ADD CONSTRAINT payroll_locations_pkey PRIMARY KEY (id);


--
-- Name: payroll_runs payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payroll_runs
  ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);


--
-- Name: payslips payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.payslips
  ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);


--
-- Name: peer_recognitions peer_recognitions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.peer_recognitions
  ADD CONSTRAINT peer_recognitions_pkey PRIMARY KEY (id);


--
-- Name: performance_improvement_plans performance_improvement_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.performance_improvement_plans
  ADD CONSTRAINT performance_improvement_plans_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.performance_reviews
  ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.permissions
  ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.permissions
  ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pip_check_ins pip_check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.pip_check_ins
  ADD CONSTRAINT pip_check_ins_pkey PRIMARY KEY (id);


--
-- Name: policy_acknowledgments policy_acknowledgments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.policy_acknowledgments
  ADD CONSTRAINT policy_acknowledgments_pkey PRIMARY KEY (id);


--
-- Name: policy_acknowledgments policy_acknowledgments_policy_id_employee_id_policy_version_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.policy_acknowledgments
  ADD CONSTRAINT policy_acknowledgments_policy_id_employee_id_policy_version_key UNIQUE (policy_id, employee_id, policy_version);


--
-- Name: poll_options poll_options_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_options
  ADD CONSTRAINT poll_options_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_votes
  ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_tenant_id_poll_option_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_votes
  ADD CONSTRAINT poll_votes_tenant_id_poll_option_id_employee_id_key UNIQUE (tenant_id, poll_option_id, employee_id);


--
-- Name: positions positions_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.positions
  ADD CONSTRAINT positions_code_key UNIQUE (code);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.positions
  ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_comments
  ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_reactions
  ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


--
-- Name: preboarding_candidates preboarding_candidates_access_token_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.preboarding_candidates
  ADD CONSTRAINT preboarding_candidates_access_token_key UNIQUE (access_token);


--
-- Name: preboarding_candidates preboarding_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.preboarding_candidates
  ADD CONSTRAINT preboarding_candidates_pkey PRIMARY KEY (id);


--
-- Name: probation_evaluations probation_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.probation_evaluations
  ADD CONSTRAINT probation_evaluations_pkey PRIMARY KEY (id);


--
-- Name: probation_periods probation_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.probation_periods
  ADD CONSTRAINT probation_periods_pkey PRIMARY KEY (id);


--
-- Name: professional_tax_slabs professional_tax_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.professional_tax_slabs
  ADD CONSTRAINT professional_tax_slabs_pkey PRIMARY KEY (id);


--
-- Name: profile_update_requests profile_update_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.profile_update_requests
  ADD CONSTRAINT profile_update_requests_pkey PRIMARY KEY (id);


--
-- Name: project_employees project_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.project_employees
  ADD CONSTRAINT project_employees_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.project_members
  ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_time_entries project_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.project_time_entries
  ADD CONSTRAINT project_time_entries_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.projects
  ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: provident_fund_configs provident_fund_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.provident_fund_configs
  ADD CONSTRAINT provident_fund_configs_pkey PRIMARY KEY (id);


--
-- Name: psa_invoices psa_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_invoices
  ADD CONSTRAINT psa_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: psa_invoices psa_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_invoices
  ADD CONSTRAINT psa_invoices_pkey PRIMARY KEY (id);


--
-- Name: psa_project_allocations psa_project_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_project_allocations
  ADD CONSTRAINT psa_project_allocations_pkey PRIMARY KEY (id);


--
-- Name: psa_projects psa_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_projects
  ADD CONSTRAINT psa_projects_pkey PRIMARY KEY (id);


--
-- Name: psa_projects psa_projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_projects
  ADD CONSTRAINT psa_projects_project_code_key UNIQUE (project_code);


--
-- Name: psa_time_entries psa_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_time_entries
  ADD CONSTRAINT psa_time_entries_pkey PRIMARY KEY (id);


--
-- Name: psa_timesheets psa_timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.psa_timesheets
  ADD CONSTRAINT psa_timesheets_pkey PRIMARY KEY (id);


--
-- Name: pulse_survey_answers pulse_survey_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.pulse_survey_answers
  ADD CONSTRAINT pulse_survey_answers_pkey PRIMARY KEY (id);


--
-- Name: pulse_survey_questions pulse_survey_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.pulse_survey_questions
  ADD CONSTRAINT pulse_survey_questions_pkey PRIMARY KEY (id);


--
-- Name: pulse_survey_responses pulse_survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.pulse_survey_responses
  ADD CONSTRAINT pulse_survey_responses_pkey PRIMARY KEY (id);


--
-- Name: pulse_surveys pulse_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.pulse_surveys
  ADD CONSTRAINT pulse_surveys_pkey PRIMARY KEY (id);


--
-- Name: recognition_badges recognition_badges_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.recognition_badges
  ADD CONSTRAINT recognition_badges_code_key UNIQUE (code);


--
-- Name: recognition_badges recognition_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.recognition_badges
  ADD CONSTRAINT recognition_badges_pkey PRIMARY KEY (id);


--
-- Name: recognition_reactions recognition_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.recognition_reactions
  ADD CONSTRAINT recognition_reactions_pkey PRIMARY KEY (id);


--
-- Name: recognition_reactions recognition_reactions_recognition_id_employee_id_reaction_t_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.recognition_reactions
  ADD CONSTRAINT recognition_reactions_recognition_id_employee_id_reaction_t_key UNIQUE (recognition_id, employee_id, reaction_type);


--
-- Name: recognitions recognitions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.recognitions
  ADD CONSTRAINT recognitions_pkey PRIMARY KEY (id);


--
-- Name: referral_policies referral_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.referral_policies
  ADD CONSTRAINT referral_policies_pkey PRIMARY KEY (id);


--
-- Name: report_definitions report_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.report_definitions
  ADD CONSTRAINT report_definitions_pkey PRIMARY KEY (id);


--
-- Name: report_definitions report_definitions_report_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.report_definitions
  ADD CONSTRAINT report_definitions_report_code_key UNIQUE (report_code);


--
-- Name: report_executions report_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.report_executions
  ADD CONSTRAINT report_executions_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.report_templates
  ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: resource_conflict_log resource_conflict_log_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.resource_conflict_log
  ADD CONSTRAINT resource_conflict_log_pkey PRIMARY KEY (id);


--
-- Name: resume_parsing_results resume_parsing_results_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.resume_parsing_results
  ADD CONSTRAINT resume_parsing_results_pkey PRIMARY KEY (id);


--
-- Name: review_competencies review_competencies_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.review_competencies
  ADD CONSTRAINT review_competencies_pkey PRIMARY KEY (id);


--
-- Name: review_cycles review_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.review_cycles
  ADD CONSTRAINT review_cycles_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.role_permissions
  ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.roles
  ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roster_entries roster_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.roster_entries
  ADD CONSTRAINT roster_entries_pkey PRIMARY KEY (id);


--
-- Name: rosters rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.rosters
  ADD CONSTRAINT rosters_pkey PRIMARY KEY (id);


--
-- Name: salary_revisions salary_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.salary_revisions
  ADD CONSTRAINT salary_revisions_pkey PRIMARY KEY (id);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.salary_structures
  ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: scheduled_reports scheduled_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.scheduled_reports
  ADD CONSTRAINT scheduled_reports_pkey PRIMARY KEY (id);


--
-- Name: sentiment_analysis sentiment_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.sentiment_analysis
  ADD CONSTRAINT sentiment_analysis_pkey PRIMARY KEY (id);


--
-- Name: shift_assignments shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.shift_assignments
  ADD CONSTRAINT shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: shift_swap_requests shift_swap_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.shift_swap_requests
  ADD CONSTRAINT shift_swap_requests_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.shifts
  ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: signature_approvals signature_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.signature_approvals
  ADD CONSTRAINT signature_approvals_pkey PRIMARY KEY (id);


--
-- Name: signature_requests signature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.signature_requests
  ADD CONSTRAINT signature_requests_pkey PRIMARY KEY (id);


--
-- Name: skill_gaps skill_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.skill_gaps
  ADD CONSTRAINT skill_gaps_pkey PRIMARY KEY (id);


--
-- Name: smart_recommendations smart_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.smart_recommendations
  ADD CONSTRAINT smart_recommendations_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.social_posts
  ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: step_executions step_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.step_executions
  ADD CONSTRAINT step_executions_pkey PRIMARY KEY (id);


--
-- Name: succession_candidates succession_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.succession_candidates
  ADD CONSTRAINT succession_candidates_pkey PRIMARY KEY (id);


--
-- Name: succession_candidates succession_candidates_succession_plan_id_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.succession_candidates
  ADD CONSTRAINT succession_candidates_succession_plan_id_candidate_id_key UNIQUE (succession_plan_id, candidate_id);


--
-- Name: succession_plans succession_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.succession_plans
  ADD CONSTRAINT succession_plans_pkey PRIMARY KEY (id);


--
-- Name: survey_answers survey_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_answers
  ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (id);


--
-- Name: survey_insights survey_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_insights
  ADD CONSTRAINT survey_insights_pkey PRIMARY KEY (id);


--
-- Name: survey_questions survey_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_questions
  ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_responses
  ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


--
-- Name: surveys surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.surveys
  ADD CONSTRAINT surveys_pkey PRIMARY KEY (id);


--
-- Name: talent_pool_members talent_pool_members_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.talent_pool_members
  ADD CONSTRAINT talent_pool_members_pkey PRIMARY KEY (id);


--
-- Name: talent_pool_members talent_pool_members_talent_pool_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.talent_pool_members
  ADD CONSTRAINT talent_pool_members_talent_pool_id_employee_id_key UNIQUE (talent_pool_id, employee_id);


--
-- Name: talent_pools talent_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.talent_pools
  ADD CONSTRAINT talent_pools_pkey PRIMARY KEY (id);


--
-- Name: tax_declarations tax_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tax_declarations
  ADD CONSTRAINT tax_declarations_pkey PRIMARY KEY (id);


--
-- Name: tax_proofs tax_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tax_proofs
  ADD CONSTRAINT tax_proofs_pkey PRIMARY KEY (id);


--
-- Name: tax_regime_comparisons tax_regime_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tax_regime_comparisons
  ADD CONSTRAINT tax_regime_comparisons_pkey PRIMARY KEY (id);


--
-- Name: tds_slabs tds_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tds_slabs
  ADD CONSTRAINT tds_slabs_pkey PRIMARY KEY (id);


--
-- Name: template_instantiations template_instantiations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.template_instantiations
  ADD CONSTRAINT template_instantiations_pkey PRIMARY KEY (id);


--
-- Name: tenant_applications tenant_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tenant_applications
  ADD CONSTRAINT tenant_applications_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_code_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tenants
  ADD CONSTRAINT tenants_code_key UNIQUE (code);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tenants
  ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: ticket_categories ticket_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.ticket_categories
  ADD CONSTRAINT ticket_categories_pkey PRIMARY KEY (id);


--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.ticket_comments
  ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: ticket_escalations ticket_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.ticket_escalations
  ADD CONSTRAINT ticket_escalations_pkey PRIMARY KEY (id);


--
-- Name: ticket_metrics ticket_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.ticket_metrics
  ADD CONSTRAINT ticket_metrics_pkey PRIMARY KEY (id);


--
-- Name: ticket_metrics ticket_metrics_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.ticket_metrics
  ADD CONSTRAINT ticket_metrics_ticket_id_key UNIQUE (ticket_id);


--
-- Name: ticket_slas ticket_slas_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.ticket_slas
  ADD CONSTRAINT ticket_slas_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tickets
  ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.time_entries
  ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: training_enrollments training_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.training_enrollments
  ADD CONSTRAINT training_enrollments_pkey PRIMARY KEY (id);


--
-- Name: training_programs training_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.training_programs
  ADD CONSTRAINT training_programs_pkey PRIMARY KEY (id);


--
-- Name: travel_expenses travel_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.travel_expenses
  ADD CONSTRAINT travel_expenses_pkey PRIMARY KEY (id);


--
-- Name: travel_requests travel_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.travel_requests
  ADD CONSTRAINT travel_requests_pkey PRIMARY KEY (id);


--
-- Name: travel_requests travel_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.travel_requests
  ADD CONSTRAINT travel_requests_request_number_key UNIQUE (request_number);


--
-- Name: lms_course_enrollments uk1rqwtso82af2tlrmei6xgepmp; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_course_enrollments
  ADD CONSTRAINT uk1rqwtso82af2tlrmei6xgepmp UNIQUE (course_id, employee_id, tenant_id);


--
-- Name: notification_channel_configs uk20pi4lsgeqny8al9et1yjkb3u; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notification_channel_configs
  ADD CONSTRAINT uk20pi4lsgeqny8al9et1yjkb3u UNIQUE (tenant_id, channel);


--
-- Name: announcement_reads uk_announcement_read; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.announcement_reads
  ADD CONSTRAINT uk_announcement_read UNIQUE (announcement_id, employee_id, tenant_id);


--
-- Name: app_roles uk_app_role_code_tenant_app; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_roles
  ADD CONSTRAINT uk_app_role_code_tenant_app UNIQUE (code, tenant_id, application_id);


--
-- Name: candidates uk_candidate_tenant_code; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.candidates
  ADD CONSTRAINT uk_candidate_tenant_code UNIQUE (tenant_id, candidate_code);


--
-- Name: content_views uk_content_view_unique; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.content_views
  ADD CONSTRAINT uk_content_view_unique UNIQUE (tenant_id, content_type, content_id, employee_id);


--
-- Name: custom_scope_targets uk_custom_scope_target; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_scope_targets
  ADD CONSTRAINT uk_custom_scope_target UNIQUE (role_permission_id, target_type, target_id);


--
-- Name: employee_loans uk_employee_loan_tenant_number; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_loans
  ADD CONSTRAINT uk_employee_loan_tenant_number UNIQUE (tenant_id, loan_number);


--
-- Name: expense_claims uk_expense_claim_tenant_number; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.expense_claims
  ADD CONSTRAINT uk_expense_claim_tenant_number UNIQUE (tenant_id, claim_number);


--
-- Name: user_basic_notification_preferences uk_notification_prefs_user_tenant; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_basic_notification_preferences
  ADD CONSTRAINT uk_notification_prefs_user_tenant UNIQUE (user_id, tenant_id);


--
-- Name: pulse_survey_responses uk_psr_survey_employee; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.pulse_survey_responses
  ADD CONSTRAINT uk_psr_survey_employee UNIQUE (survey_id, employee_id);


--
-- Name: tenant_applications uk_tenant_app; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tenant_applications
  ADD CONSTRAINT uk_tenant_app UNIQUE (tenant_id, application_id);


--
-- Name: tickets uk_ticket_tenant_number; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tickets
  ADD CONSTRAINT uk_ticket_tenant_number UNIQUE (tenant_id, ticket_number);


--
-- Name: user_app_access uk_user_app_access; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_access
  ADD CONSTRAINT uk_user_app_access UNIQUE (user_id, application_id);


--
-- Name: poll_votes ukbphyc8fp7rtshnbibtis2hgy6; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_votes
  ADD CONSTRAINT ukbphyc8fp7rtshnbibtis2hgy6 UNIQUE (tenant_id, poll_option_id, employee_id);


--
-- Name: recognition_reactions ukcrhfqwid1xuff56bm1v749e1p; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.recognition_reactions
  ADD CONSTRAINT ukcrhfqwid1xuff56bm1v749e1p UNIQUE (recognition_id, employee_id, reaction_type);


--
-- Name: user_notification_preferences uki26v90xjwd55v1rtv5tqxqx45; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_notification_preferences
  ADD CONSTRAINT uki26v90xjwd55v1rtv5tqxqx45 UNIQUE (user_id, category);


--
-- Name: employee_points ukmyb3bcr8tuk5bqnv8un2p6rrk; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_points
  ADD CONSTRAINT ukmyb3bcr8tuk5bqnv8un2p6rrk UNIQUE (employee_id, tenant_id);


--
-- Name: talent_pool_members ukpmrhs1pk6eruwvpi4odma85hh; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.talent_pool_members
  ADD CONSTRAINT ukpmrhs1pk6eruwvpi4odma85hh UNIQUE (talent_pool_id, employee_id);


--
-- Name: lms_content_progress uks6cspk6s2n8dbgbrt0x4wuvv; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_content_progress
  ADD CONSTRAINT uks6cspk6s2n8dbgbrt0x4wuvv UNIQUE (enrollment_id, content_id, tenant_id);


--
-- Name: policy_acknowledgments uksbrfgfmnlkgfn1b1maq63lmht; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.policy_acknowledgments
  ADD CONSTRAINT uksbrfgfmnlkgfn1b1maq63lmht UNIQUE (policy_id, employee_id, policy_version);


--
-- Name: succession_candidates ukthcbebfpjvd40tssly76sy14; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.succession_candidates
  ADD CONSTRAINT ukthcbebfpjvd40tssly76sy14 UNIQUE (succession_plan_id, candidate_id);


--
-- Name: feature_flags uktj3woxgbuy3yfxjgm6xo0s28g; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.feature_flags
  ADD CONSTRAINT uktj3woxgbuy3yfxjgm6xo0s28g UNIQUE (tenant_id, feature_key);


--
-- Name: user_app_access user_app_access_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_access
  ADD CONSTRAINT user_app_access_pkey PRIMARY KEY (id);


--
-- Name: user_app_direct_permissions user_app_direct_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_direct_permissions
  ADD CONSTRAINT user_app_direct_permissions_pkey PRIMARY KEY (permission_id, user_app_access_id);


--
-- Name: user_app_roles user_app_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_roles
  ADD CONSTRAINT user_app_roles_pkey PRIMARY KEY (role_id, user_app_access_id);


--
-- Name: user_basic_notification_preferences user_basic_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_basic_notification_preferences
  ADD CONSTRAINT user_basic_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_notification_preferences
  ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_category_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_notification_preferences
  ADD CONSTRAINT user_notification_preferences_user_id_category_key UNIQUE (user_id, category);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_roles
  ADD CONSTRAINT user_roles_pkey PRIMARY KEY (role_id, user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_checks verification_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.verification_checks
  ADD CONSTRAINT verification_checks_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.webhooks
  ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: wellness_challenges wellness_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wellness_challenges
  ADD CONSTRAINT wellness_challenges_pkey PRIMARY KEY (id);


--
-- Name: wellness_points wellness_points_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wellness_points
  ADD CONSTRAINT wellness_points_pkey PRIMARY KEY (id);


--
-- Name: wellness_points_transactions wellness_points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wellness_points_transactions
  ADD CONSTRAINT wellness_points_transactions_pkey PRIMARY KEY (id);


--
-- Name: wellness_programs wellness_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wellness_programs
  ADD CONSTRAINT wellness_programs_pkey PRIMARY KEY (id);


--
-- Name: wiki_page_approval_tasks wiki_page_approval_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_approval_tasks
  ADD CONSTRAINT wiki_page_approval_tasks_pkey PRIMARY KEY (id);


--
-- Name: wiki_page_comments wiki_page_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_comments
  ADD CONSTRAINT wiki_page_comments_pkey PRIMARY KEY (id);


--
-- Name: wiki_page_versions wiki_page_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_versions
  ADD CONSTRAINT wiki_page_versions_pkey PRIMARY KEY (id);


--
-- Name: wiki_page_watches wiki_page_watches_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_watches
  ADD CONSTRAINT wiki_page_watches_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_pages
  ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (id);


--
-- Name: wiki_spaces wiki_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_spaces
  ADD CONSTRAINT wiki_spaces_pkey PRIMARY KEY (id);


--
-- Name: wiki_spaces wiki_spaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_spaces
  ADD CONSTRAINT wiki_spaces_slug_key UNIQUE (slug);


--
-- Name: workflow_definitions workflow_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.workflow_definitions
  ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);


--
-- Name: workflow_executions workflow_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.workflow_executions
  ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);


--
-- Name: workflow_executions workflow_executions_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.workflow_executions
  ADD CONSTRAINT workflow_executions_reference_number_key UNIQUE (reference_number);


--
-- Name: workflow_rules workflow_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.workflow_rules
  ADD CONSTRAINT workflow_rules_pkey PRIMARY KEY (id);


--
-- Name: workforce_trends workforce_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.workforce_trends
  ADD CONSTRAINT workforce_trends_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX flyway_schema_history_s_idx ON pm.flyway_schema_history USING btree (success);


--
-- Name: idx_pm_comment_author; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_comment_author ON pm.project_comments USING btree (author_id);


--
-- Name: idx_pm_comment_parent; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_comment_parent ON pm.project_comments USING btree (parent_comment_id);


--
-- Name: idx_pm_comment_project; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_comment_project ON pm.project_comments USING btree (project_id);


--
-- Name: idx_pm_comment_task; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_comment_task ON pm.project_comments USING btree (task_id);


--
-- Name: idx_pm_comment_tenant; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_comment_tenant ON pm.project_comments USING btree (tenant_id);


--
-- Name: idx_pm_member_project; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_member_project ON pm.project_members USING btree (project_id);


--
-- Name: idx_pm_member_tenant; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_member_tenant ON pm.project_members USING btree (tenant_id);


--
-- Name: idx_pm_member_user; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_member_user ON pm.project_members USING btree (user_id);


--
-- Name: idx_pm_milestone_due_date; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_milestone_due_date ON pm.project_milestones USING btree (due_date);


--
-- Name: idx_pm_milestone_project; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_milestone_project ON pm.project_milestones USING btree (project_id);


--
-- Name: idx_pm_milestone_status; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_milestone_status ON pm.project_milestones USING btree (status);


--
-- Name: idx_pm_milestone_tenant; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_milestone_tenant ON pm.project_milestones USING btree (tenant_id);


--
-- Name: idx_pm_project_owner; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_project_owner ON pm.projects USING btree (owner_id);


--
-- Name: idx_pm_project_status; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_project_status ON pm.projects USING btree (status);


--
-- Name: idx_pm_project_tenant; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_project_tenant ON pm.projects USING btree (tenant_id);


--
-- Name: idx_pm_task_assignee; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_task_assignee ON pm.project_tasks USING btree (assignee_id);


--
-- Name: idx_pm_task_milestone; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_task_milestone ON pm.project_tasks USING btree (milestone_id);


--
-- Name: idx_pm_task_parent; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_task_parent ON pm.project_tasks USING btree (parent_task_id);


--
-- Name: idx_pm_task_project; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_task_project ON pm.project_tasks USING btree (project_id);


--
-- Name: idx_pm_task_status; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_task_status ON pm.project_tasks USING btree (status);


--
-- Name: idx_pm_task_tenant; Type: INDEX; Schema: pm; Owner: hrms
--

CREATE INDEX idx_pm_task_tenant ON pm.project_tasks USING btree (tenant_id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_action_assignee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_action_assignee ON public.meeting_action_items USING btree (assignee_id);


--
-- Name: idx_action_due_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_action_due_date ON public.meeting_action_items USING btree (due_date);


--
-- Name: idx_action_meeting; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_action_meeting ON public.meeting_action_items USING btree (meeting_id);


--
-- Name: idx_action_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_action_status ON public.meeting_action_items USING btree (status);


--
-- Name: idx_agenda_meeting; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_agenda_meeting ON public.meeting_agenda_items USING btree (meeting_id);


--
-- Name: idx_agenda_order; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_agenda_order ON public.meeting_agenda_items USING btree (meeting_id, item_order);


--
-- Name: idx_ann_read_announcement; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ann_read_announcement ON public.announcement_reads USING btree (announcement_id);


--
-- Name: idx_ann_read_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ann_read_employee ON public.announcement_reads USING btree (employee_id);


--
-- Name: idx_announcement_pinned; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_announcement_pinned ON public.announcements USING btree (is_pinned);


--
-- Name: idx_announcement_published; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_announcement_published ON public.announcements USING btree (published_at);


--
-- Name: idx_announcement_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_announcement_status ON public.announcements USING btree (status);


--
-- Name: idx_announcement_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_announcement_tenant ON public.announcements USING btree (tenant_id);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_api_keys_tenant ON public.api_keys USING btree (tenant_id);


--
-- Name: idx_app_perm_action; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_perm_action ON public.app_permissions USING btree (action);


--
-- Name: idx_app_perm_app; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_perm_app ON public.app_permissions USING btree (application_id);


--
-- Name: idx_app_perm_module; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_perm_module ON public.app_permissions USING btree (module);


--
-- Name: idx_app_role_app; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_role_app ON public.app_roles USING btree (application_id);


--
-- Name: idx_app_role_code; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_role_code ON public.app_roles USING btree (code);


--
-- Name: idx_app_role_perm_perm; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_role_perm_perm ON public.app_role_permissions USING btree (permission_id);


--
-- Name: idx_app_role_perm_role; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_role_perm_role ON public.app_role_permissions USING btree (role_id);


--
-- Name: idx_app_role_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_app_role_tenant ON public.app_roles USING btree (tenant_id);


--
-- Name: idx_applicants_tenant_candidate; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_applicants_tenant_candidate ON public.applicants USING btree (tenant_id, candidate_id);


--
-- Name: idx_applicants_tenant_job; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_applicants_tenant_job ON public.applicants USING btree (tenant_id, job_opening_id);


--
-- Name: idx_applicants_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_applicants_tenant_status ON public.applicants USING btree (tenant_id, status);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_attendance_date ON public.attendance_records USING btree (attendance_date);


--
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_attendance_employee_id ON public.attendance_records USING btree (employee_id);


--
-- Name: idx_attendance_reg_config_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_attendance_reg_config_tenant ON public.attendance_regularization_config USING btree (tenant_id);


--
-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_attendance_status ON public.attendance_records USING btree (status);


--
-- Name: idx_attendance_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_attendance_tenant_id ON public.attendance_records USING btree (tenant_id);


--
-- Name: idx_audit_actor; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_audit_tenant ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_timestamp; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_audit_timestamp ON public.audit_logs USING btree (created_at);


--
-- Name: idx_blog_categories_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_categories_tenant ON public.blog_categories USING btree (tenant_id);


--
-- Name: idx_blog_comments_is_approved; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_comments_is_approved ON public.blog_comments USING btree (is_approved);


--
-- Name: idx_blog_comments_parent; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_comments_parent ON public.blog_comments USING btree (parent_comment_id);


--
-- Name: idx_blog_comments_post; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_comments_post ON public.blog_comments USING btree (post_id);


--
-- Name: idx_blog_comments_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_comments_tenant ON public.blog_comments USING btree (tenant_id);


--
-- Name: idx_blog_likes_post; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_likes_post ON public.blog_likes USING btree (post_id);


--
-- Name: idx_blog_likes_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_likes_tenant ON public.blog_likes USING btree (tenant_id);


--
-- Name: idx_blog_likes_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_likes_user ON public.blog_likes USING btree (user_id);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category_id);


--
-- Name: idx_blog_posts_featured; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_featured ON public.blog_posts USING btree (is_featured);


--
-- Name: idx_blog_posts_published; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_published ON public.blog_posts USING btree (published_at);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);


--
-- Name: idx_blog_posts_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_tenant ON public.blog_posts USING btree (tenant_id);


--
-- Name: idx_blog_posts_visibility; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_blog_posts_visibility ON public.blog_posts USING btree (visibility);


--
-- Name: idx_candidate_applied_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_applied_date ON public.candidates USING btree (applied_date);


--
-- Name: idx_candidate_email; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_email ON public.candidates USING btree (email);


--
-- Name: idx_candidate_recruiter; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_recruiter ON public.candidates USING btree (assigned_recruiter_id);


--
-- Name: idx_candidate_source; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_source ON public.candidates USING btree (source);


--
-- Name: idx_candidate_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_tenant ON public.candidates USING btree (tenant_id);


--
-- Name: idx_candidate_tenant_job; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_tenant_job ON public.candidates USING btree (tenant_id, job_opening_id);


--
-- Name: idx_candidate_tenant_stage; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_tenant_stage ON public.candidates USING btree (tenant_id, current_stage);


--
-- Name: idx_candidate_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_candidate_tenant_status ON public.candidates USING btree (tenant_id, status);


--
-- Name: idx_category_dept; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_category_dept ON public.ticket_categories USING btree (department_type);


--
-- Name: idx_category_parent; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_category_parent ON public.ticket_categories USING btree (parent_category_id);


--
-- Name: idx_category_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_category_tenant ON public.ticket_categories USING btree (tenant_id);


--
-- Name: idx_cfd_active; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfd_active ON public.custom_field_definitions USING btree (is_active);


--
-- Name: idx_cfd_entity_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfd_entity_type ON public.custom_field_definitions USING btree (entity_type);


--
-- Name: idx_cfd_group; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfd_group ON public.custom_field_definitions USING btree (field_group);


--
-- Name: idx_cfd_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfd_tenant ON public.custom_field_definitions USING btree (tenant_id);


--
-- Name: idx_cfv_definition; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfv_definition ON public.custom_field_values USING btree (field_definition_id);


--
-- Name: idx_cfv_entity; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfv_entity ON public.custom_field_values USING btree (entity_type, entity_id);


--
-- Name: idx_cfv_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_cfv_tenant ON public.custom_field_values USING btree (tenant_id);


--
-- Name: idx_comp_cycle_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_comp_cycle_status ON public.compensation_review_cycles USING btree (status);


--
-- Name: idx_comp_cycle_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_comp_cycle_tenant ON public.compensation_review_cycles USING btree (tenant_id);


--
-- Name: idx_comp_cycle_year; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_comp_cycle_year ON public.compensation_review_cycles USING btree (fiscal_year);


--
-- Name: idx_compliance_audit_entity; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_compliance_audit_entity ON public.compliance_audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_compliance_audit_timestamp; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_compliance_audit_timestamp ON public.compliance_audit_logs USING btree ("timestamp");


--
-- Name: idx_compliance_audit_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_compliance_audit_user ON public.compliance_audit_logs USING btree (performed_by);


--
-- Name: idx_content_view_content; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_content_view_content ON public.content_views USING btree (tenant_id, content_type, content_id);


--
-- Name: idx_content_view_created; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_content_view_created ON public.content_views USING btree (tenant_id, created_at);


--
-- Name: idx_content_view_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_content_view_employee ON public.content_views USING btree (tenant_id, employee_id);


--
-- Name: idx_contract_reminders_contract_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_reminders_contract_id ON public.contract_reminders USING btree (contract_id);


--
-- Name: idx_contract_reminders_is_completed; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_reminders_is_completed ON public.contract_reminders USING btree (is_completed);


--
-- Name: idx_contract_reminders_reminder_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_reminders_reminder_date ON public.contract_reminders USING btree (reminder_date);


--
-- Name: idx_contract_reminders_reminder_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_reminders_reminder_type ON public.contract_reminders USING btree (reminder_type);


--
-- Name: idx_contract_reminders_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_reminders_tenant_id ON public.contract_reminders USING btree (tenant_id);


--
-- Name: idx_contract_signatures_contract_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_signatures_contract_id ON public.contract_signatures USING btree (contract_id);


--
-- Name: idx_contract_signatures_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_signatures_created_at ON public.contract_signatures USING btree (created_at);


--
-- Name: idx_contract_signatures_signer_email; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_signatures_signer_email ON public.contract_signatures USING btree (signer_email);


--
-- Name: idx_contract_signatures_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_signatures_status ON public.contract_signatures USING btree (status);


--
-- Name: idx_contract_templates_is_active; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_templates_is_active ON public.contract_templates USING btree (is_active);


--
-- Name: idx_contract_templates_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_templates_tenant_id ON public.contract_templates USING btree (tenant_id);


--
-- Name: idx_contract_templates_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_templates_type ON public.contract_templates USING btree (type);


--
-- Name: idx_contract_versions_contract_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_versions_contract_id ON public.contract_versions USING btree (contract_id);


--
-- Name: idx_contract_versions_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contract_versions_created_at ON public.contract_versions USING btree (created_at);


--
-- Name: idx_contracts_employee_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contracts_employee_id ON public.contracts USING btree (employee_id);


--
-- Name: idx_contracts_end_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contracts_end_date ON public.contracts USING btree (end_date);


--
-- Name: idx_contracts_start_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contracts_start_date ON public.contracts USING btree (start_date);


--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- Name: idx_contracts_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contracts_tenant_id ON public.contracts USING btree (tenant_id);


--
-- Name: idx_contracts_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_contracts_type ON public.contracts USING btree (type);


--
-- Name: idx_custom_scope_target_role_permission; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_custom_scope_target_role_permission ON public.custom_scope_targets USING btree (role_permission_id);


--
-- Name: idx_custom_scope_target_type_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_custom_scope_target_type_id ON public.custom_scope_targets USING btree (target_type, target_id);


--
-- Name: idx_delivery_created; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_delivery_created ON public.webhook_deliveries USING btree (created_at);


--
-- Name: idx_delivery_event; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_delivery_event ON public.webhook_deliveries USING btree (event_type);


--
-- Name: idx_delivery_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_delivery_status ON public.webhook_deliveries USING btree (status);


--
-- Name: idx_delivery_webhook; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_delivery_webhook ON public.webhook_deliveries USING btree (webhook_id);


--
-- Name: idx_department_parent; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_department_parent ON public.departments USING btree (parent_department_id);


--
-- Name: idx_department_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_department_tenant ON public.departments USING btree (tenant_id);


--
-- Name: idx_doc_access_department; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_access_department ON public.document_access USING btree (department_id);


--
-- Name: idx_doc_access_document; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_access_document ON public.document_access USING btree (document_id);


--
-- Name: idx_doc_access_level; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_access_level ON public.document_access USING btree (tenant_id, access_level);


--
-- Name: idx_doc_access_role; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_access_role ON public.document_access USING btree (role_id);


--
-- Name: idx_doc_access_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_access_tenant ON public.document_access USING btree (tenant_id);


--
-- Name: idx_doc_access_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_access_user ON public.document_access USING btree (user_id);


--
-- Name: idx_doc_approval_task_approver; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_task_approver ON public.document_approval_tasks USING btree (approver_id);


--
-- Name: idx_doc_approval_task_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_task_status ON public.document_approval_tasks USING btree (tenant_id, status);


--
-- Name: idx_doc_approval_task_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_task_tenant ON public.document_approval_tasks USING btree (tenant_id);


--
-- Name: idx_doc_approval_task_workflow; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_task_workflow ON public.document_approval_tasks USING btree (workflow_id);


--
-- Name: idx_doc_approval_workflow_approver; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_workflow_approver ON public.document_approval_workflows USING btree (current_approver_id);


--
-- Name: idx_doc_approval_workflow_document; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_workflow_document ON public.document_approval_workflows USING btree (document_id);


--
-- Name: idx_doc_approval_workflow_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_workflow_status ON public.document_approval_workflows USING btree (tenant_id, status);


--
-- Name: idx_doc_approval_workflow_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_approval_workflow_tenant ON public.document_approval_workflows USING btree (tenant_id);


--
-- Name: idx_doc_expiry_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_expiry_date ON public.document_expiry_tracking USING btree (tenant_id, expiry_date);


--
-- Name: idx_doc_expiry_document; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_expiry_document ON public.document_expiry_tracking USING btree (document_id);


--
-- Name: idx_doc_expiry_notified; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_expiry_notified ON public.document_expiry_tracking USING btree (tenant_id, is_notified);


--
-- Name: idx_doc_expiry_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_doc_expiry_tenant ON public.document_expiry_tracking USING btree (tenant_id);


--
-- Name: idx_email_recipient; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_email_recipient ON public.email_notifications USING btree (recipient_email);


--
-- Name: idx_email_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_email_status ON public.email_notifications USING btree (status);


--
-- Name: idx_email_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_email_tenant ON public.email_notifications USING btree (tenant_id);


--
-- Name: idx_emp_skill_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_emp_skill_employee ON public.employee_skills USING btree (employee_id);


--
-- Name: idx_emp_skill_name; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_emp_skill_name ON public.employee_skills USING btree (skill_name);


--
-- Name: idx_emp_skill_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_emp_skill_tenant ON public.employee_skills USING btree (tenant_id);


--
-- Name: idx_employee_department; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_department ON public.employees USING btree (department_id);


--
-- Name: idx_employee_dotted_mgr1; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_dotted_mgr1 ON public.employees USING btree (dotted_line_manager1id);


--
-- Name: idx_employee_dotted_mgr2; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_dotted_mgr2 ON public.employees USING btree (dotted_line_manager2id);


--
-- Name: idx_employee_loan_disbursement_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_loan_disbursement_date ON public.employee_loans USING btree (disbursement_date);


--
-- Name: idx_employee_loan_loan_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_loan_loan_type ON public.employee_loans USING btree (loan_type);


--
-- Name: idx_employee_loan_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_loan_status ON public.employee_loans USING btree (status);


--
-- Name: idx_employee_loan_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_loan_tenant ON public.employee_loans USING btree (tenant_id);


--
-- Name: idx_employee_loan_tenant_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_loan_tenant_employee ON public.employee_loans USING btree (tenant_id, employee_id);


--
-- Name: idx_employee_loan_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_loan_tenant_status ON public.employee_loans USING btree (tenant_id, status);


--
-- Name: idx_employee_manager; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_manager ON public.employees USING btree (manager_id);


--
-- Name: idx_employee_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_status ON public.employees USING btree (status);


--
-- Name: idx_employee_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_employee_tenant ON public.employees USING btree (tenant_id);


--
-- Name: idx_escalation_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_escalation_tenant ON public.ticket_escalations USING btree (tenant_id);


--
-- Name: idx_escalation_ticket; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_escalation_ticket ON public.ticket_escalations USING btree (ticket_id);


--
-- Name: idx_expense_claim_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_category ON public.expense_claims USING btree (category);


--
-- Name: idx_expense_claim_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_date ON public.expense_claims USING btree (claim_date);


--
-- Name: idx_expense_claim_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_status ON public.expense_claims USING btree (status);


--
-- Name: idx_expense_claim_submitted_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_submitted_at ON public.expense_claims USING btree (submitted_at);


--
-- Name: idx_expense_claim_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_tenant ON public.expense_claims USING btree (tenant_id);


--
-- Name: idx_expense_claim_tenant_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_tenant_employee ON public.expense_claims USING btree (tenant_id, employee_id);


--
-- Name: idx_expense_claim_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_expense_claim_tenant_status ON public.expense_claims USING btree (tenant_id, status);


--
-- Name: idx_f360_cycle_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_cycle_status ON public.feedback_360_cycles USING btree (status);


--
-- Name: idx_f360_cycle_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_cycle_tenant ON public.feedback_360_cycles USING btree (tenant_id);


--
-- Name: idx_f360_req_cycle; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_req_cycle ON public.feedback_360_requests USING btree (cycle_id);


--
-- Name: idx_f360_req_reviewer; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_req_reviewer ON public.feedback_360_requests USING btree (reviewer_id);


--
-- Name: idx_f360_req_subject; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_req_subject ON public.feedback_360_requests USING btree (subject_employee_id);


--
-- Name: idx_f360_req_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_req_tenant ON public.feedback_360_requests USING btree (tenant_id);


--
-- Name: idx_f360_resp_request; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_resp_request ON public.feedback_360_responses USING btree (request_id);


--
-- Name: idx_f360_resp_subject; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_resp_subject ON public.feedback_360_responses USING btree (subject_employee_id);


--
-- Name: idx_f360_resp_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_resp_tenant ON public.feedback_360_responses USING btree (tenant_id);


--
-- Name: idx_f360_sum_cycle; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_sum_cycle ON public.feedback_360_summaries USING btree (cycle_id);


--
-- Name: idx_f360_sum_subject; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_sum_subject ON public.feedback_360_summaries USING btree (subject_employee_id);


--
-- Name: idx_f360_sum_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_f360_sum_tenant ON public.feedback_360_summaries USING btree (tenant_id);


--
-- Name: idx_file_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_file_category ON public.file_metadata USING btree (category);


--
-- Name: idx_file_entity; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_file_entity ON public.file_metadata USING btree (entity_type, entity_id);


--
-- Name: idx_file_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_file_tenant ON public.file_metadata USING btree (tenant_id);


--
-- Name: idx_holidays_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_holidays_date ON public.holidays USING btree (holiday_date);


--
-- Name: idx_holidays_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_holidays_tenant_id ON public.holidays USING btree (tenant_id);


--
-- Name: idx_holidays_year; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_holidays_year ON public.holidays USING btree (year);


--
-- Name: idx_keka_import_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_keka_import_status ON public.keka_import_history USING btree (status);


--
-- Name: idx_keka_import_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_keka_import_tenant ON public.keka_import_history USING btree (tenant_id);


--
-- Name: idx_keka_import_uploaded_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_keka_import_uploaded_at ON public.keka_import_history USING btree (uploaded_at);


--
-- Name: idx_keka_import_uploaded_by; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_keka_import_uploaded_by ON public.keka_import_history USING btree (uploaded_by);


--
-- Name: idx_knowledge_attachments_content; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_attachments_content ON public.knowledge_attachments USING btree (content_type, content_id);


--
-- Name: idx_knowledge_attachments_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_attachments_tenant ON public.knowledge_attachments USING btree (tenant_id);


--
-- Name: idx_knowledge_searches_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_searches_created_at ON public.knowledge_searches USING btree (created_at);


--
-- Name: idx_knowledge_searches_query; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_searches_query ON public.knowledge_searches USING btree (query);


--
-- Name: idx_knowledge_searches_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_searches_tenant ON public.knowledge_searches USING btree (tenant_id);


--
-- Name: idx_knowledge_templates_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_templates_category ON public.knowledge_templates USING btree (category);


--
-- Name: idx_knowledge_templates_is_active; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_templates_is_active ON public.knowledge_templates USING btree (is_active);


--
-- Name: idx_knowledge_templates_is_featured; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_templates_is_featured ON public.knowledge_templates USING btree (is_featured);


--
-- Name: idx_knowledge_templates_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_templates_tenant ON public.knowledge_templates USING btree (tenant_id);


--
-- Name: idx_knowledge_views_content; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_views_content ON public.knowledge_views USING btree (content_type, content_id);


--
-- Name: idx_knowledge_views_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_views_created_at ON public.knowledge_views USING btree (created_at);


--
-- Name: idx_knowledge_views_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_views_tenant ON public.knowledge_views USING btree (tenant_id);


--
-- Name: idx_knowledge_views_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_knowledge_views_user ON public.knowledge_views USING btree (user_id);


--
-- Name: idx_kr_objective; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_kr_objective ON public.key_results USING btree (objective_id);


--
-- Name: idx_kr_owner; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_kr_owner ON public.key_results USING btree (owner_id);


--
-- Name: idx_kr_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_kr_tenant ON public.key_results USING btree (tenant_id);


--
-- Name: idx_leave_balances_employee_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_balances_employee_id ON public.leave_balances USING btree (employee_id);


--
-- Name: idx_leave_balances_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_balances_tenant_id ON public.leave_balances USING btree (tenant_id);


--
-- Name: idx_leave_balances_year; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_balances_year ON public.leave_balances USING btree (year);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_requests_employee_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_requests_employee_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_employee_status ON public.leave_requests USING btree (employee_id, status);


--
-- Name: idx_leave_requests_leave_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_leave_type ON public.leave_requests USING btree (leave_type_id);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_leave_requests_tenant_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_tenant_employee ON public.leave_requests USING btree (tenant_id, employee_id);


--
-- Name: idx_leave_requests_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_requests_tenant_id ON public.leave_requests USING btree (tenant_id);


--
-- Name: idx_leave_types_active; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_types_active ON public.leave_types USING btree (is_active);


--
-- Name: idx_leave_types_tenant_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_leave_types_tenant_id ON public.leave_types USING btree (tenant_id);


--
-- Name: idx_lms_attempt_enrollment; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_attempt_enrollment ON public.lms_quiz_attempts USING btree (enrollment_id);


--
-- Name: idx_lms_attempt_quiz_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_attempt_quiz_employee ON public.lms_quiz_attempts USING btree (quiz_id, employee_id);


--
-- Name: idx_lms_attempt_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_attempt_status ON public.lms_quiz_attempts USING btree (status);


--
-- Name: idx_lms_attempt_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_attempt_tenant ON public.lms_quiz_attempts USING btree (tenant_id);


--
-- Name: idx_lms_cert_course; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_cert_course ON public.lms_certificates USING btree (course_id);


--
-- Name: idx_lms_cert_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_cert_employee ON public.lms_certificates USING btree (employee_id);


--
-- Name: idx_lms_cert_number; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_cert_number ON public.lms_certificates USING btree (certificate_number);


--
-- Name: idx_lms_cert_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_cert_tenant ON public.lms_certificates USING btree (tenant_id);


--
-- Name: idx_lms_content_module; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_content_module ON public.lms_module_contents USING btree (module_id);


--
-- Name: idx_lms_content_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_content_tenant ON public.lms_module_contents USING btree (tenant_id);


--
-- Name: idx_lms_course_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_course_category ON public.lms_courses USING btree (category_id);


--
-- Name: idx_lms_course_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_course_status ON public.lms_courses USING btree (status);


--
-- Name: idx_lms_course_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_course_tenant ON public.lms_courses USING btree (tenant_id);


--
-- Name: idx_lms_enroll_course; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_enroll_course ON public.lms_course_enrollments USING btree (course_id);


--
-- Name: idx_lms_enroll_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_enroll_employee ON public.lms_course_enrollments USING btree (employee_id);


--
-- Name: idx_lms_enroll_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_enroll_status ON public.lms_course_enrollments USING btree (status);


--
-- Name: idx_lms_enroll_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_enroll_tenant ON public.lms_course_enrollments USING btree (tenant_id);


--
-- Name: idx_lms_module_course; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_module_course ON public.lms_course_modules USING btree (course_id);


--
-- Name: idx_lms_module_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_module_tenant ON public.lms_course_modules USING btree (tenant_id);


--
-- Name: idx_lms_progress_content; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_progress_content ON public.lms_content_progress USING btree (content_id);


--
-- Name: idx_lms_progress_enrollment; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_progress_enrollment ON public.lms_content_progress USING btree (enrollment_id);


--
-- Name: idx_lms_progress_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_progress_tenant ON public.lms_content_progress USING btree (tenant_id);


--
-- Name: idx_lms_question_quiz; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_question_quiz ON public.lms_quiz_questions USING btree (quiz_id);


--
-- Name: idx_lms_question_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_question_tenant ON public.lms_quiz_questions USING btree (tenant_id);


--
-- Name: idx_lms_quiz_course; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_quiz_course ON public.lms_quizzes USING btree (course_id);


--
-- Name: idx_lms_quiz_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lms_quiz_tenant ON public.lms_quizzes USING btree (tenant_id);


--
-- Name: idx_lp_published; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lp_published ON public.lms_learning_paths USING btree (tenant_id, is_published);


--
-- Name: idx_lp_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lp_tenant ON public.lms_learning_paths USING btree (tenant_id);


--
-- Name: idx_lpc_course; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lpc_course ON public.lms_learning_path_courses USING btree (course_id);


--
-- Name: idx_lpc_path; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_lpc_path ON public.lms_learning_path_courses USING btree (path_id);


--
-- Name: idx_mcn_channel; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_mcn_channel ON public.multi_channel_notifications USING btree (channel);


--
-- Name: idx_mcn_created; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_mcn_created ON public.multi_channel_notifications USING btree (created_at);


--
-- Name: idx_mcn_recipient; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_mcn_recipient ON public.multi_channel_notifications USING btree (recipient_id);


--
-- Name: idx_mcn_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_mcn_status ON public.multi_channel_notifications USING btree (status);


--
-- Name: idx_meeting_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_meeting_date ON public.one_on_one_meetings USING btree (tenant_id, meeting_date);


--
-- Name: idx_meeting_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_meeting_employee ON public.one_on_one_meetings USING btree (employee_id);


--
-- Name: idx_meeting_manager; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_meeting_manager ON public.one_on_one_meetings USING btree (manager_id);


--
-- Name: idx_meeting_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_meeting_status ON public.one_on_one_meetings USING btree (tenant_id, status);


--
-- Name: idx_meeting_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_meeting_tenant ON public.one_on_one_meetings USING btree (tenant_id);


--
-- Name: idx_metrics_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_metrics_tenant ON public.ticket_metrics USING btree (tenant_id);


--
-- Name: idx_metrics_ticket; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_metrics_ticket ON public.ticket_metrics USING btree (ticket_id);


--
-- Name: idx_notification_created; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_notification_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notification_read; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_notification_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notification_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_notification_tenant ON public.notifications USING btree (tenant_id);


--
-- Name: idx_notification_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_notification_user ON public.notifications USING btree (user_id);


--
-- Name: idx_nu_app_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_nu_app_status ON public.nu_applications USING btree (status);


--
-- Name: idx_objective_cycle; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_objective_cycle ON public.objectives USING btree (cycle_id);


--
-- Name: idx_objective_owner; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_objective_owner ON public.objectives USING btree (owner_id);


--
-- Name: idx_objective_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_objective_status ON public.objectives USING btree (status);


--
-- Name: idx_objective_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_objective_tenant ON public.objectives USING btree (tenant_id);


--
-- Name: idx_office_location_active; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_office_location_active ON public.office_locations USING btree (is_active);


--
-- Name: idx_office_location_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_office_location_tenant ON public.office_locations USING btree (tenant_id);


--
-- Name: idx_okr_checkin_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_okr_checkin_date ON public.okr_check_ins USING btree (check_in_date);


--
-- Name: idx_okr_checkin_kr; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_okr_checkin_kr ON public.okr_check_ins USING btree (key_result_id);


--
-- Name: idx_okr_checkin_objective; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_okr_checkin_objective ON public.okr_check_ins USING btree (objective_id);


--
-- Name: idx_okr_checkin_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_okr_checkin_tenant ON public.okr_check_ins USING btree (tenant_id);


--
-- Name: idx_payment_batch_payroll; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_batch_payroll ON public.payment_batches USING btree (payroll_run_id);


--
-- Name: idx_payment_batch_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_batch_status ON public.payment_batches USING btree (tenant_id, status);


--
-- Name: idx_payment_batch_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_batch_tenant ON public.payment_batches USING btree (tenant_id);


--
-- Name: idx_payment_batch_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_batch_type ON public.payment_batches USING btree (tenant_id, type);


--
-- Name: idx_payment_config_provider; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_config_provider ON public.payment_configs USING btree (tenant_id, provider);


--
-- Name: idx_payment_config_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_config_tenant ON public.payment_configs USING btree (tenant_id);


--
-- Name: idx_payment_refund_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_refund_status ON public.payment_refunds USING btree (tenant_id, status);


--
-- Name: idx_payment_refund_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_refund_tenant ON public.payment_refunds USING btree (tenant_id);


--
-- Name: idx_payment_refund_transaction; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_refund_transaction ON public.payment_refunds USING btree (transaction_id);


--
-- Name: idx_payment_transaction_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_transaction_employee ON public.payment_transactions USING btree (tenant_id, employee_id);


--
-- Name: idx_payment_transaction_external_ref; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_transaction_external_ref ON public.payment_transactions USING btree (external_ref);


--
-- Name: idx_payment_transaction_payroll; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_transaction_payroll ON public.payment_transactions USING btree (payroll_run_id);


--
-- Name: idx_payment_transaction_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_transaction_status ON public.payment_transactions USING btree (tenant_id, status);


--
-- Name: idx_payment_transaction_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_transaction_tenant ON public.payment_transactions USING btree (tenant_id);


--
-- Name: idx_payment_transaction_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_transaction_type ON public.payment_transactions USING btree (tenant_id, type);


--
-- Name: idx_payment_webhook_event; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_webhook_event ON public.payment_webhooks USING btree (tenant_id, event_type);


--
-- Name: idx_payment_webhook_external_event_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_webhook_external_event_id ON public.payment_webhooks USING btree (external_event_id);


--
-- Name: idx_payment_webhook_processed; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_webhook_processed ON public.payment_webhooks USING btree (tenant_id, processed);


--
-- Name: idx_payment_webhook_provider; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_webhook_provider ON public.payment_webhooks USING btree (tenant_id, provider);


--
-- Name: idx_payment_webhook_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payment_webhook_tenant ON public.payment_webhooks USING btree (tenant_id);


--
-- Name: idx_payroll_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payroll_status ON public.payroll_runs USING btree (status);


--
-- Name: idx_payroll_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payroll_tenant ON public.payroll_runs USING btree (tenant_id);


--
-- Name: idx_payslip_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payslip_employee ON public.payslips USING btree (employee_id);


--
-- Name: idx_payslip_run; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payslip_run ON public.payslips USING btree (payroll_run_id);


--
-- Name: idx_payslip_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_payslip_tenant ON public.payslips USING btree (tenant_id);


--
-- Name: idx_perf_review_cycle; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_perf_review_cycle ON public.performance_reviews USING btree (review_cycle_id);


--
-- Name: idx_perf_review_period; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_perf_review_period ON public.performance_reviews USING btree (review_period_start, review_period_end);


--
-- Name: idx_perf_review_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_perf_review_status ON public.performance_reviews USING btree (status);


--
-- Name: idx_perf_review_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_perf_review_tenant ON public.performance_reviews USING btree (tenant_id);


--
-- Name: idx_perf_review_tenant_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_perf_review_tenant_employee ON public.performance_reviews USING btree (tenant_id, employee_id);


--
-- Name: idx_perf_review_tenant_reviewer; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_perf_review_tenant_reviewer ON public.performance_reviews USING btree (tenant_id, reviewer_id);


--
-- Name: idx_permission_resource; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_permission_resource ON public.permissions USING btree (resource);


--
-- Name: idx_pip_checkin_pip; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pip_checkin_pip ON public.pip_check_ins USING btree (pip_id);


--
-- Name: idx_pip_checkin_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pip_checkin_tenant ON public.pip_check_ins USING btree (tenant_id);


--
-- Name: idx_pip_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pip_employee ON public.performance_improvement_plans USING btree (tenant_id, employee_id);


--
-- Name: idx_pip_manager; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pip_manager ON public.performance_improvement_plans USING btree (tenant_id, manager_id);


--
-- Name: idx_pip_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pip_status ON public.performance_improvement_plans USING btree (status);


--
-- Name: idx_pip_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pip_tenant ON public.performance_improvement_plans USING btree (tenant_id);


--
-- Name: idx_post_comment_author; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_post_comment_author ON public.post_comments USING btree (author_id);


--
-- Name: idx_post_comment_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_post_comment_created_at ON public.post_comments USING btree (created_at);


--
-- Name: idx_post_comment_parent; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_post_comment_parent ON public.post_comments USING btree (parent_comment_id);


--
-- Name: idx_post_comment_post; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_post_comment_post ON public.post_comments USING btree (post_id);


--
-- Name: idx_post_comment_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_post_comment_tenant ON public.post_comments USING btree (tenant_id);


--
-- Name: idx_post_comment_tenant_post; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_post_comment_tenant_post ON public.post_comments USING btree (tenant_id, post_id);


--
-- Name: idx_preboard_email; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_preboard_email ON public.preboarding_candidates USING btree (email, tenant_id);


--
-- Name: idx_preboard_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_preboard_tenant ON public.preboarding_candidates USING btree (tenant_id);


--
-- Name: idx_prob_eval_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_prob_eval_date ON public.probation_evaluations USING btree (evaluation_date);


--
-- Name: idx_prob_eval_period; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_prob_eval_period ON public.probation_evaluations USING btree (probation_period_id);


--
-- Name: idx_prob_eval_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_prob_eval_tenant ON public.probation_evaluations USING btree (tenant_id);


--
-- Name: idx_probation_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_probation_employee ON public.probation_periods USING btree (employee_id);


--
-- Name: idx_probation_end_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_probation_end_date ON public.probation_periods USING btree (end_date);


--
-- Name: idx_probation_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_probation_status ON public.probation_periods USING btree (status);


--
-- Name: idx_probation_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_probation_tenant ON public.probation_periods USING btree (tenant_id);


--
-- Name: idx_profile_update_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_profile_update_employee ON public.employee_profile_update_requests USING btree (employee_id, tenant_id);


--
-- Name: idx_profile_update_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_profile_update_status ON public.employee_profile_update_requests USING btree (tenant_id, status);


--
-- Name: idx_project_employees_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_project_employees_employee ON public.project_employees USING btree (employee_id);


--
-- Name: idx_project_employees_project; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_project_employees_project ON public.project_employees USING btree (project_id);


--
-- Name: idx_project_employees_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_project_employees_tenant ON public.project_employees USING btree (tenant_id);


--
-- Name: idx_project_manager; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_project_manager ON public.projects USING btree (project_manager_id);


--
-- Name: idx_project_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_project_status ON public.projects USING btree (status);


--
-- Name: idx_project_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_project_tenant ON public.projects USING btree (tenant_id);


--
-- Name: idx_psa_question; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psa_question ON public.pulse_survey_answers USING btree (question_id);


--
-- Name: idx_psa_response; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psa_response ON public.pulse_survey_answers USING btree (response_id);


--
-- Name: idx_psa_survey_question; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psa_survey_question ON public.pulse_survey_answers USING btree (survey_id, question_id);


--
-- Name: idx_psq_order; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psq_order ON public.pulse_survey_questions USING btree (survey_id, question_order);


--
-- Name: idx_psq_survey; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psq_survey ON public.pulse_survey_questions USING btree (survey_id);


--
-- Name: idx_psr_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psr_employee ON public.pulse_survey_responses USING btree (employee_id);


--
-- Name: idx_psr_survey; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psr_survey ON public.pulse_survey_responses USING btree (survey_id);


--
-- Name: idx_psr_survey_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_psr_survey_employee ON public.pulse_survey_responses USING btree (survey_id, employee_id);


--
-- Name: idx_pulse_survey_dates; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pulse_survey_dates ON public.pulse_surveys USING btree (tenant_id, start_date, end_date);


--
-- Name: idx_pulse_survey_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pulse_survey_status ON public.pulse_surveys USING btree (tenant_id, status);


--
-- Name: idx_pulse_survey_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_pulse_survey_tenant ON public.pulse_surveys USING btree (tenant_id);


--
-- Name: idx_resource_conflict_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_resource_conflict_status ON public.resource_conflict_log USING btree (tenant_id, status);


--
-- Name: idx_resource_conflict_tenant_emp; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_resource_conflict_tenant_emp ON public.resource_conflict_log USING btree (tenant_id, employee_id);


--
-- Name: idx_role_permission_permission; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_role_permission_permission ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permission_role; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_role_permission_role ON public.role_permissions USING btree (role_id);


--
-- Name: idx_role_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_role_tenant ON public.roles USING btree (tenant_id);


--
-- Name: idx_salary_effective_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_effective_date ON public.salary_structures USING btree (effective_date);


--
-- Name: idx_salary_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_employee ON public.salary_structures USING btree (employee_id);


--
-- Name: idx_salary_rev_cycle; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_rev_cycle ON public.salary_revisions USING btree (review_cycle_id);


--
-- Name: idx_salary_rev_effective_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_rev_effective_date ON public.salary_revisions USING btree (effective_date);


--
-- Name: idx_salary_rev_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_rev_employee ON public.salary_revisions USING btree (employee_id);


--
-- Name: idx_salary_rev_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_rev_status ON public.salary_revisions USING btree (status);


--
-- Name: idx_salary_rev_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_rev_tenant ON public.salary_revisions USING btree (tenant_id);


--
-- Name: idx_salary_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_salary_tenant ON public.salary_structures USING btree (tenant_id);


--
-- Name: idx_shift_assignment_effective; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_shift_assignment_effective ON public.shift_assignments USING btree (effective_from, effective_to);


--
-- Name: idx_shift_assignment_employee_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_shift_assignment_employee_date ON public.shift_assignments USING btree (employee_id, assignment_date);


--
-- Name: idx_shift_assignment_shift_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_shift_assignment_shift_date ON public.shift_assignments USING btree (shift_id, assignment_date);


--
-- Name: idx_shift_assignment_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_shift_assignment_status ON public.shift_assignments USING btree (status);


--
-- Name: idx_shift_assignment_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_shift_assignment_tenant ON public.shift_assignments USING btree (tenant_id);


--
-- Name: idx_shift_assignment_tenant_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_shift_assignment_tenant_employee ON public.shift_assignments USING btree (tenant_id, employee_id);


--
-- Name: idx_sig_appr_order; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_appr_order ON public.signature_approvals USING btree (signature_request_id, signing_order);


--
-- Name: idx_sig_appr_request; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_appr_request ON public.signature_approvals USING btree (tenant_id, signature_request_id);


--
-- Name: idx_sig_appr_signer; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_appr_signer ON public.signature_approvals USING btree (tenant_id, signer_id);


--
-- Name: idx_sig_appr_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_appr_status ON public.signature_approvals USING btree (tenant_id, status);


--
-- Name: idx_sig_appr_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_appr_tenant ON public.signature_approvals USING btree (tenant_id);


--
-- Name: idx_sig_req_creator; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_req_creator ON public.signature_requests USING btree (tenant_id, created_by);


--
-- Name: idx_sig_req_doc_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_req_doc_type ON public.signature_requests USING btree (tenant_id, document_type);


--
-- Name: idx_sig_req_expires; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_req_expires ON public.signature_requests USING btree (tenant_id, expires_at);


--
-- Name: idx_sig_req_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_req_status ON public.signature_requests USING btree (tenant_id, status);


--
-- Name: idx_sig_req_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sig_req_tenant ON public.signature_requests USING btree (tenant_id);


--
-- Name: idx_sla_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sla_category ON public.ticket_slas USING btree (category_id);


--
-- Name: idx_sla_priority; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sla_priority ON public.ticket_slas USING btree (priority);


--
-- Name: idx_sla_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_sla_tenant ON public.ticket_slas USING btree (tenant_id);


--
-- Name: idx_tax_decl_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_decl_employee ON public.tax_declarations USING btree (tenant_id, employee_id);


--
-- Name: idx_tax_decl_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_decl_status ON public.tax_declarations USING btree (tenant_id, status);


--
-- Name: idx_tax_decl_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_decl_tenant ON public.tax_declarations USING btree (tenant_id);


--
-- Name: idx_tax_decl_year; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_decl_year ON public.tax_declarations USING btree (tenant_id, financial_year);


--
-- Name: idx_tax_proof_declaration; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_proof_declaration ON public.tax_proofs USING btree (tenant_id, tax_declaration_id);


--
-- Name: idx_tax_proof_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_proof_employee ON public.tax_proofs USING btree (tenant_id, employee_id);


--
-- Name: idx_tax_proof_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_proof_status ON public.tax_proofs USING btree (tenant_id, status);


--
-- Name: idx_tax_proof_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_proof_tenant ON public.tax_proofs USING btree (tenant_id);


--
-- Name: idx_tax_regime_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_regime_employee ON public.tax_regime_comparisons USING btree (tenant_id, employee_id);


--
-- Name: idx_tax_regime_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_regime_tenant ON public.tax_regime_comparisons USING btree (tenant_id);


--
-- Name: idx_tax_regime_year; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tax_regime_year ON public.tax_regime_comparisons USING btree (tenant_id, financial_year);


--
-- Name: idx_template_instantiations_template; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_template_instantiations_template ON public.template_instantiations USING btree (template_id);


--
-- Name: idx_template_instantiations_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_template_instantiations_tenant ON public.template_instantiations USING btree (tenant_id);


--
-- Name: idx_tenant_app_app; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tenant_app_app ON public.tenant_applications USING btree (application_id);


--
-- Name: idx_tenant_app_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tenant_app_status ON public.tenant_applications USING btree (status);


--
-- Name: idx_tenant_app_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tenant_app_tenant ON public.tenant_applications USING btree (tenant_id);


--
-- Name: idx_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_tenant_status ON public.tenants USING btree (status);


--
-- Name: idx_ticket_assigned_to; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_assigned_to ON public.tickets USING btree (assigned_to);


--
-- Name: idx_ticket_category; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_category ON public.tickets USING btree (category_id);


--
-- Name: idx_ticket_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_created_at ON public.tickets USING btree (created_at);


--
-- Name: idx_ticket_due_date; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_due_date ON public.tickets USING btree (due_date);


--
-- Name: idx_ticket_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_tenant ON public.tickets USING btree (tenant_id);


--
-- Name: idx_ticket_tenant_employee; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_tenant_employee ON public.tickets USING btree (tenant_id, employee_id);


--
-- Name: idx_ticket_tenant_priority; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_tenant_priority ON public.tickets USING btree (tenant_id, priority);


--
-- Name: idx_ticket_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_ticket_tenant_status ON public.tickets USING btree (tenant_id, status);


--
-- Name: idx_time_entry_attendance_id; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_time_entry_attendance_id ON public.attendance_time_entries USING btree (attendance_record_id);


--
-- Name: idx_time_entry_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_time_entry_type ON public.attendance_time_entries USING btree (entry_type);


--
-- Name: idx_user_app_app; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_app ON public.user_app_access USING btree (application_id);


--
-- Name: idx_user_app_direct_perm_access; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_direct_perm_access ON public.user_app_direct_permissions USING btree (user_app_access_id);


--
-- Name: idx_user_app_direct_perm_perm; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_direct_perm_perm ON public.user_app_direct_permissions USING btree (permission_id);


--
-- Name: idx_user_app_roles_access; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_roles_access ON public.user_app_roles USING btree (user_app_access_id);


--
-- Name: idx_user_app_roles_role; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_roles_role ON public.user_app_roles USING btree (role_id);


--
-- Name: idx_user_app_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_status ON public.user_app_access USING btree (status);


--
-- Name: idx_user_app_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_tenant ON public.user_app_access USING btree (tenant_id);


--
-- Name: idx_user_app_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_app_user ON public.user_app_access USING btree (user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_status ON public.users USING btree (status);


--
-- Name: idx_user_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_user_tenant ON public.users USING btree (tenant_id);


--
-- Name: idx_wall_post_celebrated; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_celebrated ON public.social_posts USING btree (celebrated_employee_id);


--
-- Name: idx_wall_post_created_at; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_created_at ON public.social_posts USING btree (created_at);


--
-- Name: idx_wall_post_pinned; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_pinned ON public.social_posts USING btree (is_pinned, created_at);


--
-- Name: idx_wall_post_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_tenant ON public.social_posts USING btree (tenant_id);


--
-- Name: idx_wall_post_tenant_author; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_tenant_author ON public.social_posts USING btree (tenant_id, author_id);


--
-- Name: idx_wall_post_tenant_deleted; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_tenant_deleted ON public.social_posts USING btree (tenant_id, is_deleted);


--
-- Name: idx_wall_post_tenant_type; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wall_post_tenant_type ON public.social_posts USING btree (tenant_id, post_type);


--
-- Name: idx_webhook_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_webhook_status ON public.webhooks USING btree (status);


--
-- Name: idx_webhook_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_webhook_tenant ON public.webhooks USING btree (tenant_id);


--
-- Name: idx_webhook_tenant_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_webhook_tenant_status ON public.webhooks USING btree (tenant_id, status);


--
-- Name: idx_wiki_page_approval_tasks_page; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_approval_tasks_page ON public.wiki_page_approval_tasks USING btree (page_id);


--
-- Name: idx_wiki_page_approval_tasks_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_approval_tasks_status ON public.wiki_page_approval_tasks USING btree (status);


--
-- Name: idx_wiki_page_approval_tasks_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_approval_tasks_tenant ON public.wiki_page_approval_tasks USING btree (tenant_id);


--
-- Name: idx_wiki_page_comments_page; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_comments_page ON public.wiki_page_comments USING btree (page_id);


--
-- Name: idx_wiki_page_comments_parent; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_comments_parent ON public.wiki_page_comments USING btree (parent_comment_id);


--
-- Name: idx_wiki_page_comments_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_comments_tenant ON public.wiki_page_comments USING btree (tenant_id);


--
-- Name: idx_wiki_page_versions_page; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_versions_page ON public.wiki_page_versions USING btree (page_id);


--
-- Name: idx_wiki_page_versions_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_versions_tenant ON public.wiki_page_versions USING btree (tenant_id);


--
-- Name: idx_wiki_page_watches_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_watches_tenant ON public.wiki_page_watches USING btree (tenant_id);


--
-- Name: idx_wiki_page_watches_user; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_page_watches_user ON public.wiki_page_watches USING btree (user_id);


--
-- Name: idx_wiki_pages_is_pinned; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_is_pinned ON public.wiki_pages USING btree (is_pinned);


--
-- Name: idx_wiki_pages_parent; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_parent ON public.wiki_pages USING btree (parent_page_id);


--
-- Name: idx_wiki_pages_slug; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_slug ON public.wiki_pages USING btree (slug);


--
-- Name: idx_wiki_pages_space; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_space ON public.wiki_pages USING btree (space_id);


--
-- Name: idx_wiki_pages_status; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_status ON public.wiki_pages USING btree (status);


--
-- Name: idx_wiki_pages_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_tenant ON public.wiki_pages USING btree (tenant_id);


--
-- Name: idx_wiki_pages_visibility; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_pages_visibility ON public.wiki_pages USING btree (visibility);


--
-- Name: idx_wiki_spaces_is_archived; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_spaces_is_archived ON public.wiki_spaces USING btree (is_archived);


--
-- Name: idx_wiki_spaces_tenant; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_spaces_tenant ON public.wiki_spaces USING btree (tenant_id);


--
-- Name: idx_wiki_spaces_visibility; Type: INDEX; Schema: public; Owner: hrms
--

CREATE INDEX idx_wiki_spaces_visibility ON public.wiki_spaces USING btree (visibility);


--
-- Name: challenge_participants fk1021vdxjofmb6nv0swf403n08; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.challenge_participants
  ADD CONSTRAINT fk1021vdxjofmb6nv0swf403n08 FOREIGN KEY (challenge_id) REFERENCES public.wellness_challenges(id);


--
-- Name: post_comments fk21q7y8a124im4g0l4aaxn4ol1; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_comments
  ADD CONSTRAINT fk21q7y8a124im4g0l4aaxn4ol1 FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id);


--
-- Name: benefit_claim_documents fk27a37bfn29g69by8ehgpxgun2; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_claim_documents
  ADD CONSTRAINT fk27a37bfn29g69by8ehgpxgun2 FOREIGN KEY (claim_id) REFERENCES public.benefit_claims(id);


--
-- Name: user_app_direct_permissions fk38soqupnnx3cjj1o2bmxjo9si; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_direct_permissions
  ADD CONSTRAINT fk38soqupnnx3cjj1o2bmxjo9si FOREIGN KEY (user_app_access_id) REFERENCES public.user_app_access(id);


--
-- Name: app_permissions fk3g70hwuncn53qpb085481mb2; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_permissions
  ADD CONSTRAINT fk3g70hwuncn53qpb085481mb2 FOREIGN KEY (application_id) REFERENCES public.nu_applications(id);


--
-- Name: user_app_access fk3i998tp1nikpiv509ialsiiyh; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_access
  ADD CONSTRAINT fk3i998tp1nikpiv509ialsiiyh FOREIGN KEY (application_id) REFERENCES public.nu_applications(id);


--
-- Name: step_executions fk3k6q4ysu6nuxypwp2khh8v8qj; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.step_executions
  ADD CONSTRAINT fk3k6q4ysu6nuxypwp2khh8v8qj FOREIGN KEY (approval_step_id) REFERENCES public.approval_steps(id);


--
-- Name: user_basic_notification_preferences fk40rxetgc4fp2iiluyk9onuuqo; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_basic_notification_preferences
  ADD CONSTRAINT fk40rxetgc4fp2iiluyk9onuuqo FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: applicants fk4i8on6e4bu7nw5431aw6cjv5d; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.applicants
  ADD CONSTRAINT fk4i8on6e4bu7nw5431aw6cjv5d FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);


--
-- Name: engagement_scores fk57mlqp0peis5rx7ren0b8yrl; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.engagement_scores
  ADD CONSTRAINT fk57mlqp0peis5rx7ren0b8yrl FOREIGN KEY (survey_id) REFERENCES public.surveys(id);


--
-- Name: benefit_dependents fk5r8rslbatj88f5x7hcea5bkk3; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_dependents
  ADD CONSTRAINT fk5r8rslbatj88f5x7hcea5bkk3 FOREIGN KEY (enrollment_id) REFERENCES public.benefit_enrollments(id);


--
-- Name: survey_answers fk5uq8oeol8ihkd2swk71t62j6h; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_answers
  ADD CONSTRAINT fk5uq8oeol8ihkd2swk71t62j6h FOREIGN KEY (response_id) REFERENCES public.survey_responses(id);


--
-- Name: budget_scenarios fk62eu3qf18eluuna15nm7w734h; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.budget_scenarios
  ADD CONSTRAINT fk62eu3qf18eluuna15nm7w734h FOREIGN KEY (base_budget_id) REFERENCES public.headcount_budgets(id);


--
-- Name: employees fk69x3vjuy1t5p18a5llb8h2fjx; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employees
  ADD CONSTRAINT fk69x3vjuy1t5p18a5llb8h2fjx FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_app_roles fk6u548ew17eaxaxd1xbnf28bj4; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_roles
  ADD CONSTRAINT fk6u548ew17eaxaxd1xbnf28bj4 FOREIGN KEY (role_id) REFERENCES public.app_roles(id);


--
-- Name: post_reactions fk7619xrgmtwu26fuvx3iildvph; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_reactions
  ADD CONSTRAINT fk7619xrgmtwu26fuvx3iildvph FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: custom_scope_targets fk7s4yt2hcnerxtcqgwifjpkxqt; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_scope_targets
  ADD CONSTRAINT fk7s4yt2hcnerxtcqgwifjpkxqt FOREIGN KEY (role_permission_id) REFERENCES public.role_permissions(id);


--
-- Name: post_reactions fk86vsxdij3ovbgtk809p2maosy; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_reactions
  ADD CONSTRAINT fk86vsxdij3ovbgtk809p2maosy FOREIGN KEY (post_id) REFERENCES public.social_posts(id);


--
-- Name: health_logs fk88dsi5gyy5vrgkwyrrpy93uoj; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.health_logs
  ADD CONSTRAINT fk88dsi5gyy5vrgkwyrrpy93uoj FOREIGN KEY (participant_id) REFERENCES public.challenge_participants(id);


--
-- Name: app_roles fk8hofppiefvou1ldrk8nnhqa; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_roles
  ADD CONSTRAINT fk8hofppiefvou1ldrk8nnhqa FOREIGN KEY (application_id) REFERENCES public.nu_applications(id);


--
-- Name: user_notification_quiet_days fk8kmwxmla1o8x850y0s8683gd3; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_notification_quiet_days
  ADD CONSTRAINT fk8kmwxmla1o8x850y0s8683gd3 FOREIGN KEY (preference_id) REFERENCES public.user_notification_preferences(id);


--
-- Name: poll_votes fk8krgyc2hbkcr2gu0pp4jf44jl; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_votes
  ADD CONSTRAINT fk8krgyc2hbkcr2gu0pp4jf44jl FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: survey_questions fk91fvqiwu0dj35uxpnx7qpoiw6; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_questions
  ADD CONSTRAINT fk91fvqiwu0dj35uxpnx7qpoiw6 FOREIGN KEY (survey_id) REFERENCES public.surveys(id);


--
-- Name: contract_reminders fk_contract_reminders_tenant; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.contract_reminders
  ADD CONSTRAINT fk_contract_reminders_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON
DELETE
CASCADE;


--
-- Name: wiki_page_comments fka7maxaye6e2759qlfp21aas6l; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_comments
  ADD CONSTRAINT fka7maxaye6e2759qlfp21aas6l FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id);


--
-- Name: social_posts fkaoqwp361i89o4oav4wr63ydts; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.social_posts
  ADD CONSTRAINT fkaoqwp361i89o4oav4wr63ydts FOREIGN KEY (author_id) REFERENCES public.employees(id);


--
-- Name: user_basic_notification_preferences fkas3n3v49ajcl5b95ye8suavyd; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_basic_notification_preferences
  ADD CONSTRAINT fkas3n3v49ajcl5b95ye8suavyd FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employee_payroll_records fkbd444jj8m4yu0dptqvxjqakrr; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.employee_payroll_records
  ADD CONSTRAINT fkbd444jj8m4yu0dptqvxjqakrr FOREIGN KEY (payroll_run_id) REFERENCES public.global_payroll_runs(id);


--
-- Name: overtime_requests fkbvpqmg2wb8o0eushfdmddr6kw; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_requests
  ADD CONSTRAINT fkbvpqmg2wb8o0eushfdmddr6kw FOREIGN KEY (policy_id) REFERENCES public.overtime_policies(id);


--
-- Name: wiki_page_versions fkc63mx90107k7o11vnha0hxtfb; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_versions
  ADD CONSTRAINT fkc63mx90107k7o11vnha0hxtfb FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id);


--
-- Name: user_app_direct_permissions fkd0bcetuogr2x392wj8h7tvhi4; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_direct_permissions
  ADD CONSTRAINT fkd0bcetuogr2x392wj8h7tvhi4 FOREIGN KEY (permission_id) REFERENCES public.app_permissions(id);


--
-- Name: wellness_challenges fkd8mnty7q6lpwvesx1crf8hqwu; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wellness_challenges
  ADD CONSTRAINT fkd8mnty7q6lpwvesx1crf8hqwu FOREIGN KEY (program_id) REFERENCES public.wellness_programs(id);


--
-- Name: poll_votes fke95ke8vf97rs9i45igbq4o9x4; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_votes
  ADD CONSTRAINT fke95ke8vf97rs9i45igbq4o9x4 FOREIGN KEY (poll_option_id) REFERENCES public.poll_options(id);


--
-- Name: role_permissions fkegdk29eiy7mdtefy5c7eirr6e; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.role_permissions
  ADD CONSTRAINT fkegdk29eiy7mdtefy5c7eirr6e FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: benefit_claims fkfrhyqqgnc12p7uxxhx77fw2hb; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_claims
  ADD CONSTRAINT fkfrhyqqgnc12p7uxxhx77fw2hb FOREIGN KEY (enrollment_id) REFERENCES public.benefit_enrollments(id);


--
-- Name: survey_responses fkg5uul15qxrqgdet2fa3wvdhj8; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_responses
  ADD CONSTRAINT fkg5uul15qxrqgdet2fa3wvdhj8 FOREIGN KEY (survey_id) REFERENCES public.surveys(id);


--
-- Name: custom_field_values fkgbl57fc82613v84ivvdxedloy; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.custom_field_values
  ADD CONSTRAINT fkgbl57fc82613v84ivvdxedloy FOREIGN KEY (field_definition_id) REFERENCES public.custom_field_definitions(id);


--
-- Name: survey_answers fkgl5lld6jreh81eovnut8dtx5y; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_answers
  ADD CONSTRAINT fkgl5lld6jreh81eovnut8dtx5y FOREIGN KEY (question_id) REFERENCES public.survey_questions(id);


--
-- Name: user_app_access fkgtpf3i3bqfwukpt9tbb8c26oh; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_access
  ADD CONSTRAINT fkgtpf3i3bqfwukpt9tbb8c26oh FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: poll_options fkh3ogpuoimwp3sa7uk0hhut3r1; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.poll_options
  ADD CONSTRAINT fkh3ogpuoimwp3sa7uk0hhut3r1 FOREIGN KEY (post_id) REFERENCES public.social_posts(id);


--
-- Name: comp_time_transactions fkh8bogyjh3v51tvg10by0kxj6v; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.comp_time_transactions
  ADD CONSTRAINT fkh8bogyjh3v51tvg10by0kxj6v FOREIGN KEY (balance_id) REFERENCES public.comp_time_balances(id);


--
-- Name: user_roles fkh8ciramu9cc9q3qcqiv4ue8a6; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_roles
  ADD CONSTRAINT fkh8ciramu9cc9q3qcqiv4ue8a6 FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: workflow_executions fkhc1hde689ggroypkm18kkr4kb; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.workflow_executions
  ADD CONSTRAINT fkhc1hde689ggroypkm18kkr4kb FOREIGN KEY (workflow_definition_id) REFERENCES public.workflow_definitions(id);


--
-- Name: user_roles fkhfh9dx7w3ubf1co1vdev94g3f; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_roles
  ADD CONSTRAINT fkhfh9dx7w3ubf1co1vdev94g3f FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notification_template_channels fkhiswt16lqy567c45jgte16msb; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.notification_template_channels
  ADD CONSTRAINT fkhiswt16lqy567c45jgte16msb FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: probation_evaluations fkhlb08av0ivs920gw99tc05mya; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.probation_evaluations
  ADD CONSTRAINT fkhlb08av0ivs920gw99tc05mya FOREIGN KEY (probation_period_id) REFERENCES public.probation_periods(id);


--
-- Name: wiki_page_approval_tasks fkj6iwrq2fa7xv6ft3e794070w2; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_approval_tasks
  ADD CONSTRAINT fkj6iwrq2fa7xv6ft3e794070w2 FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id);


--
-- Name: webhook_events fkjmxgten1d5oe27q55upbw4xqs; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.webhook_events
  ADD CONSTRAINT fkjmxgten1d5oe27q55upbw4xqs FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id);


--
-- Name: step_executions fkjq64rum0jaham8gsr72twp4qb; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.step_executions
  ADD CONSTRAINT fkjq64rum0jaham8gsr72twp4qb FOREIGN KEY (workflow_execution_id) REFERENCES public.workflow_executions(id);


--
-- Name: api_key_scopes fkkejmbpd6rvsipbx2qpjf7srg1; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.api_key_scopes
  ADD CONSTRAINT fkkejmbpd6rvsipbx2qpjf7srg1 FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id);


--
-- Name: tenant_applications fkkordbevdu10qg3prg9jh7rve7; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.tenant_applications
  ADD CONSTRAINT fkkordbevdu10qg3prg9jh7rve7 FOREIGN KEY (application_id) REFERENCES public.nu_applications(id);


--
-- Name: template_instantiations fkkufrketgvw5n80sh7nvgl1938; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.template_instantiations
  ADD CONSTRAINT fkkufrketgvw5n80sh7nvgl1938 FOREIGN KEY (template_id) REFERENCES public.knowledge_templates(id);


--
-- Name: lms_learning_path_courses fklg1bdxy80prar3uwsy4u4yk04; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.lms_learning_path_courses
  ADD CONSTRAINT fklg1bdxy80prar3uwsy4u4yk04 FOREIGN KEY (path_id) REFERENCES public.lms_learning_paths(id);


--
-- Name: post_comments fklqj4a7ssg7s8iawn0k441ndav; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_comments
  ADD CONSTRAINT fklqj4a7ssg7s8iawn0k441ndav FOREIGN KEY (author_id) REFERENCES public.employees(id);


--
-- Name: announcement_target_departments fkm9bh66u5pbe0hd55e2cfw0g9s; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.announcement_target_departments
  ADD CONSTRAINT fkm9bh66u5pbe0hd55e2cfw0g9s FOREIGN KEY (announcement_id) REFERENCES public.announcements(id);


--
-- Name: post_comments fkmm2v8fg0ld9qu414bhq8jbn35; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_comments
  ADD CONSTRAINT fkmm2v8fg0ld9qu414bhq8jbn35 FOREIGN KEY (post_id) REFERENCES public.social_posts(id);


--
-- Name: headcount_positions fkmx0xiilbpw6esvt4yv2mqav6i; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.headcount_positions
  ADD CONSTRAINT fkmx0xiilbpw6esvt4yv2mqav6i FOREIGN KEY (budget_id) REFERENCES public.headcount_budgets(id);


--
-- Name: role_permissions fkn5fotdgk8d1xvo8nav9uv3muc; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.role_permissions
  ADD CONSTRAINT fkn5fotdgk8d1xvo8nav9uv3muc FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: benefit_enrollments fknfv3sc1tugs18rh07dvb7bpet; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.benefit_enrollments
  ADD CONSTRAINT fknfv3sc1tugs18rh07dvb7bpet FOREIGN KEY (benefit_plan_id) REFERENCES public.benefit_plans_enhanced(id);


--
-- Name: blog_posts fkob98yyhofb2qn7x1pk9nmo6aa; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_posts
  ADD CONSTRAINT fkob98yyhofb2qn7x1pk9nmo6aa FOREIGN KEY (category_id) REFERENCES public.blog_categories(id);


--
-- Name: approval_steps fkomy88y7h5ilgksfadqfodsfkg; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.approval_steps
  ADD CONSTRAINT fkomy88y7h5ilgksfadqfodsfkg FOREIGN KEY (workflow_definition_id) REFERENCES public.workflow_definitions(id);


--
-- Name: multi_channel_notifications fkpwvhx1impstpt5l5qu1clxida; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.multi_channel_notifications
  ADD CONSTRAINT fkpwvhx1impstpt5l5qu1clxida FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: social_posts fkq0ylrqwui4j6rs2g1912wnn43; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.social_posts
  ADD CONSTRAINT fkq0ylrqwui4j6rs2g1912wnn43 FOREIGN KEY (celebrated_employee_id) REFERENCES public.employees(id);


--
-- Name: wiki_pages fkq3jpovsnopotbx3pqpdud24kv; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_pages
  ADD CONSTRAINT fkq3jpovsnopotbx3pqpdud24kv FOREIGN KEY (parent_page_id) REFERENCES public.wiki_pages(id);


--
-- Name: post_reactions fkq42jpeks9vdetqa06t1l1545u; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.post_reactions
  ADD CONSTRAINT fkq42jpeks9vdetqa06t1l1545u FOREIGN KEY (comment_id) REFERENCES public.post_comments(id);


--
-- Name: wiki_page_comments fkq6qeqg4i2c4gxktk9w1my6ist; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_comments
  ADD CONSTRAINT fkq6qeqg4i2c4gxktk9w1my6ist FOREIGN KEY (parent_comment_id) REFERENCES public.wiki_page_comments(id);


--
-- Name: app_role_permissions fkqv5mlpvho0lajw74rksktsb; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_role_permissions
  ADD CONSTRAINT fkqv5mlpvho0lajw74rksktsb FOREIGN KEY (permission_id) REFERENCES public.app_permissions(id);


--
-- Name: blog_comments fkrlbo2mnoij5ukteoraiw2mhdc; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_comments
  ADD CONSTRAINT fkrlbo2mnoij5ukteoraiw2mhdc FOREIGN KEY (post_id) REFERENCES public.blog_posts(id);


--
-- Name: announcement_target_employees fkrolxx2u9ww8n98ut3ftibr72b; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.announcement_target_employees
  ADD CONSTRAINT fkrolxx2u9ww8n98ut3ftibr72b FOREIGN KEY (announcement_id) REFERENCES public.announcements(id);


--
-- Name: applicants fkrsmd00nd7ym3424vkewrnramm; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.applicants
  ADD CONSTRAINT fkrsmd00nd7ym3424vkewrnramm FOREIGN KEY (job_opening_id) REFERENCES public.job_openings(id);


--
-- Name: blog_comments fkrt9ek0aspkel4ef2fiv7x6w79; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_comments
  ADD CONSTRAINT fkrt9ek0aspkel4ef2fiv7x6w79 FOREIGN KEY (parent_comment_id) REFERENCES public.blog_comments(id);


--
-- Name: survey_insights fks0v1qsk0noauasowdijw60wmh; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.survey_insights
  ADD CONSTRAINT fks0v1qsk0noauasowdijw60wmh FOREIGN KEY (survey_id) REFERENCES public.surveys(id);


--
-- Name: app_role_permissions fksj8wgtocscsk3cv3d7pngtv1s; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.app_role_permissions
  ADD CONSTRAINT fksj8wgtocscsk3cv3d7pngtv1s FOREIGN KEY (role_id) REFERENCES public.app_roles(id);


--
-- Name: wiki_page_watches fksk7bryyejaec3hf8k6912cofy; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_page_watches
  ADD CONSTRAINT fksk7bryyejaec3hf8k6912cofy FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id);


--
-- Name: wiki_pages fkt1nevnmh3e6sged2khddh3t7u; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.wiki_pages
  ADD CONSTRAINT fkt1nevnmh3e6sged2khddh3t7u FOREIGN KEY (space_id) REFERENCES public.wiki_spaces(id);


--
-- Name: user_app_roles fkt7c919b8m66plmbxdsf9sm46i; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.user_app_roles
  ADD CONSTRAINT fkt7c919b8m66plmbxdsf9sm46i FOREIGN KEY (user_app_access_id) REFERENCES public.user_app_access(id);


--
-- Name: blog_likes fktargimgt3xiuwhqex74lak8u2; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.blog_likes
  ADD CONSTRAINT fktargimgt3xiuwhqex74lak8u2 FOREIGN KEY (post_id) REFERENCES public.blog_posts(id);


--
-- Name: overtime_rate_tiers fktcx0ytygfajd7pasnn3en8rtc; Type: FK CONSTRAINT; Schema: public; Owner: hrms
--

ALTER TABLE ONLY public.overtime_rate_tiers
  ADD CONSTRAINT fktcx0ytygfajd7pasnn3en8rtc FOREIGN KEY (policy_id) REFERENCES public.overtime_policies(id);


--
-- Name: blog_categories blog_categories_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY blog_categories_allow_all ON public.blog_categories USING (true) WITH CHECK (true);


--
-- Name: blog_comments blog_comments_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY blog_comments_allow_all ON public.blog_comments USING (true) WITH CHECK (true);


--
-- Name: blog_likes blog_likes_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY blog_likes_allow_all ON public.blog_likes USING (true) WITH CHECK (true);


--
-- Name: blog_posts blog_posts_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY blog_posts_allow_all ON public.blog_posts USING (true) WITH CHECK (true);


--
-- Name: contract_reminders contract_reminders_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY contract_reminders_allow_all ON public.contract_reminders USING (true) WITH CHECK (true);


--
-- Name: contract_signatures contract_signatures_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY contract_signatures_allow_all ON public.contract_signatures USING (true) WITH CHECK (true);


--
-- Name: contract_templates contract_templates_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY contract_templates_allow_all ON public.contract_templates USING (true) WITH CHECK (true);


--
-- Name: contract_versions contract_versions_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY contract_versions_allow_all ON public.contract_versions USING (true) WITH CHECK (true);


--
-- Name: contracts contracts_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY contracts_allow_all ON public.contracts USING (true) WITH CHECK (true);


--
-- Name: document_templates document_templates_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY document_templates_allow_all ON public.document_templates USING (true) WITH CHECK (true);


--
-- Name: knowledge_attachments knowledge_attachments_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY knowledge_attachments_allow_all ON public.knowledge_attachments USING (true) WITH CHECK (true);


--
-- Name: knowledge_searches knowledge_searches_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY knowledge_searches_allow_all ON public.knowledge_searches USING (true) WITH CHECK (true);


--
-- Name: knowledge_views knowledge_views_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY knowledge_views_allow_all ON public.knowledge_views USING (true) WITH CHECK (true);


--
-- Name: template_instantiations template_instantiations_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY template_instantiations_allow_all ON public.template_instantiations USING (true) WITH CHECK (true);


--
-- Name: wiki_page_approval_tasks wiki_page_approval_tasks_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY wiki_page_approval_tasks_allow_all ON public.wiki_page_approval_tasks USING (true) WITH CHECK (true);


--
-- Name: wiki_page_comments wiki_page_comments_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY wiki_page_comments_allow_all ON public.wiki_page_comments USING (true) WITH CHECK (true);


--
-- Name: wiki_page_versions wiki_page_versions_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY wiki_page_versions_allow_all ON public.wiki_page_versions USING (true) WITH CHECK (true);


--
-- Name: wiki_page_watches wiki_page_watches_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY wiki_page_watches_allow_all ON public.wiki_page_watches USING (true) WITH CHECK (true);


--
-- Name: wiki_pages wiki_pages_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY wiki_pages_allow_all ON public.wiki_pages USING (true) WITH CHECK (true);


--
-- Name: wiki_spaces wiki_spaces_allow_all; Type: POLICY; Schema: public; Owner: hrms
--

CREATE
POLICY wiki_spaces_allow_all ON public.wiki_spaces USING (true) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

\unrestrict
FO8Bv7wheobyBxh5iwCxAjtxFurT1MVs5WZIfUrqpizZmWKFLEG07qPYSvh4vYQ

