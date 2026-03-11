# HRMS System Overview

## 1. Product Vision
The Enterprise HRMS platform is designed to be a comprehensive, scalable, and secure human capital management solution, comparable to industry leaders like KEKA, Darwinbox, and BambooHR. The vision is to empower modern organizations with a data-driven, intelligent, and highly automated system that unifies all HR functions into a single pane of glass. By leveraging AI-assisted workflows, real-time analytics, and an event-driven microservices architecture, the platform aims to reduce administrative overhead, enhance employee engagement, and provide actionable insights for strategic decision-making. 

The system prioritizes a consumer-grade user experience (UX) to ensure high adoption rates across all levels of an organization—from frontline employees to C-suite executives. The platform must be robust enough to handle the complex regulatory and compliance requirements of enterprise clients while maintaining the agility needed to support rapid business scaling.

## 2. SaaS Multi-Tenant Model
The architecture is inherently multi-tenant, designed to serve thousands of discrete enterprise customers (tenants) from a single shared infrastructure. 

### Data Isolation
- **Logical Isolation:** Data separation is enforced at the database level using a `tenant_id` column on all tenant-specific tables. This approach (Shared Database, Shared Schema) provides the best balance of cost efficiency, operational simplicity, and scalability.
- **Row-Level Security (RLS):** PostgreSQL Row-Level Security policies are strictly applied to ensure that queries automatically filter data by the current user's `tenant_id`, mitigating the risk of cross-tenant data leaks.
- **Tenant Context:** A Tenant Resolver mechanism intercepts incoming API requests, extracts the tenant identifier from the JWT or custom headers (e.g., `X-Tenant-ID`), and injects it into the execution context (e.g., Spring Security Context) for downward propagation.

### Customization & Configuration
- **Feature Flags:** A robust feature toggle system allows functionality to be enabled or disabled on a per-tenant basis, supporting tiered pricing and gradual feature rollouts.
- **White-Labeling:** Tenants can customize the UI (logos, primary colors, typography) via the Administration module.
- **Extensibility:** Support for custom fields (Entity Attribute Value or JSONB columns) allows tenants to capture business-specific data without requiring structural schema changes.

## 3. Employee Lifecycle
The system provides end-to-end management of the employee journey, formalized into the following stages:

1. **Recruit:** Starts with requisition approval and job posting via the ATS. Covers candidate sourcing, resume parsing, interview scheduling, evaluation rubrics, and final offer generation.
2. **Hire:** Covers offer acceptance, background checks, and the formal conversion of a 'Candidate' entity to an 'Employee' (Pre-boarding phase).
3. **Onboard:** Execution of tenant-specific task checklists. Provisioning of IT assets, creation of organizational email accounts, digital document signing (NDA, contracts), and induction scheduling.
4. **Work:** The core ongoing phase involving daily attendance tracking, shift scheduling, project assignments, continuous learning, and expense claim submissions. 
5. **Review:** Goal setting (OKRs/KPIs), continuous feedback, 360-degree performance appraisals, and 1-on-1 meeting tracking. Links to compensation adjustments.
6. **Pay:** Automated payroll processing taking into account base salary, variable pay, precise attendance data, leave deductions, local tax regulations, and statutory compliance components.
7. **Exit:** Management of off-boarding including resignation requests, automated clearance workflows across departments (IT, Finance), asset recovery, full and final (F&F) settlement processing, and exit interviews.

## 4. System Capabilities
To deliver on the product vision, the system provides several horizontal and vertical capabilities:

- **Authentication & Authorization:** JWT-based stateless sessions with robust Role-Based Access Control (RBAC) and data scoping (Field-Level Security). Includes a top-level **SuperAdmin** persona capable of overriding scopes to access and edit all pages and data across all users and tenants.
- **Workflow Automation:** A dynamic BPMN-lite approval engine supporting multi-level, conditional, and parallel approval chains.
- **Auditing & Compliance:** Indelible, historically preserved audit trails capturing `who`, `what`, and `when` for every critical mutation operation.
- **Document Management:** Secure, presigned URL-based storage for sensitive employee files, supporting auto-expiration and virus scanning.
- **Real-time Notifications:** WebSockets, Push notifications, SMS, and Email delivery via an event-driven notification hub.
- **Reporting & Analytics:** Pre-built customizable dashboards, scheduled report generation, and data export capabilities (CSV, PDF, Excel).
- **Integration Ecosystem:** Standardized REST webhooks and external APIs to connect with external ERPs, Identity Providers (Okta, Azure AD), and productivity suites (Slack, MS Teams).

## 5. Scalability Targets
The platform is designed with the following baseline scalability targets to guarantee performance under high concurrency:

- **Tenants:** Support for 10,000+ active enterprise tenants.
- **Users:** Capable of handling over 2,000,000 managed employees across all tenants.
- **Concurrency:** Up to 50,000 concurrent active users during peak hours (e.g., morning attendance check-ins at 9:00 AM).
- **Throughput:** Sustained processing of 10,000 Requests Per Second (RPS) at the API Gateway level.
- **Latency:** 
  - 95th percentile (P95) API response time < 200ms for read operations.
  - 95th percentile (P95) API response time < 500ms for write operations.
- **Availability:** 99.99% uptime SLA, achieved through multi-zone Kubernetes deployments, PostgreSQL high-availability clusters, and robust circuit breakers in inter-service communication.
- **Event Processing:** Processing of 5,000+ asynchronous events per second via Kafka with an end-to-end latency of under 1 second.
