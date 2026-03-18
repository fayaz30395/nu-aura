# Spec C: Code Quality & Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce code smells, improve maintainability, increase test coverage. All refactors preserve existing behavior.

**Architecture:** Extract large files into focused sub-components/services using Facade pattern (backend) and co-located `_components/` directories (frontend). No behavioral changes.

**Tech Stack:** Java Spring Boot (Facade pattern, exception handling), Next.js (dynamic imports, React.memo), Maven (JaCoCo), Playwright (E2E)

**Spec:** `docs/superpowers/specs/2026-03-19-deep-codebase-analysis-design.md` (Spec C section)

---

## File Map

| File | Action | Task |
|------|--------|------|
| `application/ai/service/AIRecruitmentService.java` (1,513 LOC) | Split into 3 sub-services | Task 1 (after Task 4) |
| `application/resourcemanagement/service/ResourceManagementService.java` (1,137 LOC) | Split into 2-3 sub-services | Task 2 |
| `application/recruitment/service/RecruitmentManagementService.java` (1,121 LOC) | Split into 3 sub-services | Task 3 |
| ~96 service files with `catch(Exception e)` | Replace with specific exceptions (4 PRs) | Task 4 |
| 6 frontend pages >1,400 LOC | Extract to `_components/` | Task 5 |
| 3 frontend components >1,000 LOC | Extract sub-components | Task 6 |
| `backend/pom.xml` | Add JaCoCo, remove Liquibase | Task 7 |
| `.github/workflows/ci.yml` | Add coverage reporting | Task 7 |
| `backend/src/main/resources/db/changelog/` | Delete legacy directory | Task 7 |
| `frontend/app/admin/permissions/page.tsx` | Refactor to React Hook Form | Task 8 |
| ~8 frontend pages | Add `dynamic()` and `<Suspense>` | Task 9 |
| 3 backend service files | Resolve TODO comments | Task 10 |
| ~8 frontend component files | Add `React.memo` | Task 11 |
| `frontend/e2e/` | Add 5-8 new Playwright specs | Task 12 |

---

### Task 1: Refactor AIRecruitmentService (C1 — PR 1/3)

> **Execution order:** Run Task 4 (exception narrowing) BEFORE Tasks 1-3 (service splitting). Narrowing exceptions in the monolithic service is simpler than doing it after the split. The spec recommends this order: C3 first, then C1.

**Source:** `backend/src/main/java/com/hrms/application/ai/service/AIRecruitmentService.java` (1,513 LOC)

**Extraction Plan:**
- `ResumeParserService` — lines 63-356 (parseResume, parseResumeFromUrl, parseResumeFromFile, parseResumeFromBase64)
- `CandidateMatchingService` — lines 359-665 (calculateMatchScore, generateScreeningSummary, rankCandidatesForJob, generateJobDescription)
- `InterviewGenerationService` — lines 745-end (generateInterviewQuestions, synthesizeInterviewFeedback)

**Files:**
- Create: `application/ai/service/ResumeParserService.java`
- Create: `application/ai/service/CandidateMatchingService.java`
- Create: `application/ai/service/InterviewGenerationService.java`
- Modify: `application/ai/service/AIRecruitmentService.java` (becomes facade)

- [ ] **Step 1: Create ResumeParserService**

Extract the 4 resume parsing methods into a new service. Move all private helper methods used only by these (text extraction, Tika integration, URL fetching).

```java
@Service
@RequiredArgsConstructor
public class ResumeParserService {

    // Move dependencies: RestTemplate/WebClient for URL fetching, Tika for parsing

    public ResumeParseResponse parseResume(String resumeText) { /* moved from AIRecruitmentService */ }
    public ResumeParseResponse parseResumeFromUrl(String resumeUrl) { /* moved */ }
    public ResumeParseResponse parseResumeFromFile(byte[] fileBytes, String fileName) { /* moved */ }
    public ResumeParseResponse parseResumeFromBase64(String base64Content, String fileName) { /* moved */ }

    // Move private helpers: extractTextFromFile, callAiForParsing, etc.
}
```

- [ ] **Step 2: Create CandidateMatchingService**

