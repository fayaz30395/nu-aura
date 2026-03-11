# Developer Guide

## Getting Started

### Prerequisites

- Java 21 (Corretto, Temurin, or OpenJDK)
- Maven 3.8+
- PostgreSQL 16+
- IDE (IntelliJ IDEA recommended)

### Environment Setup

1. **Install Java 21**
```bash
# macOS with Homebrew
brew install --cask corretto

# Or download from:
# https://docs.aws.amazon.com/corretto/latest/corretto-21-ug/downloads-list.html
```

2. **Set JAVA_HOME**
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-21.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
```

3. **Install PostgreSQL**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb hrms_db
```

### Project Setup

1. **Clone the repository**
```bash
git clone https://github.com/Fayaz-Deen/nulogic-hrms-backend.git
cd nulogic-hrms-backend
```

2. **Configure database**

Create `src/main/resources/application-local.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/hrms_db
    username: your_username
    password: your_password
```

3. **Run the application**
```bash
mvn spring-boot:run -Dspring.profiles.active=local
```

## Project Structure

```
src/main/java/com/hrms/
├── api/                    # REST Controllers (Presentation Layer)
│   ├── analytics/
│   ├── announcement/
│   ├── attendance/
│   └── ...
├── application/            # Business Services (Application Layer)
│   ├── analytics/
│   ├── announcement/
│   └── ...
├── domain/                 # Domain Entities (Domain Layer)
│   ├── announcement/
│   ├── attendance/
│   └── ...
├── infrastructure/         # Repositories & External Services
│   ├── announcement/
│   └── ...
└── common/                 # Shared Utilities
    ├── entity/
    ├── security/
    └── exception/
```

## Architecture

### Layers

1. **API Layer** (`api/`)
   - REST controllers
   - DTOs (Request/Response)
   - Input validation

2. **Application Layer** (`application/`)
   - Business logic
   - Service orchestration
   - Transaction management

3. **Domain Layer** (`domain/`)
   - Entity classes
   - Enums
   - Value objects

4. **Infrastructure Layer** (`infrastructure/`)
   - JPA repositories
   - External service clients
   - Configuration

### Key Patterns

**Repository Pattern**
```java
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<Employee> findByTenantId(UUID tenantId, Pageable pageable);
}
```

**Service Pattern**
```java
@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository repository;

    @Transactional
    public Employee create(EmployeeRequest request) {
        // Business logic
    }
}
```

**DTO Pattern**
```java
@Data
@Builder
public class EmployeeResponse {
    private UUID id;
    private String employeeCode;
    private String firstName;
    // ...

    public static EmployeeResponse from(Employee entity) {
        return EmployeeResponse.builder()
            .id(entity.getId())
            .employeeCode(entity.getEmployeeCode())
            .build();
    }
}
```

## Multi-Tenancy

### How It Works

Every entity extends `TenantAware` for automatic tenant isolation:

```java
@MappedSuperclass
public abstract class TenantAware extends BaseEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
}
```

### Getting Current Tenant

```java
@Component
public class TenantContext {
    private static final ThreadLocal<UUID> currentTenant = new ThreadLocal<>();

    public static UUID getCurrentTenant() {
        return currentTenant.get();
    }
}
```

### Tenant-Aware Queries

```java
// Always filter by tenant
List<Employee> findByTenantIdAndStatus(UUID tenantId, EmployeeStatus status);

// In service layer
public List<Employee> getActiveEmployees() {
    UUID tenantId = TenantContext.getCurrentTenant();
    return repository.findByTenantIdAndStatus(tenantId, EmployeeStatus.ACTIVE);
}
```

## Security

### JWT Authentication

Tokens are issued on login and validated on each request:

```java
@Component
public class JwtTokenProvider {
    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .claim("userId", userId)
            .claim("tenantId", tenantId)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS512, secret)
            .compact();
    }
}
```

### Permission Checking

```java
@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    @GetMapping
    @RequiresPermission("EMPLOYEE:READ")
    public Page<EmployeeResponse> getAllEmployees(Pageable pageable) {
        // ...
    }

    @PostMapping
    @RequiresPermission("EMPLOYEE:CREATE")
    public EmployeeResponse createEmployee(@RequestBody EmployeeRequest request) {
        // ...
    }
}
```

## Creating New Modules

### Step 1: Create Domain Entity

```java
// domain/mymodule/MyEntity.java
@Entity
@Table(name = "my_entities")
@Getter @Setter
public class MyEntity extends TenantAware {
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    private MyStatus status;
}
```

