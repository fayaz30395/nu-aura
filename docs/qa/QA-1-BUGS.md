# QA Engineer 1 — HRMS Core Bug Report
Date: 2026-04-02
Agent: QA-1 (Flow Groups 1–10)

## Bug Format
Each bug:
```
### BUG-1-XXX: Short Title
- Page: /url
- Flow Group: N
- Severity: CRITICAL / MAJOR / MINOR
- Type: UI / API / RBAC / Data
- Console Errors: (JS errors if any)
- Network Errors: (failed API calls with status code)
- Observed: what actually happened
- Expected: what should happen
- Assign To: Frontend Fixer / Backend Fixer
- Status: OPEN
```

---

## Bugs Found

### BUG-1-001: Backend Service Not Running
- Page: N/A (system-level)
- Flow Group: 1-10 (BLOCKS ALL)
- Severity: CRITICAL
- Type: Infrastructure / Setup
- Console Errors: N/A
- Network Errors: Connection refused on http://localhost:8080
- Observed: Backend service (Spring Boot) is not listening on port 8080. All API calls will fail.
- Expected: Backend service should be running and accessible at http://localhost:8080
- Assign To: Backend Fixer / DevOps
- Status: BLOCKING

### BUG-1-002: Frontend Service Not Running
- Page: N/A (system-level)
- Flow Group: 1-10 (BLOCKS ALL)
- Severity: CRITICAL
- Type: Infrastructure / Setup
- Console Errors: N/A
- Network Errors: Connection refused on http://localhost:3000
- Observed: Frontend service (Next.js) is not listening on port 3000. Cannot access application.
- Expected: Frontend service should be running and accessible at http://localhost:3000
- Assign To: Frontend Fixer / DevOps
- Status: BLOCKING

### BUG-1-003: Docker Not Available in Testing Environment
- Page: N/A (system-level)
- Flow Group: 1-10 (BLOCKS ALL)
- Severity: CRITICAL
- Type: Infrastructure / Setup
- Console Errors: N/A
- Network Errors: docker: command not found
- Observed: Docker daemon is not available. Cannot start services via docker-compose up.
- Expected: Docker should be installed and running to support local development environment
- Assign To: DevOps
- Status: BLOCKING

### BUG-1-004: Java Version Mismatch - Backend JAR Built for Java 17+ but Runtime is Java 11
- Page: N/A (system-level)
- Flow Group: 1-10 (BLOCKS ALL)
- Severity: CRITICAL
- Type: Infrastructure / Setup
- Console Errors: java.lang.UnsupportedClassVersionError: class file version 61.0 (Java 17) not compatible with Java 11 (version 55.0)
- Network Errors: N/A
- Observed: JAR file (hrms-backend-1.0.0.jar) cannot execute. It was compiled with Java 17+ but the runtime environment only has Java 11.
- Expected: Java 17 or higher should be installed and set as default JVM
- Assign To: DevOps
- Status: BLOCKING
- Details: Target backend JAR at /sessions/festive-awesome-brahmagupta/mnt/nu-aura/backend/target/hrms-backend-1.0.0.jar (214MB, built Apr 1 20:53)

---

## SUMMARY — QA Session 2026-04-02

### Testing Status
- **Overall:** BLOCKED - Infrastructure unavailable
- **Pages Tested:** 0 of 46 (0%)
- **Bugs Found:** 4 (all CRITICAL, all infrastructure-related)
- **Bugs by Severity:**
  - CRITICAL: 4
  - MAJOR: 0
  - MINOR: 0

### Key Findings
All testing is prevented by infrastructure issues. No application-level testing could be performed.

**Critical Infrastructure Issues:**
1. Backend service not running (port 8080 unreachable)
2. Frontend service not running (port 3000 unreachable)
3. Docker daemon not available (cannot start Redis, Kafka, etc.)
4. Java runtime version mismatch (Java 11 insufficient; Java 17+ required)

### Recommendation
**CANNOT PROCEED with QA testing.** Infrastructure must be provisioned before application testing can begin.

### Estimated Impact
If infrastructure is provisioned, QA can complete coverage of:
- Flow Group 1: Employee Management (9 pages)
- Flow Group 2: Attendance (6 pages)
- Flow Group 3: Leave Management (5 pages)
- Flow Group 4: Shifts (4 pages)
- Flow Group 5: Assets & Contracts (7 pages)
- Flow Group 6: Overtime & Probation (2 pages)
- Flow Group 7: Helpdesk (5 pages)
- Flow Group 8: Timesheets & Time Tracking (3 pages)
- Flow Group 9: Approvals (1 page)
- Flow Group 10: Calendars & Holidays (4 pages)

**Total Application Pages:** 46 pages ready for testing once infrastructure is available.