```java
@Service
@RequiredArgsConstructor
public class CandidateMatchingService {

    public CandidateMatchResponse calculateMatchScore(UUID candidateId, UUID jobOpeningId) { /* moved */ }
    public ScreeningSummaryResponse generateScreeningSummary(UUID candidateId, UUID jobOpeningId, String context) { /* moved */ }
    public List<CandidateMatchResponse> rankCandidatesForJob(UUID jobOpeningId) { /* moved */ }
    public JobDescriptionResponse generateJobDescription(JobDescriptionRequest request) { /* moved */ }
}
```

- [ ] **Step 3: Create InterviewGenerationService**

```java
@Service
@RequiredArgsConstructor
public class InterviewGenerationService {

    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId, UUID candidateId) { /* moved */ }
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId) { /* moved */ }
    public InterviewFeedbackSynthesis synthesizeInterviewFeedback(UUID candidateId, UUID jobOpeningId) { /* moved */ }
}
```

- [ ] **Step 4: Convert AIRecruitmentService to facade**

```java
@Service
@RequiredArgsConstructor
public class AIRecruitmentService {

    private final ResumeParserService resumeParser;
    private final CandidateMatchingService candidateMatching;
    private final InterviewGenerationService interviewGeneration;

    // Delegate all public methods to sub-services
    public ResumeParseResponse parseResume(String resumeText) {
        return resumeParser.parseResume(resumeText);
    }
    // ... etc for all 11 methods
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && ./mvnw test -Dtest="*AIRecruitment*,*Resume*" -pl . -q`

Expected: PASS — all existing tests pass because the facade preserves the same API.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/hrms/application/ai/service/
git commit -m "refactor(ai): extract AIRecruitmentService into 3 focused services

Split 1,513-line service into ResumeParserService, CandidateMatchingService,
and InterviewGenerationService. Original class becomes facade for backward
compatibility. No behavioral changes."
```

---

### Task 2: Refactor ResourceManagementService (C1 — PR 2/3)

**Source:** `backend/src/main/java/com/hrms/application/resourcemanagement/service/ResourceManagementService.java` (1,137 LOC)

**Note:** `ResourceConflictService` (213 LOC) already exists and is well-factored. Do NOT re-extract it.

**Extraction Plan (based on natural groupings):**
- `AllocationApprovalService` — lines 303-428 (create/get/approve/reject allocation requests)
- `WorkloadAnalyticsService` — lines 467-826 (dashboard, heatmap, department workloads, availability)
- Keep capacity queries (lines 58-220) and team availability (lines 837-1010) in `ResourceManagementService` as they're the core

- [ ] **Step 1: Create AllocationApprovalService**

Extract approval workflow methods: `createAllocationRequest`, `getAllocationRequest`, `getAllPendingRequests`, `getEmployeeAllocationHistory`, `getPendingApprovalsCount`, `approveAllocationRequest`, `rejectAllocationRequest`, `getMyPendingApprovals`.

- [ ] **Step 2: Create WorkloadAnalyticsService**

Extract analytics/dashboard methods: `getWorkloadDashboard`, `getEmployeeWorkload`, `getEmployeeWorkloads`, `getDepartmentWorkloads`, `getWorkloadHeatmap`, `getAggregatedAvailability`, `exportWorkloadReport`.

- [ ] **Step 3: Update ResourceManagementService to delegate**

Keep capacity and availability methods in the original. Inject and delegate to the two new services.

- [ ] **Step 4: Run tests**

Run: `cd backend && ./mvnw test -Dtest="*Resource*" -pl . -q`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hrms/application/resourcemanagement/service/
git commit -m "refactor(resource): extract approval and analytics from ResourceManagementService

Split 1,137-line service. AllocationApprovalService handles approval workflow,
WorkloadAnalyticsService handles dashboards/heatmaps/reports. Core capacity
logic stays in ResourceManagementService."
```

---

### Task 3: Refactor RecruitmentManagementService (C1 — PR 3/3)

**Source:** `backend/src/main/java/com/hrms/application/recruitment/service/RecruitmentManagementService.java` (1,121 LOC)

**Extraction Plan:**
- `JobOpeningService` — lines 57-182 (CRUD for job openings)
- `InterviewManagementService` — lines 591-762 (schedule, update, get, delete interviews)
- Keep candidate pipeline + offer management in `RecruitmentManagementService` (lines 203-494, core domain)

