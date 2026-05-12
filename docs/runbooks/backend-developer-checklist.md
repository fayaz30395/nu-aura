# Backend Developer Checklist

## Pre-Commit

- [ ] `./mvnw test` — all tests pass
- [ ] No new `@SuppressWarnings` or disabled tests without justification
- [ ] All new endpoints have `@RequiresPermission` annotation
- [ ] All tenant-scoped entities include `tenant_id`
- [ ] DTO mapping uses MapStruct (no manual field-by-field mapping)
- [ ] Input validation via Jakarta Validation annotations (`@NotNull`, `@Size`, etc.)
- [ ] No hardcoded tenant IDs or user IDs

## Sensitive Files (Require Lead Review)

- `SecurityConfig.java` — auth filter chain, CORS, CSRF
- `JwtAuthenticationFilter.java` — token validation
- Any `db/migration/V*.sql` — Flyway migrations (next: V92)

## Test Requirements

- **Framework:** JUnit 5 + Mockito
- **Controller tests:** Use `@WebMvcTest` (not `@SpringBootTest`)
- **Coverage target:** 80% minimum (excludes DTOs, entities, config)
- **Naming convention:** `should[ExpectedBehavior]When[Condition]`
- **All new endpoints must have at least one test**

### Existing Test Coverage

| Controller   | Test Class                   | Methods |
|--------------|------------------------------|---------|
| Employee     | `EmployeeControllerTest`     | 24      |
| LeaveRequest | `LeaveRequestControllerTest` | 24      |
| Payroll      | `PayrollControllerTest`      | 23      |
| Attendance   | `AttendanceControllerTest`   | 23      |
| Role         | `RoleControllerTest`         | 28      |

Total: 122 test methods across 5 controller test classes (~2,700 lines of test code).

## Package Structure

```
com.hrms/
├── api/            # REST Controllers (143 files)
├── application/    # Business Logic Services (209 files)
├── domain/         # Entities & Enums (265 files)
├── infrastructure/ # Repositories (260) + Kafka + WebSocket
└── common/         # Config, security, validation, exceptions
```

## Key Conventions

- Java 21, Spring Boot 3.4.1
- PostgreSQL 16 (Neon cloud for dev)
- Flyway for migrations (V0–V91 applied, next: V92)
- Redis for caching (permissions, rate limiting, sessions)
- Kafka for async events (5 topics + 5 DLT)
- OpenPDF for PDF generation (no jsPDF)
- Apache POI for Excel processing
- JJWT 0.12.6 for JWT handling
- MapStruct 1.6.3 for DTO mapping
- Bucket4j 8.7.0 for rate limiting

## CI/CD

```yaml
# GitHub Actions
java-version: '21'
distribution: 'temurin'
```

```bash
# Local test run
./mvnw test

# With coverage report
./mvnw test jacoco:report
# Report at: target/site/jacoco/index.html
```
