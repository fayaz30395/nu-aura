# Security Requirements Document

## 1. Overview

This document outlines the security requirements, standards, and implementation guidelines for the NU-AURA HRMS platform. Security is a foundational concern given the sensitive nature of HR data including personal information, financial records, and organizational data.

### 1.1 Security Objectives

| Objective | Description |
|-----------|-------------|
| **Confidentiality** | Protect sensitive data from unauthorized access |
| **Integrity** | Ensure data accuracy and prevent unauthorized modifications |
| **Availability** | Maintain system uptime and accessibility |
| **Accountability** | Track and audit all actions for compliance |
| **Non-repudiation** | Ensure actions cannot be denied by users |

### 1.2 Compliance Standards

- OWASP Top 10 (2021)
- GDPR (General Data Protection Regulation)
- SOC 2 Type II readiness
- ISO 27001 alignment

---

## 2. Authentication

### 2.1 Password Policy

| Requirement | Specification |
|-------------|---------------|
| Minimum Length | 12 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 digit, 1 special character |
| History | Cannot reuse last 5 passwords |
| Expiration | 90 days (configurable) |
| Failed Attempts | Account lock after 5 failed attempts |
| Lockout Duration | 15 minutes (progressive increase) |

```java
// Password validation regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$
```

### 2.2 Password Storage

- **Algorithm**: BCrypt with cost factor 12
- **Salt**: Automatically generated per password
- **Never store**: Plain text or reversibly encrypted passwords

```java
// Password hashing
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
String hashedPassword = encoder.encode(rawPassword);
```

### 2.3 JWT Token Security

#### Token Configuration

| Property | Access Token | Refresh Token |
|----------|--------------|---------------|
| Algorithm | HS512 | HS512 |
| Expiration | 1 hour | 24 hours |
| Secret Length | 64+ bytes | 64+ bytes |
| Storage | Memory/Secure Cookie | HTTP-only Cookie |

#### Token Structure

```json
// JWT Payload
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenantId": "tenant-uuid",
  "roles": ["EMPLOYEE", "MANAGER"],
  "permissions": ["EMPLOYEE_VIEW", "LEAVE_APPROVE"],
  "iat": 1704978000,
  "exp": 1704981600
}
```

#### Token Security Measures

1. **Secure Generation**: Use cryptographically secure random number generator
2. **Signature Verification**: Validate signature on every request
3. **Expiration Check**: Reject expired tokens
4. **Token Revocation**: Maintain blacklist for invalidated tokens
5. **Refresh Rotation**: Issue new refresh token on each refresh

### 2.4 Google SSO Security

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE SSO FLOW (PKCE)                            │
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Client  │───▶│ Auth Request │───▶│   Google     │              │
│  │          │    │ + Code       │    │   OAuth2     │              │
│  │          │    │   Challenge  │    │              │              │
│  └──────────┘    └──────────────┘    └──────────────┘              │
│       │                                     │                       │
│       │◀────────────────────────────────────┘                       │
│       │          Authorization Code                                 │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    Token Exchange                         │      │
│  │  Authorization Code + Code Verifier → ID Token           │      │
│  └──────────────────────────────────────────────────────────┘      │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Backend Token Validation                     │      │
│  │  1. Verify ID Token signature with Google public keys    │      │
│  │  2. Validate issuer (accounts.google.com)                │      │
│  │  3. Validate audience (our client ID)                    │      │
│  │  4. Check expiration                                     │      │
│  │  5. Match email domain (if restricted)                   │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 Session Management

| Requirement | Implementation |
|-------------|----------------|
| Session Timeout | 30 minutes inactivity |
| Concurrent Sessions | Configurable limit (default: 3) |
| Session Binding | IP + User Agent fingerprint |
| Secure Cookies | HttpOnly, Secure, SameSite=Strict |
| Session Invalidation | On logout, password change, role change |

---

## 3. Authorization (RBAC)

### 3.1 Role Hierarchy

```
SUPER_ADMIN
    │
    ├── HR_ADMIN
    │       │
    │       └── HR_EXECUTIVE
    │
    └── MANAGER
            │
            └── EMPLOYEE
```

### 3.2 Permission Categories