### Step 2: Create Repository

```java
// infrastructure/mymodule/repository/MyEntityRepository.java
@Repository
public interface MyEntityRepository extends JpaRepository<MyEntity, UUID> {
    Page<MyEntity> findByTenantId(UUID tenantId, Pageable pageable);
    Optional<MyEntity> findByIdAndTenantId(UUID id, UUID tenantId);
}
```

### Step 3: Create Service

```java
// application/mymodule/service/MyModuleService.java
@Service
@RequiredArgsConstructor
public class MyModuleService {
    private final MyEntityRepository repository;

    @Transactional(readOnly = true)
    public Page<MyEntityResponse> getAll(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return repository.findByTenantId(tenantId, pageable)
            .map(MyEntityResponse::from);
    }
}
```

### Step 4: Create DTOs

```java
// api/mymodule/dto/MyEntityRequest.java
@Data
public class MyEntityRequest {
    @NotBlank
    private String name;
}

// api/mymodule/dto/MyEntityResponse.java
@Data @Builder
public class MyEntityResponse {
    private UUID id;
    private String name;

    public static MyEntityResponse from(MyEntity entity) {
        return MyEntityResponse.builder()
            .id(entity.getId())
            .name(entity.getName())
            .build();
    }
}
```

### Step 5: Create Controller

```java
// api/mymodule/controller/MyModuleController.java
@RestController
@RequestMapping("/api/v1/my-module")
@RequiredArgsConstructor
public class MyModuleController {
    private final MyModuleService service;

    @GetMapping
    @RequiresPermission("MYMODULE:READ")
    public Page<MyEntityResponse> getAll(Pageable pageable) {
        return service.getAll(pageable);
    }
}
```

### Step 6: Create Migration

```sql
-- src/main/resources/db/changelog/changes/XXX-create-my-entities.sql
CREATE TABLE my_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_my_entities_tenant ON my_entities(tenant_id);
```

Update `db.changelog-master.xml`:
```xml
<include file="changes/XXX-create-my-entities.sql" relativeToChangelogFile="true"/>
```

## Testing

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {
    @Mock
    private EmployeeRepository repository;

    @InjectMocks
    private EmployeeService service;

    @Test
    void shouldCreateEmployee() {
        // Given
        EmployeeRequest request = new EmployeeRequest();
        request.setFirstName("John");

        // When
        Employee result = service.create(request);

        // Then
        assertThat(result.getFirstName()).isEqualTo("John");
    }
}
```

### Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class EmployeeControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldGetEmployees() throws Exception {
        mockMvc.perform(get("/api/v1/employees")
                .header("Authorization", "Bearer " + token)
                .header("X-Tenant-ID", tenantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }
}
```

### Running Tests

```bash
# All tests
mvn test

# Specific test class
mvn test -Dtest=EmployeeServiceTest

# With coverage report
mvn test jacoco:report
```

## Code Style

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Entity | Singular noun | `Employee`, `LeaveRequest` |
| Repository | Entity + Repository | `EmployeeRepository` |
| Service | Module + Service | `EmployeeService` |
| Controller | Module + Controller | `EmployeeController` |
| Request DTO | Entity + Request | `EmployeeRequest` |
| Response DTO | Entity + Response | `EmployeeResponse` |

### Annotations Order

```java
@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee extends TenantAware {
    // ...
}
```

### Method Order in Controllers

1. GET (list)
2. GET (by id)
3. POST (create)
4. PUT (update)
5. DELETE
6. Other actions

### Formatting

**Indentation** (enforced by `.editorconfig`):
- TypeScript/JavaScript/JSON/YAML: 2 spaces
- Java/XML/Gradle: 4 spaces
- No tabs; spaces only

**Whitespace**:
- UTF-8 encoding
- LF line endings (not CRLF)
- Trim trailing whitespace on all lines
- Insert final newline in every file

**Linting**:
- Frontend: Run `npm run lint` before committing
- Backend: Run `mvn verify` to check compilation and style
- Do not mass-reformat files; only format code you modify

### Error Handling

**HTTP Status Codes**:
- `400 Bad Request`: Validation errors (include field-level messages)
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Authenticated but insufficient permissions
- `404 Not Found`: Resource does not exist
- `409 Conflict`: Duplicate or conflicting resource state
- `500 Internal Server Error`: Unexpected server failures

**Exception Handling**:
```java
@ExceptionHandler(EntityNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ErrorResponse.builder()
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .build());
}
```

