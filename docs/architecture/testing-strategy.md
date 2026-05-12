# Testing Strategy & Standards

To maintain high confidence for continuous deployment in an Enterprise HRMS processing critical
payroll and compliance data, the platform follows a rigorous, multi-layered testing pyramid.

## Target Metric

**Global Requirement:** A minimum of **80% Code Coverage** (Branch + Line execution) is enforced
universally for all backend and frontend services. Commits failing this threshold are rejected by
the CI pipeline.

---

## 1. Unit Tests (The Foundation)

Unit tests verify the smallest testable parts of an application in isolation (methods/functions).
They are fast, reliable, and run entirely in memory.

### Backend (Java / JUnit 5 + Mockito)

- **Focus:** Complex domain logic, especially inside `@Service` classes, Payroll calculations, and
  Leave Policy evaluators.
- **Standard:** Use Mockito to mock out any external `/Repository` or REST client calls.
- *Example:* The `PayrollCalculator` function must be unit tested with dozens of mathematical
  parameter variations (different basic salaries, proration values, tax brackets) to assert the
  exact output `BigDecimal` values.

### Frontend (React / Vitest + React Testing Library)

- **Focus:** Utility functions, Zod schema validations, and stateless UI components.
- **Standard:** Test behavior, not implementation. Use `userEvent` to simulate clicks rather than
  directly invoking `onClick` handlers.

---

## 2. Integration Tests (The Glue)

Integration tests verify that different modules or external systems (Databases, Kafka, Redis) work
together correctly.

### Backend (Spring Boot Test + Testcontainers)

- **Focus:** Data Access Layers (Repositories) and REST Controllers.
- **Standard (Testcontainers):** Instead of using an unrealistic in-memory H2 database, use
  Testcontainers to spin up ephemeral Docker containers of real PostgreSQL, Redis, and Kafka during
  the test phase.
- *Example:* Testing a `LeaveRepository` by inserting a row into the Testcontainer Postgres instance
  and verifying the query returns the expected results containing the correct `tenant_id` filtering.

### Frontend Component Integration

- **Focus:** Complex page views integrating multiple hooks and components.
- **Standard:** Mock the Axios/Fetch layer using MSW (Mock Service Worker). MSW intercepts the
  network requests at the browser level and returns fake JSON payloads, allowing you to test how the
  component renders real-like data without needing the backend running.

---

## 3. End-to-End (E2E) Tests (The User Journey)

E2E tests simulate real user interactions in a real browser, clicking through the full application
stack (Frontend connected to a Staging Backend and Database).

### Methodology (Playwright / Cypress)

- **Focus:** Critical business flows where failure causes revenue or reputational loss.
  - *Core Flow 1:* Employee logs in -> Applies for Leave -> Manager logs in -> Approves Leave.
  - *Core Flow 2:* HR posts a job -> Candidate applies -> Candidate is moved to Hired -> Candidate
    appears in Employee list.
  - *Core Flow 3:* Approving an Expense Claim -> Generating Payroll -> Verifying the Reimbursement
    appears on the Payslip.
- **Standard:** These are brittle and slow. Keep the suite small and focused on the top 10% most
  critical ("Happy Path") workflows. Run them primarily on the `main` branch or in overnight
  automated builds, not on every individual developer commit.

---

## 4. Specialized Testing Domains

### Performance / Load Testing (K6 or JMeter)

- **Focus:** Ensuring the API Gateway and backend can handle the required concurrency (e.g., 50k
  users clocking attendance at 9:00 AM).
- **Standard:** Simulated load run against a cloned Staging environment.

### Security Testing

- **Focus:** Finding vulnerabilities (XSS, SQL Injection, broken RBAC).
- **Standard:** Automated DAST (Dynamic Application Security Testing) scanners run against the
  staging environment, plus manual penetration testing for compliance certifications (e.g., SOC2,
  ISO 27001).