- [ ] **Step 1: Create JobOpeningService**

Extract: `createJobOpening`, `updateJobOpening`, `getJobOpeningById`, `getAllJobOpenings`, `getJobOpeningsByStatus`, `deleteJobOpening`.

- [ ] **Step 2: Create InterviewManagementService**

Extract: `scheduleInterview`, `updateInterview`, `getAllInterviews`, `getInterviewById`, `getInterviewsByCandidate`, `deleteInterview`.

- [ ] **Step 3: Update RecruitmentManagementService to delegate**

Keep candidate and offer methods. Inject and delegate job opening and interview methods.

- [ ] **Step 4: Run tests**

Run: `cd backend && ./mvnw test -Dtest="*Recruitment*" -pl . -q`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hrms/application/recruitment/service/
git commit -m "refactor(recruitment): extract job opening and interview services

Split 1,121-line service. JobOpeningService handles job posting CRUD,
InterviewManagementService handles scheduling/management. Candidate pipeline
and offer logic stays in RecruitmentManagementService."
```

---

### Task 4: Replace Broad Exception Catches (C3 — 4 PRs)

~297 instances of `catch(Exception e)` across ~96 files. Split into 4 PRs by layer.

**General pattern:**

```java
// FROM:
catch (Exception e) {
    log.error("Failed to do X: {}", e.getMessage());
    throw new BusinessException("Failed to do X");
}

// TO (choose the appropriate specific exception):
catch (EntityNotFoundException e) {
    throw e; // Let it propagate — GlobalExceptionHandler will handle
} catch (DataAccessException e) {
    log.error("Database error during X: {}", e.getMessage());
    throw new BusinessException("Failed to do X due to data error");
} catch (BusinessException e) {
    throw e;
}
```

- [ ] **Step 1 (PR 1): Core services** — `EmployeeService`, `DepartmentService`, `LeaveBalanceService`, `AttendanceRecordService`, `PayrollRunService`, `AuthService`, and other core `application/` services.

- [ ] **Step 2 (PR 2): Kafka/event handlers** — All files in `infrastructure/kafka/`, event consumers, dead letter handler.

- [ ] **Step 3 (PR 3): Integration services** — `AIRecruitmentService` (and sub-services), `WebhookDeliveryService`, external API integrations, email/SMS services.

- [ ] **Step 4 (PR 4): Infrastructure/config** — Filters, interceptors, config classes, utilities.

For each PR:

```bash
git commit -m "refactor(exceptions): narrow catch blocks in [layer] services

Replace generic catch(Exception e) with specific exception types
(DataAccessException, EntityNotFoundException, BusinessException,
ValidationException). Improves error diagnostics and ensures proper
transaction rollback behavior."
```

---

### Task 5: Break Large Frontend Pages (C2 — P1)

6 pages >1,400 LOC. For each page, create a `_components/` subdirectory with extracted sub-components.

**Pattern for each page:**

```
frontend/app/<module>/
├── page.tsx          (orchestrator, <300 LOC)
└── _components/
    ├── index.ts      (barrel export)
    ├── SectionA.tsx
    ├── SectionB.tsx
    └── ModalX.tsx
