# NU-AURA HRMS Platform - Requirements Specification

## 1. Project Overview
The NU-AURA HRMS Platform is a comprehensive Human Resource Management System (HRMS) integrated with Project Management capabilities. It aims to streamline HR operations, enhance employee engagement, and provide robust project tracking and resource management tools for organizations.

## 2. Technology Stack

### 2.1 Backend (`hrms-backend`)
*   **Framework:** Spring Boot 3.2.1
*   **Language:** Java 17
*   **Database:** PostgreSQL (with Neon cloud)
*   **Migration:** Liquibase
*   **Authentication:** JWT (JSON Web Tokens), Google SSO
*   **Security:** Spring Security, Role-Based Access Control (RBAC)
*   **ORM:** Hibernate / Spring Data JPA
*   **Documentation:** OpenAPI (Swagger)
*   **Build Tool:** Maven

### 2.2 Frontend (`hrms-frontend`)
*   **Framework:** Next.js 14 (App Router)
*   **Language:** TypeScript
*   **UI Library:** Mantine UI
*   **Styling:** Tailwind CSS
*   **State Management:** React Query (for server state)
*   **Testing:** Playwright (E2E)
*   **Build Tool:** NPM

### 2.3 Infrastructure & Deployment
*   **Containerization:** Docker
*   **Orchestration:** Kubernetes (with HPA)
*   **Cloud Provider:** Google Cloud Platform (GCP)
*   **CI/CD:** GitHub Actions
*   **Monitoring:** Grafana, Prometheus, Micrometer

## 3. Functional Requirements

### 3.1 Authentication & Authorization (IAM)
*   **Google SSO:** Secure login using Google Workspace accounts (OIDC with PKCE).
*   **Matrix Level RBAC (Keka-like):**
    *   **Scope-Based Permissions:** Granular control over data access based on scopes:
        *   **Global:** Access across the entire organization.
        *   **Location/Entity:** Access limited to specific office locations or legal entities.
        *   **Department:** Access limited to specific departments (e.g., IT, HR).
        *   **Team:** Access limited to direct reports and downline.
        *   **Own:** Access limited to self-data only.
    *   **Role Definition:** Custom role creation with a permission matrix (e.g., "HR Manager - Bangalore" can view salaries for Bangalore employees only).
    *   **300+ Permission Nodes:** Fine-grained actions (View, Create, Edit, Delete, Approve, Export) for every module.
    *   **Implicit Role Automation:** Automatic role assignment based on organizational hierarchy (e.g., "Reporting Manager" privileges auto-assigned when an employee has direct reports).
*   **Multi-tenancy:** Logical isolation of data using Tenant ID headers.
*   **Security:** Rate limiting (Bucket4j), Security Headers, Audit Logging.

### 3.2 HRMS Core Modules
*   **Employee Management:**
    *   Full CRUD for employee profiles.
    *   Employee directory with global search.
    *   Self-service profile management.
*   **Organization Management:**
    *   Department and Designation management.
    *   Location and subsidiary setup.
    *   Organization hierarchy visualization.
*   **Attendance Tracking & Shift Management:**
    *   Daily attendance logging (Check-in/Check-out).
    *   **Shift Rostering:** Complex shift scheduling, rotational shifts, and shift allowance calculations.
    *   **Biometric Integration:** Integration with hardware biometric devices (Fingerprint/FaceID).
    *   Calendar view for attendance history.
*   **Leave Management:**
    *   Leave policy configuration (Accrual rules, Carry-over).
    *   Leave request workflows and approvals.
    *   Leave balance tracking.
*   **Payroll & Financial Services:**
    *   Salary structure definition and Payslip generation (PDF).
    *   Statutory compliance calculations (PF, PT, TDS).
    *   **Loans & Advances:** Employee loan application, approval, and EMI recovery workflows.
    *   **Investment Declarations:** IT Proof submission and verification for tax savings.
*   **Performance Management:**
    *   OKR (Objectives and Key Results) tracking.
    *   360-degree feedback loops.
    *   Performance reviews and appraisals.
    *   **9-Box Grid:** Talent matrix for sucession planning and potential assessment.
*   **Recruitment (ATS):**
    *   Job posting management.
    *   Candidate tracking system (ATS).
    *   **Job Board Integrations:** Integration with LinkedIn/Naukri (Future Scope).
    *   **Offer Management:** Offer letter generation with E-Signature support.
*   **Asset Management:**
    *   Asset Lifecycle Management: procurement, assignment, recovery, and depreciation tracking.
    *   IT Asset Inventory and auditing.

### 3.3 Project Management Module
*   **Project Planning:**
    *   Project creation and lifecycle management.
    *   Gantt charts and Kanban boards for task visualization.
    *   Resource allocation and capacity planning.
*   **Task Management:**
    *   Task creation, assignment, and status tracking.
    *   Subtasks, priorities, and deadlines.
*   **Timesheets:**
    *   Weekly timesheet submission.
    *   Project-based time logging.
    *   Approval workflows for managers.
*   **Utilization Reporting:**
    *   Resource utilization metrics.
    *   Billable vs. non-billable hours analysis.

