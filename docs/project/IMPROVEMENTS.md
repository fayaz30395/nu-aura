# HRMS Backend - Improvements Documentation

This document outlines all the improvements made to the HRMS backend application across five key areas: Testing & Quality, Features, DevOps & Deployment, Security, and Frontend Integration.

---

## Table of Contents

1. [Testing & Quality](#1-testing--quality)
2. [Features](#2-features)
3. [DevOps & Deployment](#3-devops--deployment)
4. [Security](#4-security)
5. [Frontend Integration](#5-frontend-integration)
6. [Known Issues & Recommendations](#6-known-issues--recommendations)

---

## 1. Testing & Quality

### 1.1 API Documentation (OpenAPI/Swagger)

**File:** `src/main/java/com/hrms/common/config/OpenApiConfig.java`

Enhanced API documentation with:
- Comprehensive API information (title, description, version, contact, license)
- JWT Bearer authentication security scheme
- Tenant ID header configuration
- API tags for all modules (Authentication, Employees, Departments, Leave, Attendance, Payroll, etc.)
- Multiple server configurations (Development, Staging, Production)

**Access Swagger UI:** `http://localhost:8080/swagger-ui.html`

### 1.2 Test Configuration

**File:** `src/test/java/com/hrms/config/TestCacheConfig.java`

Replaces Redis with in-memory cache for tests:
```java
@Configuration
@Profile("test")
public class TestCacheConfig {
    @Bean
    @Primary
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
            "employees", "departments", "leaveTypes",
            "leaveBalances", "users", "roles", "permissions", "analytics"
        );
    }
}
```

**File:** `src/test/resources/application-test.yml`

Test profile configuration:
- H2 in-memory database with PostgreSQL compatibility mode
- Disabled Redis auto-configuration
- Disabled Liquibase (uses Hibernate DDL for tests)
- Disabled external service health checks
- Test JWT secret configuration

**File:** `src/test/resources/schema-h2.sql`

H2 schema initialization for PostgreSQL compatibility:
```sql
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "pm";
CREATE DOMAIN IF NOT EXISTS "TEXT" AS VARCHAR(10485760);
```

### 1.3 E2E Test Files

Located in `src/test/java/com/hrms/e2e/`:
- `AnalyticsE2ETest.java` - Dashboard and metrics tests
- `AttendanceE2ETest.java` - Attendance marking and records
- `AuthenticationE2ETest.java` - Login, JWT, permissions
- `LeaveRequestE2ETest.java` - Leave workflow tests
- `PayrollE2ETest.java` - Payroll processing tests
- `ValidationAndLoggingE2ETest.java` - Input validation tests
- `WebSocketE2ETest.java` - Real-time notification tests

---

## 2. Features

### 2.1 Email Notification Service

**File:** `src/main/java/com/hrms/application/notification/service/EmailNotificationService.java`

Async email service with Thymeleaf template support:

```java
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    // Simple text email
    @Async
    public void sendSimpleEmail(String to, String subject, String body);

    // HTML email with template
    @Async
    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables);

    // Leave notifications
    public void notifyLeaveRequestSubmitted(...);
    public void notifyManagerLeaveRequest(...);
    public void notifyLeaveApproved(...);
    public void notifyLeaveRejected(...);

    // Payroll notifications
    public void notifyPayslipAvailable(...);

    // Account notifications
    public void sendWelcomeEmail(...);
    public void sendPasswordResetEmail(...);
    public void sendPasswordChangedEmail(...);

    // Other notifications
    public void sendAttendanceReminder(...);
    public void sendAnnouncement(...);
}
```

### 2.2 Email Templates

Located in `src/main/resources/templates/email/`:

| Template | Purpose |
|----------|---------|
| `welcome.html` | New employee welcome with temporary password |
| `password-reset.html` | Password reset link with expiry |
| `password-changed.html` | Password change confirmation |
| `leave-request-status.html` | Leave submission/approval/rejection |
| `leave-pending-approval.html` | Manager notification for pending leave |
| `payslip-available.html` | Monthly payslip notification |
| `attendance-reminder.html` | Daily attendance reminder |
| `announcement.html` | Company-wide announcements |

### 2.3 Audit Logging

**Existing Implementation:** `src/main/java/com/hrms/application/audit/service/AuditLogService.java`

Features:
- Async audit log creation
- Security event logging (login, logout, failed attempts)
- Entity change tracking with old/new values
- IP address and user agent capture
- Tenant-aware queries
- Statistics and reporting

---

## 3. DevOps & Deployment

### 3.1 Docker Configuration

**File:** `Dockerfile`

Multi-stage build with:
```dockerfile
# Build stage with dependency caching
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -g 1001 -S hrms && adduser -u 1001 -S hrms -G hrms
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN chown -R hrms:hrms /app
USER hrms

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM optimization for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### 3.2 Docker Compose

**File:** `docker-compose.yml`

Full stack deployment:

| Service | Port | Description |
|---------|------|-------------|
| `hrms-backend` | 8080 | Spring Boot application |
| `postgres` | 5432 | PostgreSQL 15 database |
| `redis` | 6379 | Redis 7 cache |
| `minio` | 9000, 9001 | MinIO object storage |
| `pgadmin` | 5050 | Database management UI |

Features:
- Health checks for all services
- Named volumes for data persistence
- Environment variable configuration
- Network isolation

**Usage:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f hrms-backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### 3.3 CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`

GitHub Actions workflow with:

**Jobs:**
1. **Build & Test**
   - PostgreSQL service container
   - Maven build with test coverage
   - Artifact upload

2. **Code Quality**
   - Code analysis and linting

3. **Security Scan**
   - OWASP Dependency Check

4. **Docker Build**
   - Multi-platform image build
   - Push to GitHub Container Registry

5. **Deploy Staging** (on develop branch)
   - Automated staging deployment

6. **Deploy Production** (on main branch)
   - Manual approval required
   - Production deployment

### 3.4 Database Initialization

**File:** `docker/init-db.sql`

PostgreSQL initialization script:
- UUID extension
- Maintenance functions (cleanup_old_audit_logs, archive_old_attendance)
- Active employees view

---

## 4. Security

### 4.1 API Key Authentication

**Entity:** `src/main/java/com/hrms/common/security/ApiKey.java`

```java
@Entity
@Table(name = "api_keys")
public class ApiKey extends TenantAware {
    private String name;
    private String description;
    private String keyHash;        // BCrypt hashed
    private String keyPrefix;      // First 8 chars for identification
    private Set<String> scopes;    // Permissions
    private Boolean isActive;
    private LocalDateTime expiresAt;
    private LocalDateTime lastUsedAt;
    private String lastUsedIp;
    private Integer rateLimit;     // Default: 1000
    private Integer rateLimitWindowSeconds; // Default: 3600
}
```

**Service:** `src/main/java/com/hrms/common/security/ApiKeyService.java`

```java
@Service
public class ApiKeyService {
    // Create new API key (returns raw key only once)
    public ApiKeyCreationResult createApiKey(name, description, scopes, expiresAt, tenantId, createdBy);

    // Validate API key
    public Optional<ApiKey> validateApiKey(String rawKey, String clientIp);

    // Management
    public List<ApiKey> getApiKeysByTenant(UUID tenantId);
    public void revokeApiKey(UUID keyId, UUID tenantId);
    public ApiKey updateScopes(UUID keyId, UUID tenantId, Set<String> newScopes);
    public ApiKeyCreationResult regenerateApiKey(UUID keyId, UUID tenantId, UUID userId);
    public void deleteApiKey(UUID keyId, UUID tenantId);
}
```

**Filter:** `src/main/java/com/hrms/common/security/ApiKeyAuthenticationFilter.java`

- Intercepts requests to `/api/v1/external/*`
- Validates `X-API-Key` header
- Creates Spring Security authentication with scopes

**Controller:** `src/main/java/com/hrms/common/security/ApiKeyController.java`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/api-keys` | POST | Create new API key |
| `/api/v1/admin/api-keys` | GET | List API keys |
| `/api/v1/admin/api-keys/{id}` | DELETE | Revoke API key |
| `/api/v1/admin/api-keys/{id}/regenerate` | POST | Regenerate API key |
| `/api/v1/admin/api-keys/{id}/scopes` | PUT | Update scopes |
| `/api/v1/admin/api-keys/{id}/permanent` | DELETE | Permanently delete |

### 4.2 Rate Limiting

**File:** `src/main/java/com/hrms/common/security/RateLimitingFilter.java`

Bucket4j-based rate limiting:

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    // Default: 60 requests/minute for anonymous
    // 120 requests/minute for authenticated users
    // 300 requests/minute for API keys

    // Response headers:
    // X-Rate-Limit-Remaining: tokens left
    // Retry-After: seconds until reset (when limited)
}
```

**Configuration (application.yml):**
```yaml
app:
  rate-limit:
    enabled: true
    requests-per-minute: 60
```

### 4.3 Database Migration

**File:** `src/main/resources/db/changelog/changes/103-create-api-keys-table.xml`

Creates:
- `api_keys` table with all fields
- `api_key_scopes` junction table
- Indexes for performance
- Foreign key to tenants

---

## 5. Frontend Integration

### 5.1 WebSocket Configuration

**File:** `src/main/java/com/hrms/config/WebSocketConfig.java`

STOMP over WebSocket for real-time notifications:

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    // Endpoint: /ws (with SockJS fallback)
    // Subscribe prefix: /topic
    // Send prefix: /app
}
```

**Client Connection Example:**
```javascript
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, function(frame) {
    // Subscribe to broadcasts
    stompClient.subscribe('/topic/broadcast', function(message) {
        console.log('Received:', JSON.parse(message.body));
    });

    // Subscribe to user-specific notifications
    stompClient.subscribe('/topic/user/' + userId, function(message) {
        console.log('Personal notification:', JSON.parse(message.body));
    });
});
```

### 5.2 Notification Service

**File:** `src/main/java/com/hrms/application/notification/service/WebSocketNotificationService.java`

```java
@Service
public class WebSocketNotificationService {
    public void sendToUser(String recipientId, NotificationMessage message);
    public void broadcast(NotificationMessage message);
    public void notifyLeaveStatusChange(UUID recipientId, String status, String leaveType);
    public void notifyAttendanceMarked(UUID employeeId);
    public void notifyPayslipGenerated(UUID employeeId, String month, String year);
}
```

---

## 6. Test Results & Recommendations

### 6.1 E2E Test Results

All **97 E2E tests pass successfully**:

| Test Class | Tests | Status |
|------------|-------|--------|
| `AnalyticsE2ETest` | 10 | PASSED |
| `AttendanceE2ETest` | 10 | PASSED |
| `AuthenticationE2ETest` | 13 | PASSED |
| `LeaveRequestE2ETest` | 12 | PASSED |
| `PayrollE2ETest` | 13 | PASSED |
| `ValidationAndLoggingE2ETest` | 24 | PASSED |
| `WebSocketNotificationE2ETest` | 15 | PASSED |
| **Total** | **97** | **PASSED** |

**Run tests:**
```bash
mvn test -Dtest="*E2ETest"
```

### 6.2 H2 PostgreSQL Compatibility

The test configuration handles H2/PostgreSQL compatibility with:
- `globally_quoted_identifiers: true` - Escapes reserved keywords
- `schema-h2.sql` - Creates required schemas (public, pm) and TEXT domain
- `spring.cache.cache-names` - Explicitly defines cache names for tests

### 6.3 Production Checklist

Before deploying to production:

- [ ] Update JWT secret in environment variables
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure email SMTP settings
- [ ] Set up Redis cluster for high availability
- [ ] Configure MinIO with proper credentials
- [ ] Set up database backups
- [ ] Configure monitoring (Prometheus, Grafana)
- [ ] Set up log aggregation (ELK stack)
- [ ] Review rate limiting settings
- [ ] Audit API key permissions

---

## File Structure Summary

```
hrms-backend/
├── .github/
│   └── workflows/
│       └── ci-cd.yml                    # CI/CD pipeline
├── docker/
│   └── init-db.sql                      # Database initialization
├── src/
│   ├── main/
│   │   ├── java/com/hrms/
│   │   │   ├── application/notification/service/
│   │   │   │   ├── EmailNotificationService.java
│   │   │   │   └── WebSocketNotificationService.java
│   │   │   ├── common/
│   │   │   │   ├── config/
│   │   │   │   │   ├── CacheConfig.java
│   │   │   │   │   └── OpenApiConfig.java
│   │   │   │   └── security/
│   │   │   │       ├── ApiKey.java
│   │   │   │       ├── ApiKeyAuthenticationFilter.java
│   │   │   │       ├── ApiKeyController.java
│   │   │   │       ├── ApiKeyRepository.java
│   │   │   │       ├── ApiKeyService.java
│   │   │   │       └── RateLimitingFilter.java
│   │   │   └── config/
│   │   │       └── WebSocketConfig.java
│   │   └── resources/
│   │       ├── db/changelog/changes/
│   │       │   └── 103-create-api-keys-table.xml
│   │       └── templates/email/
│   │           ├── announcement.html
│   │           ├── attendance-reminder.html
│   │           ├── leave-pending-approval.html
│   │           ├── leave-request-status.html
│   │           ├── password-changed.html
│   │           ├── password-reset.html
│   │           ├── payslip-available.html
│   │           └── welcome.html
│   └── test/
│       ├── java/com/hrms/
│       │   ├── config/
│       │   │   └── TestCacheConfig.java
│       │   └── e2e/
│       │       ├── AnalyticsE2ETest.java
│       │       ├── AttendanceE2ETest.java
│       │       ├── AuthenticationE2ETest.java
│       │       ├── LeaveRequestE2ETest.java
│       │       ├── PayrollE2ETest.java
│       │       ├── ValidationAndLoggingE2ETest.java
│       │       └── WebSocketE2ETest.java
│       └── resources/
│           ├── application-test.yml
│           └── schema-h2.sql
├── docker-compose.yml
├── Dockerfile
└── IMPROVEMENTS.md                      # This file
```

---

## 7. RBAC Enhancements & Pre-boarding Portal

### 7.1 Specialized Roles (Keka-equivalent)

**File:** `src/main/java/com/hrms/common/security/RoleHierarchy.java`

Added 10 specialized roles with complete permission sets:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `PAYROLL_ADMIN` | Payroll and compensation management | Full payroll access |
| `RECRUITMENT_ADMIN` | Talent acquisition and onboarding | Recruitment, job postings |
| `PROJECT_ADMIN` | Project and timesheet management | Project CRUD, time tracking |
| `ASSET_MANAGER` | IT asset tracking | Asset management |
| `EXPENSE_MANAGER` | Expense approval | Expense CRUD, approval |
| `HELPDESK_ADMIN` | Support ticket management | Helpdesk admin |
| `TRAVEL_ADMIN` | Travel request management | Travel admin |
| `COMPLIANCE_OFFICER` | Compliance and policy management | Compliance, audit |
| `LMS_ADMIN` | Learning management | Training, courses |
| `INTERN` | Limited trainee access | Self-view, attendance |

### 7.2 Implicit Roles

**File:** `src/main/java/com/hrms/application/user/service/ImplicitRoleService.java`

Auto-assigned roles based on employee relationships:

| Role | Trigger | Permissions |
|------|---------|-------------|
| `REPORTING_MANAGER` | Has direct reports | View/approve team leave, attendance |
| `SKIP_LEVEL_MANAGER` | Has 2nd-level reports | Extended team view |
| `DEPARTMENT_HEAD` | Heads a department | Department management |
| `MENTOR` | Assigned as mentor | Mentee view access |
| `INTERVIEWER` | On interview panel | Interview scheduling |
| `PERFORMANCE_REVIEWER` | Review assignee | Performance input |
| `ONBOARDING_BUDDY` | Assigned as buddy | New hire assistance |

### 7.3 Field-Level Permissions

**File:** `src/main/java/com/hrms/common/security/FieldPermission.java`

Fine-grained access control for sensitive data:

```java
public final class FieldPermission {
    public static final String EMPLOYEE_SALARY_VIEW = "FIELD:EMPLOYEE:SALARY:VIEW";
    public static final String EMPLOYEE_SALARY_EDIT = "FIELD:EMPLOYEE:SALARY:EDIT";
    public static final String EMPLOYEE_BANK_VIEW = "FIELD:EMPLOYEE:BANK:VIEW";
    public static final String EMPLOYEE_BANK_EDIT = "FIELD:EMPLOYEE:BANK:EDIT";
    public static final String EMPLOYEE_TAX_ID_VIEW = "FIELD:EMPLOYEE:TAX_ID:VIEW";
    public static final String EMPLOYEE_ID_DOCS_VIEW = "FIELD:EMPLOYEE:ID_DOCS:VIEW";
}
```

### 7.4 Pre-boarding Portal

Complete pre-boarding system for new hires to complete paperwork before joining.

**Backend:**

| File | Description |
|------|-------------|
| `domain/preboarding/PreboardingCandidate.java` | Entity with personal info, bank details, document status |
| `infrastructure/preboarding/repository/PreboardingCandidateRepository.java` | JPA repository |
| `application/preboarding/service/PreboardingService.java` | Business logic |
| `api/preboarding/controller/PreboardingController.java` | REST endpoints |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/preboarding/candidates` | POST | Create invitation |
| `/api/v1/preboarding/candidates` | GET | List all candidates |
| `/api/v1/preboarding/candidates/status/{status}` | GET | Filter by status |
| `/api/v1/preboarding/candidates/upcoming` | GET | Upcoming joiners |
| `/api/v1/preboarding/candidates/{id}/cancel` | POST | Cancel invitation |
| `/api/v1/preboarding/candidates/{id}/resend` | POST | Resend invitation |
| `/api/v1/preboarding/portal/{token}` | GET | Public: Get candidate data |
| `/api/v1/preboarding/portal/{token}/personal-info` | PUT | Public: Update info |
| `/api/v1/preboarding/portal/{token}/bank-details` | PUT | Public: Update bank |
| `/api/v1/preboarding/portal/{token}/sign-offer` | POST | Public: Sign offer |

**Frontend:**

| File | Description |
|------|-------------|
| `app/preboarding/page.tsx` | Admin dashboard for managing candidates |
| `app/preboarding/portal/[token]/page.tsx` | Public portal for candidates |

**Features:**
- Token-based secure access for candidates
- Step-by-step completion (Personal Info → Bank Details → Documents → Offer Letter)
- Progress tracking with completion percentage
- Document upload placeholders
- Offer letter signing
- Automatic status transitions

---

## 8. Frontend Enhancements

### 8.1 New Components

| Component | Path | Description |
|-----------|------|-------------|
| `ToastProvider` | `components/providers/ToastProvider.tsx` | Toast notification context |
| `WebSocketProvider` | `components/providers/WebSocketProvider.tsx` | Real-time notifications |
| `FileUpload` | `components/ui/FileUpload.tsx` | File upload with progress |
| `Label` | `components/ui/Label.tsx` | Form label component |

### 8.2 Integration Services

| Service | Path | Description |
|---------|------|-------------|
| `SlackNotificationService` | `application/notification/service/SlackNotificationService.java` | Slack webhook integration |
| `FileStorageService` | `application/document/service/FileStorageService.java` | MinIO file storage |
| `ReportGenerationService` | `application/report/service/ReportGenerationService.java` | PDF report generation |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-19 | Initial improvements documentation |
| 1.1.0 | 2025-12-22 | RBAC enhancements, Pre-boarding portal, Frontend components |

---

*Generated for HRMS Backend v1.1.0*