```

- [ ] **Step 1: nu-mail/page.tsx (1,639 LOC)**

Extract: `EmailSidebar`, `EmailList`, `EmailViewer`, `ComposeModal`, `GoogleAuthPanel`.

- [ ] **Step 2: nu-drive/page.tsx (1,616 LOC)**

Extract: `DriveToolbar`, `DriveGrid`, `DriveList`, `FilePreview`, `ShareDialog`.

- [ ] **Step 3: recruitment/candidates/page.tsx (1,603 LOC)**

Extract: `CandidateTable`, `CreateCandidateModal`, `ResumeParseModal`, `MatchScorePanel`, `CreateOfferModal`.

- [ ] **Step 4: attendance/regularization/page.tsx (1,489 LOC)**

Extract: `RegularizationStats`, `RequestList`, `RequestDetailModal`, `ApprovalActionPanel`.

- [ ] **Step 5: payroll/page.tsx (1,412 LOC)**

Extract: `PayrollRunsTab`, `PayslipsTab`, `SalaryStructuresTab`, `PayrollRunModal`, `PayslipModal`.

- [ ] **Step 6: training/page.tsx (1,403 LOC)**

Extract: `TrainingProgramList`, `CreateProgramModal`, `EnrollmentPanel`, `SkillGapWidget`.

Commit each page as a separate commit:

```bash
git commit -m "refactor(frontend): extract <module>/page.tsx into co-located components"
```

---

### Task 6: Break Large Frontend Components (C4 — P2)

- [ ] **Step 1: CompanyFeed.tsx (1,507 LOC)**

Extract from `frontend/components/dashboard/CompanyFeed.tsx`:
- `FeedCard.tsx` — Universal feed card renderer
- `FeedCommentThread.tsx` — Recursive comment thread (lines 1238-1422)
- `FeedDateSection.tsx` — Date grouping (Today, Yesterday, This Week)

- [ ] **Step 2: Header.tsx (1,221 LOC)**

Extract from `frontend/components/layout/Header.tsx`:
- `NotificationDropdown.tsx` — Unread notification inbox
- `UserMenu.tsx` — Profile, settings, logout dropdown

- [ ] **Step 3: CreateAllocationModal.tsx (1,012 LOC)**

Extract from `frontend/components/resources/CreateAllocationModal.tsx`:
- `ProjectStep.tsx` — Step 1: project selection/creation
- `EmployeeStep.tsx` — Step 2: employee allocation rows

```bash
git commit -m "refactor(components): extract large components into focused sub-components"
```

---

### Task 7: Add JaCoCo + Remove Liquibase (C5 + C8)

**Files:**
- Modify: `backend/pom.xml` (add JaCoCo plugin, remove Liquibase)
- Modify: `.github/workflows/ci.yml` (add coverage step)
- Delete: `backend/src/main/resources/db/changelog/`

- [ ] **Step 1: Add JaCoCo Maven plugin to pom.xml**

Add in the `<build><plugins>` section:

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <phase>verify</phase>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.60</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

- [ ] **Step 2: Remove Liquibase version property and any dependency**

```xml
<!-- Remove from <properties>: -->
<!-- Line 23: <liquibase.version>4.31.1</liquibase.version> -->
```

Verify no `<dependency>` block references `liquibase-core`. If found, remove it.

- [ ] **Step 3: Delete legacy changelog directory**

```bash
rm -rf backend/src/main/resources/db/changelog/
```

- [ ] **Step 4: Add coverage step to CI**

In `.github/workflows/ci.yml`, add after the Maven test step:

```yaml
      - name: Generate coverage report
        run: cd backend && ./mvnw jacoco:report -pl .
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: backend/target/site/jacoco/
```

- [ ] **Step 5: Verify build succeeds**

Run: `cd backend && ./mvnw clean verify -pl . -q`

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml .github/workflows/ci.yml
git commit -m "build: add JaCoCo coverage (60% minimum), remove unused Liquibase

Adds JaCoCo Maven plugin with 60% line coverage threshold. Removes unused
liquibase-core dependency and legacy db/changelog/ directory. Flyway is
the active migration tool."
```

---

### Task 8: Refactor Admin Permissions Page (C9 — P3)

**File:** `frontend/app/admin/permissions/page.tsx` (843 LOC)

3 modals need React Hook Form + Zod: EditRoleModal (lines 512-624), CreateRoleModal (627-740), EditUserModal (743-843).

- [ ] **Step 1: Define Zod schemas**

```typescript
import { z } from 'zod';

const editRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

const createRoleSchema = z.object({
  roleCode: z.string().regex(/^[A-Z_]+$/, 'Code must be uppercase with underscores'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

const assignRolesSchema = z.object({
  roleCodes: z.array(z.string()),
});
```

- [ ] **Step 2: Refactor EditRoleModal to use useForm**

Replace `useState` calls (lines 523-528) with:

```typescript
const form = useForm<z.infer<typeof editRoleSchema>>({
  resolver: zodResolver(editRoleSchema),
  defaultValues: {
    name: role?.name || '',
    description: role?.description || '',
    permissions: Array.from(role?.permissions || []),
  },
});
```

Replace `saving` state with `mutation.isPending`.

- [ ] **Step 3: Refactor CreateRoleModal and EditUserModal similarly**

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/permissions/page.tsx
git commit -m "refactor(admin): convert permissions page modals to React Hook Form + Zod