| Category | Actions | Example Permissions |
|----------|---------|---------------------|
| Employee | VIEW, CREATE, EDIT, DELETE | EMPLOYEE_VIEW, EMPLOYEE_CREATE |
| Attendance | VIEW, CREATE, EDIT, APPROVE | ATTENDANCE_VIEW, ATTENDANCE_APPROVE |
| Leave | VIEW, CREATE, EDIT, APPROVE, CANCEL | LEAVE_VIEW, LEAVE_APPROVE |
| Payroll | VIEW, PROCESS, APPROVE, EXPORT | PAYROLL_VIEW, PAYROLL_PROCESS |
| Performance | VIEW, CREATE, EDIT, APPROVE | GOALS_VIEW, REVIEWS_APPROVE |
| Settings | VIEW, EDIT | SETTINGS_VIEW, SETTINGS_EDIT |
| Reports | VIEW, EXPORT | REPORTS_VIEW, REPORTS_EXPORT |

### 3.3 Scope-Based Access Control

```java
// Permission check with scope
@RequiresPermission(value = "EMPLOYEE_VIEW", scope = "DEPARTMENT")
public List<Employee> getEmployees() {
    // Returns only employees in user's department
}

// Scope levels
public enum Scope {
    GLOBAL,      // All data across organization
    LOCATION,    // Data for specific location(s)
    DEPARTMENT,  // Data for specific department(s)
    TEAM,        // Data for direct/indirect reports
    OWN          // User's own data only
}
```

### 3.4 Method-Level Security

```java
// Using custom annotation
@RequiresPermission("LEAVE_APPROVE")
public LeaveRequest approveLeave(UUID requestId) { }

// Spring Security expression
@PreAuthorize("hasPermission(#employeeId, 'Employee', 'EDIT')")
public Employee updateEmployee(UUID employeeId, EmployeeRequest request) { }
```

### 3.5 Data-Level Security

```sql
-- Automatic tenant filtering via Hibernate filter
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = UUID.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Employee { }
```

---

## 4. Data Protection

### 4.1 Encryption

#### Data at Rest

| Data Type | Encryption | Implementation |
|-----------|------------|----------------|
| Database | AES-256 | Cloud provider encryption |
| File Storage | AES-256 | MinIO/S3 server-side encryption |
| Backups | AES-256 | Encrypted backup files |
| Sensitive Fields | AES-256-GCM | Application-level encryption |

```java
// Sensitive field encryption
@Convert(converter = EncryptedStringConverter.class)
private String bankAccountNumber;

@Convert(converter = EncryptedStringConverter.class)
private String aadhaarNumber;
```

#### Data in Transit

| Protocol | Configuration |
|----------|---------------|
| TLS Version | 1.2 or 1.3 only |
| Cipher Suites | Strong ciphers only (ECDHE, AES-GCM) |
| Certificate | Valid SSL certificate |
| HSTS | Strict-Transport-Security header |

```nginx
# Nginx TLS configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 4.2 Personal Data Handling (GDPR)

#### Data Classification

| Category | Examples | Handling |
|----------|----------|----------|
| PII (Personal) | Name, email, phone | Standard encryption |
| Sensitive PII | SSN, bank details, health data | Enhanced encryption + access logging |
| Public | Job title, department | Standard protection |

#### Data Subject Rights

| Right | Implementation |
|-------|----------------|
| Access | Export personal data API |
| Rectification | Self-service profile edit |
| Erasure | Data anonymization on request |
| Portability | JSON/CSV export |
| Objection | Consent management settings |

### 4.3 Data Masking

```java
// Response DTO with masked data
public class EmployeeResponse {
    private String email;           // Full email
    private String phone;           // Masked: +1234****90
    private String bankAccount;     // Masked: ****1234
    private String aadhaar;         // Masked: XXXX-XXXX-1234
}

// Masking utility
public static String maskBankAccount(String account) {
    return "****" + account.substring(account.length() - 4);
}
```

---

## 5. Input Validation & Sanitization

### 5.1 Validation Rules

```java
// Request validation using Jakarta Validation
public class EmployeeRequest {
    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$")
    private String phone;

    @Past
    private LocalDate dateOfBirth;

    @Valid
    private AddressRequest address;
}
```

### 5.2 SQL Injection Prevention

```java
// Use parameterized queries (JPA)
@Query("SELECT e FROM Employee e WHERE e.tenantId = :tenantId AND e.email = :email")
Optional<Employee> findByEmail(@Param("tenantId") UUID tenantId, @Param("email") String email);

// NEVER concatenate user input in queries
// BAD: "SELECT * FROM employees WHERE email = '" + email + "'"
```

### 5.3 XSS Prevention

```java
// HTML sanitization for rich text fields
public class HtmlSanitizer {
    private static final PolicyFactory POLICY = Sanitizers.FORMATTING
        .and(Sanitizers.LINKS)
        .and(Sanitizers.BLOCKS);

