# NuLogic HRMS Backend

Enterprise-grade Human Resource Management System API built with Spring Boot 3.2.1 and Java 21.

## Overview

NuLogic HRMS Backend is a multi-tenant REST API that powers the complete HR lifecycle. It features 47 API modules covering employee management, attendance, payroll, performance, recruitment, and more.

## Tech Stack

- **Framework**: Spring Boot 3.2.1
- **Language**: Java 21
- **Database**: PostgreSQL 16
- **ORM**: Hibernate/JPA
- **Security**: Spring Security + JWT
- **Migrations**: Liquibase
- **Build**: Maven

## Features

### Core Platform
- Multi-tenant architecture with row-level data isolation
- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC) with granular permissions
- Comprehensive audit logging
- File storage infrastructure (MinIO/S3 ready)

### API Modules (47 Total)

| Module | Description |
|--------|-------------|
| **Authentication** | Login, logout, token refresh, password management |
| **Employees** | CRUD, search, directory, import/export |
| **Departments** | Organization structure, hierarchy |
| **Attendance** | Check-in/out, mobile attendance, geofencing |
| **Leave** | Types, policies, requests, approvals, balances |
| **Payroll** | Runs, payslips, salary structures, global payroll |
| **Performance** | Goals, reviews, OKRs, 360 feedback |
| **Recruitment** | Jobs, candidates, interviews, AI matching |
| **Benefits** | Plans, enrollments, claims, flex benefits |
| **Training** | Programs, enrollments, LMS |
| **Compensation** | Cycles, revisions, statistics |
| **Announcements** | CRUD, read/accept tracking, targeting |
| **Surveys** | Creation, responses, analytics |
| **Wellness** | Programs, challenges, health logs |
| **Expenses** | Claims, approvals, reimbursements |
| **Assets** | Tracking, assignments, maintenance |
| **Exit** | Offboarding, clearance, F&F settlement |
| **Workflow** | Definitions, execution, approvals |
| **Reports** | Employee, attendance, payroll, performance |
| **Analytics** | Dashboard, predictive, advanced |
| **And more...** | Helpdesk, notifications, compliance, tax |

## Getting Started

### Prerequisites

- Java 21+
- Maven 3.8+
- PostgreSQL 16+

### Database Setup

```bash
# Create database
createdb hrms_db

# Or using psql
psql -U postgres -c "CREATE DATABASE hrms_db;"
```

### Configuration

Create `application.yml` or set environment variables:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/hrms_db
    username: your_username
    password: your_password
  jpa:
    hibernate:
      ddl-auto: validate

jwt:
  secret: your-jwt-secret-key
  expiration: 3600000
  refresh-expiration: 604800000
```

### Running the Application

```bash
# Build
mvn clean install

# Run
mvn spring-boot:run

# Or run the JAR
java -jar target/hrms-0.0.1-SNAPSHOT.jar
```

The API will be available at `http://localhost:8080`

### API Documentation

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI Spec: `http://localhost:8080/v3/api-docs`

## API Endpoints

### Authentication
```
POST   /api/v1/auth/login           - Login
POST   /api/v1/auth/refresh         - Refresh token
POST   /api/v1/auth/logout          - Logout
POST   /api/v1/auth/change-password - Change password
```

### Employees
```
GET    /api/v1/employees            - List employees (paginated)
GET    /api/v1/employees/{id}       - Get employee by ID
POST   /api/v1/employees            - Create employee
PUT    /api/v1/employees/{id}       - Update employee
DELETE /api/v1/employees/{id}       - Delete employee
GET    /api/v1/employees/directory  - Employee directory
POST   /api/v1/employees/import     - Bulk import
```

### Attendance
```
POST   /api/v1/attendance/check-in  - Check in
POST   /api/v1/attendance/check-out - Check out
GET    /api/v1/attendance/calendar  - Calendar view
GET    /api/v1/attendance/summary   - Summary statistics
```