Replaces useState-based form handling with useForm + Zod validation
in EditRoleModal, CreateRoleModal, and EditUserModal. Consistent with
codebase convention."
```

---

### Task 9: Add Frontend Code Splitting (C6 — P2)

- [ ] **Step 1: Add dynamic imports for heavy components**

```typescript
// In pages that use heavy components:
import dynamic from 'next/dynamic';

const ReportBuilder = dynamic(() => import('./_components/ReportBuilder'), {
  loading: () => <LoadingOverlay visible />,
});

const PayrollWizard = dynamic(() => import('./_components/PayrollWizard'), {
  loading: () => <LoadingOverlay visible />,
});
```

- [ ] **Step 2: Add Suspense boundaries on data-heavy pages**

```tsx
// dashboard, recruitment, payroll pages:
import { Suspense } from 'react';

<Suspense fallback={<Skeleton height={200} />}>
  <DataHeavySection />
</Suspense>
```

- [ ] **Step 3: Measure bundle size**

Run: `cd frontend && ANALYZE=true npm run build`

- [ ] **Step 4: Commit**

```bash
git commit -m "perf(frontend): add code splitting and Suspense boundaries

Adds dynamic() imports for report builder and payroll wizard. Adds
Suspense boundaries on dashboard, recruitment, and payroll pages."
```

---

### Task 10: Resolve TODO Comments (C7 — P2)

3 files with 4 TODOs:

- [ ] **Step 1: AiUsageService** — 2 TODOs about `ai_usage_log` table. If table doesn't exist yet, replace TODOs with a clean no-op stub and remove comments.

- [ ] **Step 2: StorageMetricsService** — TODO about MinIO Admin API. Replace with a documented stub that returns placeholder metrics.

- [ ] **Step 3: MobileService** — TODO about `avatarUrl` field. Check if Employee entity already has it. If yes, use it. If not, replace TODO with a null-safe getter.

```bash
git commit -m "fix: resolve TODO comments in AiUsageService, StorageMetricsService, MobileService"
```

---

### Task 11: Add Strategic React.memo (C11 — P3)

- [ ] **Step 1: Identify re-render-heavy components**

Profile with React DevTools to confirm which components re-render unnecessarily.

- [ ] **Step 2: Add React.memo to confirmed targets**

Common targets: modal content components, table row renderers, sidebar sections.

```tsx
export const FeedCard = React.memo(function FeedCard({ item }: FeedCardProps) {
  // ... existing component
});
```

- [ ] **Step 3: Commit**

```bash
git commit -m "perf(frontend): add React.memo to modal and table row components"
```

---

### Task 12: Expand E2E Test Coverage (C12 — P3)

- [ ] **Step 1: Add admin roles/permissions spec**

```typescript
// frontend/e2e/admin-roles.spec.ts
test.describe('Admin Role Management', () => {
  test('can create a new role with permissions', async ({ page }) => { /* ... */ });
  test('can edit an existing role', async ({ page }) => { /* ... */ });
  test('can assign roles to a user', async ({ page }) => { /* ... */ });
});
```

- [ ] **Step 2: Add document workflow spec**

```typescript
// frontend/e2e/document-workflow.spec.ts
```

- [ ] **Step 3: Add app switcher spec**

```typescript
// frontend/e2e/app-switcher.spec.ts
test.describe('App Switcher', () => {
  test('can switch between NU-HRMS and NU-Hire', async ({ page }) => { /* ... */ });
  test('shows lock icon for inaccessible apps', async ({ page }) => { /* ... */ });
});
```

- [ ] **Step 4: Add custom fields CRUD spec**

- [ ] **Step 5: Run all E2E tests**

Run: `cd frontend && npx playwright test`

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e/
git commit -m "test(e2e): add specs for admin roles, documents, app switcher, custom fields"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] Backend tests pass: `cd backend && ./mvnw test -pl . -q`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] E2E tests pass: `cd frontend && npx playwright test`
- [ ] No files >1,000 LOC in modified services
- [ ] No `catch(Exception e)` in modified files
- [ ] JaCoCo coverage ≥ 60%
- [ ] No `liquibase` references in pom.xml
- [ ] No TODO/FIXME in modified files