    public static String sanitize(String input) {
        return POLICY.sanitize(input);
    }
}

// Content Security Policy header
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

### 5.4 File Upload Security

```java
// Allowed file types
private static final Set<String> ALLOWED_TYPES = Set.of(
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
);

// File validation
public void validateFile(MultipartFile file) {
    // Check file size (max 10MB)
    if (file.getSize() > 10 * 1024 * 1024) {
        throw new ValidationException("File size exceeds limit");
    }

    // Verify MIME type
    String contentType = file.getContentType();
    if (!ALLOWED_TYPES.contains(contentType)) {
        throw new ValidationException("File type not allowed");
    }

    // Scan file content (magic bytes)
    byte[] header = Arrays.copyOf(file.getBytes(), 8);
    if (!verifyMagicBytes(header, contentType)) {
        throw new ValidationException("File content mismatch");
    }

    // Virus scan (if available)
    virusScanner.scan(file);
}
```

---

## 6. API Security

### 6.1 Rate Limiting

```java
// Rate limit configuration using Bucket4j
@Configuration
public class RateLimitConfig {

    // 100 requests per minute for regular endpoints
    public Bucket createStandardBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build();
    }

    // 5 requests per minute for authentication
    public Bucket createAuthBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1))))
            .build();
    }
}
```

### 6.2 CORS Configuration

```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "https://app.nuaura.com",
            "https://admin.nuaura.com"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Tenant-ID"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
```

### 6.3 Security Headers

```java
// Security headers configuration
@Configuration
public class SecurityHeadersConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"))
            .frameOptions(frame -> frame.deny())
            .xssProtection(xss -> xss.enable())
            .contentTypeOptions(Customizer.withDefaults())
            .referrerPolicy(referrer -> referrer
                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
            .permissionsPolicy(permissions -> permissions
                .policy("geolocation=(self), microphone=(), camera=()"))
        );
        return http.build();
    }
}
```

#### Required Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | default-src 'self' | Prevent XSS |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | Browser XSS protection |
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer |

### 6.4 Request Validation

```java
// Request sanitization filter
@Component
public class RequestSanitizationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        // Validate Content-Type
        String contentType = request.getContentType();
        if (contentType != null && !contentType.startsWith("application/json")) {
            response.sendError(415, "Unsupported Media Type");
            return;
        }

        // Validate request size
        if (request.getContentLength() > 1024 * 1024) {  // 1MB
            response.sendError(413, "Request too large");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
```

---

## 7. Audit & Logging

### 7.1 Audit Events

| Event Category | Events Logged |
|----------------|---------------|
| Authentication | Login, logout, failed login, password change |
| Authorization | Permission denied, role change |
| Data Access | View sensitive data, export data |
| Data Modification | Create, update, delete operations |
| Administrative | User creation, role assignment, settings change |

### 7.2 Audit Log Format

```json
{
  "timestamp": "2026-01-11T10:30:00.000Z",
  "eventType": "DATA_ACCESS",
  "action": "VIEW",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "entityType": "Employee",
  "entityId": "emp-789",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-abc-123",
  "details": {
    "fields": ["salary", "bankAccount"]
  },
  "result": "SUCCESS"
}
```

### 7.3 Audit Implementation

```java
@Aspect
@Component
public class AuditAspect {

    @Autowired
    private AuditLogService auditLogService;

    @Around("@annotation(Audited)")
    public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
        AuditContext context = buildContext(joinPoint);

        try {
            Object result = joinPoint.proceed();
            auditLogService.logSuccess(context, result);
            return result;
        } catch (Exception e) {
            auditLogService.logFailure(context, e);
            throw e;
        }
    }
}

// Usage
@Audited(action = "VIEW", entityType = "Employee")
public Employee getEmployee(UUID id) { }
```

### 7.4 Log Security

- **No Sensitive Data**: Never log passwords, tokens, or PII
- **Log Integrity**: Write-once, append-only logs
- **Log Retention**: 90 days online, 1 year archived
- **Access Control**: Restricted access to audit logs
- **Tamper Detection**: Log checksums

