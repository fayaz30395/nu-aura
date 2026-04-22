package com.hrms.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Performance use-case benchmark tests — UC-PERF-001 through UC-PERF-008.
 *
 * <p>Each test measures actual MockMvc response time using System.nanoTime() and
 * asserts the elapsed time is within acceptable bounds. Filters are disabled for
 * isolation; services are mocked to eliminate DB wait time from measurements.</p>
 *
 * <p>Note: Response-time SLAs are evaluated against in-process MockMvc latency
 * (no network overhead). Real-world latency will include DB + network and should
 * be validated separately with load tests (e.g., Gatling / k6).</p>
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("Performance Use Case Benchmark Tests (UC-PERF-001 through UC-PERF-008)")
class PerformanceUseCaseBenchmarkTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private PayrollRunService payrollRunService;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ========================= UC-PERF-001: Dashboard < 3000ms =========================

    @Test
    @DisplayName("UC-PERF-001: dashboard endpoint responds in under 3000ms")
    void ucPerf001_dashboard_respondsUnder3000ms() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().is2xxSuccessful());

        long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsed)
                .as("Dashboard endpoint should respond in under 3000ms, but took %dms", elapsed)
                .isLessThan(3000L);
    }

    // ========================= UC-PERF-002: Employee List 500 Rows < 5000ms =========================

    @Test
    @DisplayName("UC-PERF-002: employee list (500 rows) responds in under 5000ms")
    void ucPerf002_employeeList_500Rows_respondsUnder5000ms() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(get("/api/v1/employees")
                        .param("page", "0")
                        .param("size", "500"))
                .andExpect(status().is2xxSuccessful());

        long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsed)
                .as("Employee list (500 rows) should respond in under 5000ms, but took %dms", elapsed)
                .isLessThan(5000L);
    }

    // ========================= UC-PERF-003: Payroll Run Async < 60000ms =========================

    @Test
    @DisplayName("UC-PERF-003: payroll run initiation returns 202 Accepted quickly; async completion monitored")
    void ucPerf003_payrollRunInitiation_returns202_underTimeout() throws Exception {
        UUID runId = UUID.randomUUID();

        PayrollRun processing = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.PROCESSING)
                .build();
        processing.setId(runId);
        processing.setTenantId(TENANT_ID);

        PayrollRun completed = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.PROCESSED)
                .totalEmployees(100)
                .build();
        completed.setId(runId);
        completed.setTenantId(TENANT_ID);

        when(payrollRunService.initiateProcessing(any(UUID.class), any(UUID.class))).thenReturn(processing);
        when(payrollRunService.getPayrollRunById(any(UUID.class))).thenReturn(completed);

        // 1. Submit payroll run (should be fast — just enqueues)
        long submitStart = System.nanoTime();
        mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", runId))
                .andExpect(status().isAccepted());
        long submitElapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - submitStart);
        assertThat(submitElapsed).as("Payroll run submit should be < 5000ms (just enqueues Kafka event)").isLessThan(5000L);

        // 2. Poll status (mock returns PROCESSED immediately — real async would take up to 60s)
        long pollStart = System.nanoTime();
        mockMvc.perform(get("/api/v1/payroll/runs/{id}/status", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));
        long pollElapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - pollStart);

        assertThat(pollElapsed)
                .as("Status poll should respond in under 60000ms, took %dms", pollElapsed)
                .isLessThan(60000L);
    }

    // ========================= UC-PERF-004: Median Response < 300ms (10 calls) =========================

    @Test
    @DisplayName("UC-PERF-004: 10 consecutive employee API calls have median response < 300ms")
    void ucPerf004_tenConsecutiveCalls_medianUnder300ms() throws Exception {
        int callCount = 10;
        long[] elapsed = new long[callCount];

        for (int i = 0; i < callCount; i++) {
            long start = System.nanoTime();
            mockMvc.perform(get("/api/v1/employees")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().is2xxSuccessful());
            elapsed[i] = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        }

        Arrays.sort(elapsed);
        long median = elapsed[callCount / 2];
        assertThat(median)
                .as("Median response over 10 calls should be under 300ms, was %dms", median)
                .isLessThan(300L);
    }

    // ========================= UC-PERF-005: Leave Form Submit < 500ms =========================

    @Test
    @DisplayName("UC-PERF-005: leave request submission responds in under 500ms")
    void ucPerf005_leaveFormSubmit_respondsUnder500ms() throws Exception {
        Map<String, Object> leaveRequest = new HashMap<>();
        leaveRequest.put("leaveTypeId", UUID.randomUUID().toString());
        leaveRequest.put("startDate", "2026-05-01");
        leaveRequest.put("endDate", "2026-05-03");
        leaveRequest.put("reason", "Personal leave");

        long start = System.nanoTime();

        mockMvc.perform(post("/api/v1/leave/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(leaveRequest)))
                .andExpect(status().is2xxSuccessful());

        long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsed)
                .as("Leave form submission should respond in under 500ms, but took %dms", elapsed)
                .isLessThan(500L);
    }

    // ========================= UC-PERF-006: 1000-Row Export < 30000ms =========================

    @Test
    @DisplayName("UC-PERF-006: 1000-row employee export responds in under 30000ms")
    void ucPerf006_largeExport_respondsUnder30000ms() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(get("/api/v1/employees/export")
                        .param("format", "xlsx"))
                .andExpect(status().is2xxSuccessful());

        long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsed)
                .as("1000-row export should complete in under 30000ms, but took %dms", elapsed)
                .isLessThan(30000L);
    }

    // ========================= UC-PERF-007: WebSocket Notification Endpoint < 500ms =========================

    @Test
    @DisplayName("UC-PERF-007: notification endpoint responds in under 500ms")
    void ucPerf007_notificationEndpoint_respondsUnder500ms() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(get("/api/v1/notifications")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().is2xxSuccessful());

        long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsed)
                .as("Notifications endpoint should respond in under 500ms, but took %dms", elapsed)
                .isLessThan(500L);
    }

    // ========================= UC-PERF-008: N Concurrent Requests All Return 200 =========================

    @Test
    @DisplayName("UC-PERF-008: 5 concurrent employee list requests all return 2xx")
    void ucPerf008_concurrentRequests_allReturn2xx() throws Exception {
        int concurrency = 5;
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 0; i < concurrency; i++) {
            futures.add(executor.submit(() -> {
                try {
                    MvcResult result = mockMvc.perform(get("/api/v1/employees")
                                    .param("page", "0")
                                    .param("size", "20"))
                            .andReturn();
                    return result.getResponse().getStatus();
                } catch (Exception e) {
                    return 500;
                }
            }));
        }

        executor.shutdown();
        boolean terminated = executor.awaitTermination(30, TimeUnit.SECONDS);
        assertThat(terminated).as("All concurrent requests should complete within 30s").isTrue();

        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : futures) {
            statuses.add(f.get());
        }

        assertThat(statuses)
                .as("All 5 concurrent requests should return 2xx status codes")
                .allSatisfy(status -> assertThat(status).isBetween(200, 299));
    }

    @Test
    @DisplayName("UC-PERF-008: 5 concurrent payroll run status polls all return 200")
    void ucPerf008_concurrentPayrollStatusPolls_allReturn200() throws Exception {
        UUID runId = UUID.randomUUID();

        PayrollRun run = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.PROCESSED)
                .build();
        run.setId(runId);
        run.setTenantId(TENANT_ID);

        when(payrollRunService.getPayrollRunById(any(UUID.class))).thenReturn(run);

        int concurrency = 5;
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 0; i < concurrency; i++) {
            futures.add(executor.submit(() -> {
                try {
                    MvcResult result = mockMvc.perform(
                                    get("/api/v1/payroll/runs/{id}/status", runId))
                            .andReturn();
                    return result.getResponse().getStatus();
                } catch (Exception e) {
                    return 500;
                }
            }));
        }

        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);

        for (Future<Integer> f : futures) {
            assertThat(f.get())
                    .as("All concurrent payroll status polls should return 200")
                    .isEqualTo(200);
        }
    }
}