### 3.4 Advanced Features
*   **Travel Management:** Travel request workflows and expense tracking.
*   **Benefits Administration:** Employee benefits enrollment and management.
*   **Training & LMS:** Learning Management System for employee upskilling.
*   **Expense Management:** Expense claims, receipts upload, and approvals.
*   **Employee Engagement:**
    *   **Social Wall:** Internal social feed for announcements and engagement.
    *   **Polls & Surveys:** Pulse surveys and opinion polls for employee feedback.
    *   **Kudos:** Peer-to-peer recognition and rewards.
*   **Global Search:** Real-time search across employees, projects, and departments (Cmd+K).
*   **Notifications:** Real-time alerts via WebSockets and Email.
*   **Mobile App:** Progressive Web App (PWA) with GPS Geofencing support.

### 3.5 Reporting & Analytics
*   **Executive Dashboard:** High-level KPIs, workforce summary, and financial metrics.
*   **Manager Dashboard:** Team performance, pending approvals, and project status.
*   **Employee Dashboard:** Personal stats, attendance, and leave summaries.
*   **Export:** Data export capabilities in CSV, Excel, and PDF formats.

## 4. Non-Functional Requirements

### 4.1 Performance
*   **Response Time:** API response time should be under 200ms for 95% of requests.
*   **Scalability:** Horizontal scaling support via Kubernetes to handle increased load.
*   **Optimized Assets:** Frontend assets optimized for fast loading (Next.js optimizations).

### 4.2 Security
*   **Data Protection:** Encryption at rest and in transit (TLS).
*   **Access Control:** Strict enforcement of RBAC and multi-tenant isolation.
*   **Vulnerability Management:** Regular OWASP dependency checks.

### 4.3 Reliability & Availability
*   **Uptime:** Target 99.9% uptime.
*   **Monitoring:** Real-time system monitoring and alerting via Grafana/Prometheus.
*   **Resilience:** Dockerized microservices architecture (modular monolith) for fault isolation.

### 4.4 Usability
*   **Responsive Design:** Fully responsive UI for Desktop, Tablet, and Mobile.
*   **Accessibility:** Adherence to WCAG standards for inclusive design.
*   **UX:** Intuitive navigation and modern design language (Mantine UI).

## 5. System Architecture
The system follows a **Modular Monolith** architecture with clear boundary separation between modules.
*   **Frontend:** Single Page Application (SPA) served via Next.js.
*   **Backend:** Spring Boot application exposing RESTful APIs.
*   **Database:** Single PostgreSQL instance with schema-based or row-level tenant isolation.
*   **Communication:** REST APIs for synchronous calls; WebSockets for real-time updates.

## 6. Configuration & Environment Variables
The application requires the following environment variables to be configured in `.env` files for both Backend and Frontend.

### 6.1 Backend (`hrms-backend`)
Create a `.env` file in the `hrms-backend` directory or configure these in your deployment environment.

**Database & Cache:**
*   `SPRING_DATASOURCE_URL`: PostgreSQL connection URL (e.g., `jdbc:postgresql://localhost:5432/hrms`)
*   `SPRING_DATASOURCE_USERNAME`: Database username
*   `SPRING_DATASOURCE_PASSWORD`: Database password
*   `SPRING_REDIS_HOST`: Redis host (default: `localhost`)
*   `SPRING_REDIS_PORT`: Redis port (default: `6379`)

**Security & Auth:**
*   `JWT_SECRET`: Secret key for signing JWT tokens (min 32 chars)
*   `JWT_EXPIRATION`: Token expiration time in ms (default: `3600000`)
*   `JWT_REFRESH_EXPIRATION`: Refresh token expiration in ms (default: `86400000`)
*   `GOOGLE_CLIENT_ID`: Google OAuth2 Client ID (for backend validation)
*   `GOOGLE_CLIENT_SECRET`: Google OAuth2 Client Secret
*   `APP_CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `http://localhost:3000`)

**Infrastructure Services:**
*   `MAIL_HOST`: SMTP Server Host (e.g., `smtp.gmail.com`)
*   `MAIL_PORT`: SMTP Server Port (e.g., `587`)
*   `MAIL_USERNAME`: SMTP Username
*   `MAIL_PASSWORD`: SMTP Password/App Password
*   `MAIL_FROM`: Default sender email address
*   `MINIO_ENDPOINT`: S3/MinIO Endpoint URL
*   `MINIO_ACCESS_KEY`: S3/MinIO Access Key
*   `MINIO_SECRET_KEY`: S3/MinIO Secret Key
*   `MINIO_BUCKET`: Default storage bucket name

**Integrations (Optional/Mockable):**
*   `OPENAI_API_KEY`: API Key for AI features
*   `TWILIO_ACCOUNT_SID`: Twilio Account SID (for SMS)
*   `TWILIO_AUTH_TOKEN`: Twilio Auth Token
*   `SLACK_WEBHOOK_URL`: Slack Webhook URL for notifications
*   `SLACK_BOT_TOKEN`: Slack Bot Token

### 6.2 Frontend (`hrms-frontend`)
Create a `.env.local` file in the `hrms-frontend` directory.

*   `NEXT_PUBLIC_API_URL`: Backend API Base URL (e.g., `http://localhost:8080/api/v1`)
*   `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth2 Client ID (for frontend login widget)

## 7. Implementation Roadmap & Prioritization (Revised Post-Audit)

Core modules like Shifts, Assets, Loans, and Tax are implemented. Remaining gaps and priorities are
tracked in `BACKLOG.md`, which is the single source of truth for what is still pending.

See: `BACKLOG.md`