### Leave
```
GET    /api/v1/leave/types          - List leave types
POST   /api/v1/leave/requests       - Apply for leave
GET    /api/v1/leave/requests       - List requests
POST   /api/v1/leave/requests/{id}/approve - Approve request
GET    /api/v1/leave/balances       - Leave balances
```

### Payroll
```
POST   /api/v1/payroll/runs         - Create payroll run
POST   /api/v1/payroll/runs/{id}/process - Process payroll
GET    /api/v1/payroll/payslips     - List payslips
GET    /api/v1/payroll/payslips/{id}/pdf - Download PDF
```

### Analytics
```
GET    /api/v1/analytics/dashboard  - Dashboard metrics
GET    /api/v1/analytics/workforce  - Workforce analytics
GET    /api/v1/analytics/attendance - Attendance analytics
GET    /api/v1/analytics/performance - Performance analytics
```

### Benefits
```
GET    /api/v1/benefits/plans       - List benefit plans
GET    /api/v1/benefits/plans/active - Active plans
POST   /api/v1/benefits-enhanced/enrollments - Enroll employee
GET    /api/v1/benefits-enhanced/enrollments/employee/{id} - Get enrollments
```

## Project Structure

```
src/main/java/com/hrms/
├── api/                    # REST Controllers
│   ├── analytics/          # Analytics endpoints
│   ├── announcement/       # Announcements
│   ├── attendance/         # Attendance management
│   ├── auth/               # Authentication
│   ├── benefits/           # Benefits management
│   ├── employee/           # Employee management
│   ├── leave/              # Leave management
│   ├── payroll/            # Payroll management
│   ├── performance/        # Performance management
│   ├── recruitment/        # Recruitment
│   └── ...                 # Other modules
├── application/            # Business Services
│   ├── analytics/
│   ├── announcement/
│   ├── attendance/
│   └── ...
├── domain/                 # Domain Entities
│   ├── announcement/
│   ├── attendance/
│   ├── employee/
│   └── ...
├── infrastructure/         # Repositories & Config
│   ├── announcement/
│   ├── attendance/
│   └── ...
└── common/                 # Shared utilities
    ├── entity/             # Base entities
    ├── security/           # Security config
    └── exception/          # Exception handling
```

## Security

### Authentication
- JWT tokens with configurable expiration
- Refresh token rotation
- Password encryption with BCrypt

### Authorization
- Role-based access control
- Permission-based endpoint security
- Tenant isolation at data layer

### Headers
```
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_uuid>
```

## Database Migrations

Migrations are managed with Liquibase:

```
src/main/resources/db/changelog/
├── db.changelog-master.xml
└── changes/
    ├── 001-create-tenants.sql
    ├── 002-create-users.sql
    ├── 003-create-employees.sql
    └── ...087-create-announcements-tables.sql
```

Run migrations:
```bash
mvn liquibase:update
```

## Testing

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=EmployeeServiceTest

# Run with coverage
mvn test jacoco:report
```

## Docker

```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/hrms-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and run:
```bash
docker build -t nulogic-hrms-backend .
docker run -p 8080:8080 nulogic-hrms-backend
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPRING_DATASOURCE_URL` | Database URL | `jdbc:postgresql://localhost:5432/hrms_db` |
| `SPRING_DATASOURCE_USERNAME` | Database user | - |
| `SPRING_DATASOURCE_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing key | - |
| `JWT_EXPIRATION` | Token expiration (ms) | `3600000` |
| `SERVER_PORT` | Server port | `8080` |

## Default Credentials

```
Email:    admin@demo.com
Password: password
Tenant:   550e8400-e29b-41d4-a716-446655440000
```

## Sample Data

The system includes sample data:
- 5 employees with hierarchical reporting
- 8 announcements
- Leave types and policies
- Departments and designations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## License

Proprietary - NuLogic Technologies

---

**Version**: 2.0.0
**Status**: Production Ready
**Last Updated**: December 2025