**Rules**:
- Do not expose stack traces or internal error details to clients
- Log the full exception with context at ERROR level
- Return user-actionable messages only
- Include request ID for traceability

### Null Safety

**Backend**:
```java
// Use Optional for potentially absent values
public Optional<Employee> findById(UUID id) {
    return repository.findById(id);
}

// Check before accessing
Optional<Employee> emp = service.findById(id);
emp.ifPresent(e -> log.info("Found: {}", e.getName()));

// Use orElseThrow for required values
Employee emp = service.findById(id)
    .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
```

**Frontend**:
```typescript
// Use optional chaining
const name = employee?.personalInfo?.firstName;

// Provide defaults for arrays
const items = response?.data ?? [];

// Guard rendering
{employee && <div>{employee.name}</div>}
```

**Rules**:
- Never call `.get()` on Optional without checking `.isPresent()` first
- Use `@NotNull`, `@Nullable` annotations where appropriate
- Default collections to empty lists, not null
- Validate all inputs at API boundaries

### Logging

**Log Levels**:
- `TRACE`: Fine-grained debug info (disabled in production)
- `DEBUG`: Developer-focused diagnostics
- `INFO`: Business events (user login, record created, job started)
- `WARN`: Recoverable issues (retry attempted, fallback used)
- `ERROR`: Failures requiring attention (exceptions, failed operations)

**What to Log**:
```java
// Good: Business event with context
log.info("Employee {} onboarded by {}", employeeId, createdBy);

// Good: Error with full context
log.error("Failed to send email to {}: {}", recipient, e.getMessage(), e);

// Bad: Sensitive data
log.info("User password: {}", password); // NEVER DO THIS

// Bad: No context
log.error("Error occurred"); // Too vague
```

**Rules**:
- Include tenant ID and user ID in business event logs
- Never log passwords, tokens, credit cards, or PII
- Log the exception object (not just `.getMessage()`) for stack traces
- Use structured logging for metrics (JSON format in production)

### Layer Boundaries

**Strict Dependency Rules**:
```
API Layer (Controllers)
  ↓ may call
Application Layer (Services)
  ↓ may call
Infrastructure Layer (Repositories)
  ↓ depends on
Domain Layer (Entities)
```

**Violations** (DO NOT DO):
```java
// BAD: Controller accessing repository directly
@RestController
public class EmployeeController {
    @Autowired
    private EmployeeRepository repository; // WRONG!

    @GetMapping
    public List<Employee> getAll() {
        return repository.findAll(); // Bypass business logic
    }
}

// BAD: Service in domain layer
package com.hrms.domain.employee;
public class EmployeeService { } // WRONG! Services belong in application layer

// BAD: Repository in domain layer
package com.hrms.domain.employee.repository;
public interface EmployeeRepository { } // WRONG! Repositories belong in infrastructure
```

**Correct Pattern**:
```java
// GOOD: Controller delegates to service
@RestController
public class EmployeeController {
    @Autowired
    private EmployeeService service; // Correct!

    @GetMapping
    public Page<EmployeeResponse> getAll(Pageable pageable) {
        return service.getAllEmployees(pageable)
            .map(EmployeeResponse::from);
    }
}

// Service orchestrates business logic
@Service
public class EmployeeService {
    @Autowired
    private EmployeeRepository repository;

    @Transactional(readOnly = true)
    public Page<Employee> getAllEmployees(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return repository.findByTenantId(tenantId, pageable);
    }
}
```

**Rules**:
- Controllers must only call services, never repositories
- Services contain all business logic and transaction boundaries
- Repositories contain only data access logic (no business rules)
- Domain entities are pure data models with minimal logic

## Debugging

### Enable Debug Logging

```yaml
logging:
  level:
    com.hrms: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
```

### Common Issues

**LazyInitializationException**
```java
// Solution: Use EAGER fetch or fetch in query
@ElementCollection(fetch = FetchType.EAGER)
private Set<UUID> targetIds;

// Or copy to new collection in DTO
.targetIds(new HashSet<>(entity.getTargetIds()))
```

**Tenant Not Found**
```java
// Ensure tenant header is set
// X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000
```

## Deployment

### Building JAR

```bash
mvn clean package -DskipTests
```

### Running in Production

```bash
java -jar target/hrms-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --spring.datasource.url=jdbc:postgresql://db:5432/hrms \
  --spring.datasource.username=hrms_user \
  --spring.datasource.password=secret
```

### Docker

```bash
docker build -t nulogic-hrms-backend .
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/hrms \
  nulogic-hrms-backend
```

---

**Last Updated**: December 8, 2025