```java
// Sensitive data filtering
public class LoggingFilter {
    private static final Set<String> SENSITIVE_FIELDS = Set.of(
        "password", "token", "secret", "creditCard", "ssn"
    );

    public String sanitize(String logMessage) {
        for (String field : SENSITIVE_FIELDS) {
            logMessage = logMessage.replaceAll(
                "\"" + field + "\":\\s*\"[^\"]*\"",
                "\"" + field + "\":\"[REDACTED]\""
            );
        }
        return logMessage;
    }
}
```

---

## 8. Multi-Tenancy Security

### 8.1 Tenant Isolation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TENANT ISOLATION LAYERS                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Application Layer                          │   │
│  │  • Tenant header validation                                   │   │
│  │  • TenantContext propagation                                  │   │
│  │  • Cross-tenant request rejection                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Service Layer                              │   │
│  │  • Tenant-aware service methods                               │   │
│  │  • Automatic tenant filtering                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                                 │   │
│  │  • Hibernate tenant filter                                    │   │
│  │  • Row-level security                                         │   │
│  │  • tenant_id on all queries                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Tenant Validation

```java
@Component
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        String tenantId = request.getHeader("X-Tenant-ID");

        // Validate tenant header exists
        if (tenantId == null || tenantId.isBlank()) {
            response.sendError(400, "Missing tenant ID");
            return;
        }

        // Validate tenant ID format
        UUID tenantUuid;
        try {
            tenantUuid = UUID.fromString(tenantId);
        } catch (IllegalArgumentException e) {
            response.sendError(400, "Invalid tenant ID format");
            return;
        }

        // Validate tenant exists and is active
        if (!tenantService.isValidTenant(tenantUuid)) {
            response.sendError(403, "Invalid or inactive tenant");
            return;
        }

        // Validate user belongs to tenant
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && !userBelongsToTenant(auth, tenantUuid)) {
            response.sendError(403, "Access denied to this tenant");
            return;
        }

        TenantContext.setCurrentTenant(tenantUuid);
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
```

---

## 9. Infrastructure Security

### 9.1 Network Security

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NETWORK ARCHITECTURE                              │
│                                                                      │
│  ┌─────────────┐                                                    │
│  │  Internet   │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WAF / DDoS Protection                     │   │
│  │                    (Cloud Armor / Cloudflare)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Load Balancer (HTTPS only)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Private Network / VPC                     │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │   │
│  │  │  App Servers  │  │   Database    │  │    Redis      │    │   │
│  │  │  (Internal)   │  │  (Private)    │  │  (Private)    │    │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Kubernetes Security

```yaml
# Pod Security Policy
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: MustRunAs
    ranges:
      - min: 1
        max: 65535
  volumes:
    - 'configMap'
    - 'secret'
    - 'emptyDir'
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

### 9.3 Secret Management

```yaml
# Kubernetes secrets (encrypted at rest)
apiVersion: v1
kind: Secret
metadata:
  name: hrms-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded>
  db-password: <base64-encoded>
  google-client-secret: <base64-encoded>

# Mount as environment variables
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: hrms-secrets
        key: jwt-secret
```

---

## 10. Vulnerability Management

### 10.1 Dependency Scanning

```xml
<!-- OWASP Dependency Check -->
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>8.4.0</version>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
    </configuration>
</plugin>
```

### 10.2 Security Testing Checklist

| Test Type | Frequency | Tools |
|-----------|-----------|-------|
| SAST (Static Analysis) | Every commit | SonarQube, CodeQL |
| DAST (Dynamic Analysis) | Weekly | OWASP ZAP |
| Dependency Scan | Daily | OWASP Dependency Check |
| Penetration Testing | Quarterly | Manual + Burp Suite |
| Infrastructure Scan | Monthly | Nessus, AWS Inspector |

### 10.3 Incident Response

1. **Detection**: Automated alerts from monitoring
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze logs and impact
4. **Eradication**: Remove threat
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Post-incident review

---

## 11. Security Checklist

### Pre-Deployment

- [ ] All dependencies updated to latest secure versions
- [ ] Security headers configured correctly
- [ ] HTTPS enforced with valid certificate
- [ ] Rate limiting enabled
- [ ] CORS configured for production domains only
- [ ] Debug mode disabled
- [ ] Error messages sanitized (no stack traces)
- [ ] Secrets not hardcoded
- [ ] Audit logging enabled

### Ongoing

- [ ] Weekly dependency vulnerability scans
- [ ] Monthly access review
- [ ] Quarterly penetration testing
- [ ] Annual security training for developers
- [ ] Regular backup testing
- [ ] Incident response drills

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
