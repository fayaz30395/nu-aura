package com.hrms.application.expense.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.MileageLogRequest;
import com.hrms.api.expense.dto.MileageLogResponse;
import com.hrms.api.expense.dto.MileageSummaryResponse;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.expense.MileageLog;
import com.hrms.domain.expense.MileagePolicy;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.expense.repository.MileageLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("MileageService Tests")
class MileageServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID APPROVER_ID = UUID.randomUUID();
    private static final UUID LOG_ID = UUID.randomUUID();
    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private MileageLogRepository mileageLogRepository;
    @Mock
    private MileagePolicyService mileagePolicyService;
    @Mock
    private ExpenseClaimRepository expenseClaimRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ObjectMapper objectMapper;
    @InjectMocks
    private MileageService mileageService;

    @BeforeAll
    static void setUpStatic() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownStatic() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(APPROVER_ID);
    }

    private MileageLogRequest createValidRequest() {
        return new MileageLogRequest(
                LocalDate.now(),
                "Office A",
                "Client Site B",
                new BigDecimal("25.50"),
                "Client meeting",
                MileageLog.VehicleType.CAR,
                "Regular commute"
        );
    }

    private MileagePolicy createPolicy() {
        return MileagePolicy.builder()
                .id(UUID.randomUUID())
                .name("Standard Policy")
                .ratePerKm(new BigDecimal("0.58"))
                .maxDailyKm(new BigDecimal("200.00"))
                .maxMonthlyKm(new BigDecimal("3000.00"))
                .isActive(true)
                .effectiveFrom(LocalDate.of(2020, 1, 1))
                .build();
    }

    private MileageLog createMileageLog(MileageLog.MileageStatus status) {
        MileageLog log = MileageLog.builder()
                .employeeId(EMPLOYEE_ID)
                .travelDate(LocalDate.now())
                .fromLocation("Office A")
                .toLocation("Client Site B")
                .distanceKm(new BigDecimal("25.50"))
                .purpose("Client meeting")
                .vehicleType(MileageLog.VehicleType.CAR)
                .ratePerKm(new BigDecimal("0.58"))
                .reimbursementAmount(new BigDecimal("14.79"))
                .status(status)
                .build();
        log.setId(LOG_ID);
        log.setTenantId(TENANT_ID);
        return log;
    }

    // ======================== Create Tests ========================

    @Test
    @DisplayName("Should create mileage log with auto-calculated reimbursement")
    void createMileageLog_success() {
        MileageLogRequest request = createValidRequest();
        MileagePolicy policy = createPolicy();

        when(employeeRepository.existsByIdAndTenantId(EMPLOYEE_ID, TENANT_ID)).thenReturn(true);
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> {
            MileageLog saved = inv.getArgument(0);
            saved.setId(LOG_ID);
            return saved;
        });

        MileageLogResponse response = mileageService.createMileageLog(EMPLOYEE_ID, request);

        assertThat(response).isNotNull();
        assertThat(response.getDistanceKm()).isEqualByComparingTo(new BigDecimal("25.50"));
        assertThat(response.getRatePerKm()).isEqualByComparingTo(new BigDecimal("0.58"));
        // 25.50 * 0.58 = 14.79
        assertThat(response.getReimbursementAmount()).isEqualByComparingTo(new BigDecimal("14.79"));
        assertThat(response.getStatus()).isEqualTo(MileageLog.MileageStatus.DRAFT);

        verify(mileageLogRepository).save(any(MileageLog.class));
    }

    @Test
    @DisplayName("Should fail to create mileage log when employee not found")
    void createMileageLog_employeeNotFound() {
        MileageLogRequest request = createValidRequest();

        when(employeeRepository.existsByIdAndTenantId(EMPLOYEE_ID, TENANT_ID)).thenReturn(false);

        assertThatThrownBy(() -> mileageService.createMileageLog(EMPLOYEE_ID, request))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Employee not found");
    }

    @Test
    @DisplayName("Should set reimbursement to zero when no policy exists")
    void createMileageLog_noPolicy() {
        MileageLogRequest request = createValidRequest();

        when(employeeRepository.existsByIdAndTenantId(EMPLOYEE_ID, TENANT_ID)).thenReturn(true);
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(null);
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> {
            MileageLog saved = inv.getArgument(0);
            saved.setId(LOG_ID);
            return saved;
        });

        MileageLogResponse response = mileageService.createMileageLog(EMPLOYEE_ID, request);

        assertThat(response.getReimbursementAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ======================== Update Tests ========================

    @Test
    @DisplayName("Should update mileage log in DRAFT status")
    void updateMileageLog_success() {
        MileageLogRequest request = new MileageLogRequest(
                LocalDate.now(), "New Office", "New Client", new BigDecimal("50.00"),
                "Updated purpose", MileageLog.VehicleType.MOTORCYCLE, null
        );
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.DRAFT);
        MileagePolicy policy = createPolicy();

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> inv.getArgument(0));

        MileageLogResponse response = mileageService.updateMileageLog(LOG_ID, request);

        assertThat(response.getFromLocation()).isEqualTo("New Office");
        assertThat(response.getDistanceKm()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("Should fail to update mileage log not in DRAFT status")
    void updateMileageLog_notDraft() {
        MileageLogRequest request = createValidRequest();
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.SUBMITTED);

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> mileageService.updateMileageLog(LOG_ID, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    // ======================== Submit Tests ========================

    @Test
    @DisplayName("Should submit mileage log and validate policy limits")
    void submitMileageLog_success() {
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.DRAFT);
        MileagePolicy policy = createPolicy();

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);
        when(mileageLogRepository.sumDistanceByEmployeeAndDate(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), eq(LOG_ID)))
                .thenReturn(BigDecimal.ZERO);
        when(mileageLogRepository.sumDistanceByEmployeeAndDateRange(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> inv.getArgument(0));

        MileageLogResponse response = mileageService.submitMileageLog(LOG_ID);

        assertThat(response.getStatus()).isEqualTo(MileageLog.MileageStatus.SUBMITTED);
    }

    @Test
    @DisplayName("Should reject submission when daily limit exceeded")
    void submitMileageLog_dailyLimitExceeded() {
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.DRAFT);
        existing.setDistanceKm(new BigDecimal("150.00"));
        MileagePolicy policy = createPolicy();

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);
        when(mileageLogRepository.sumDistanceByEmployeeAndDate(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), eq(LOG_ID)))
                .thenReturn(new BigDecimal("100.00")); // 100 + 150 = 250 > 200 daily limit

        assertThatThrownBy(() -> mileageService.submitMileageLog(LOG_ID))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Daily mileage limit exceeded");
    }

    @Test
    @DisplayName("Should reject submission when monthly limit exceeded")
    void submitMileageLog_monthlyLimitExceeded() {
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.DRAFT);
        existing.setDistanceKm(new BigDecimal("100.00"));
        MileagePolicy policy = createPolicy();

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);
        when(mileageLogRepository.sumDistanceByEmployeeAndDate(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), eq(LOG_ID)))
                .thenReturn(BigDecimal.ZERO);
        when(mileageLogRepository.sumDistanceByEmployeeAndDateRange(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(new BigDecimal("2950.00")); // 2950 + 100 = 3050 > 3000 monthly limit

        assertThatThrownBy(() -> mileageService.submitMileageLog(LOG_ID))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Monthly mileage limit exceeded");
    }

    // ======================== Approve Tests ========================

    @Test
    @DisplayName("Should approve mileage log and auto-create expense claim")
    void approveMileageLog_success() {
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.SUBMITTED);

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(expenseClaimRepository.save(any(ExpenseClaim.class))).thenAnswer(inv -> {
            ExpenseClaim claim = inv.getArgument(0);
            claim.setId(UUID.randomUUID());
            return claim;
        });

        MileageLogResponse response = mileageService.approveMileageLog(LOG_ID);

        assertThat(response.getStatus()).isEqualTo(MileageLog.MileageStatus.APPROVED);
        assertThat(response.getApprovedBy()).isEqualTo(APPROVER_ID);
        assertThat(response.getExpenseClaimId()).isNotNull();

        verify(expenseClaimRepository).save(any(ExpenseClaim.class));
    }

    @Test
    @DisplayName("Should fail to approve a DRAFT mileage log")
    void approveMileageLog_wrongStatus() {
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.DRAFT);

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> mileageService.approveMileageLog(LOG_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("submitted");
    }

    // ======================== Reject Tests ========================

    @Test
    @DisplayName("Should reject mileage log with reason")
    void rejectMileageLog_success() {
        MileageLog existing = createMileageLog(MileageLog.MileageStatus.SUBMITTED);

        when(mileageLogRepository.findByIdAndTenantId(LOG_ID, TENANT_ID)).thenReturn(Optional.of(existing));
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> inv.getArgument(0));

        MileageLogResponse response = mileageService.rejectMileageLog(LOG_ID, "Distance seems excessive");

        assertThat(response.getStatus()).isEqualTo(MileageLog.MileageStatus.REJECTED);
        assertThat(response.getRejectionReason()).isEqualTo("Distance seems excessive");
    }

    // ======================== Summary Tests ========================

    @Test
    @DisplayName("Should return monthly summary with remaining km")
    void getMonthlySummary_success() {
        when(mileageLogRepository.sumDistanceByEmployeeAndDateRange(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(new BigDecimal("500.00"));
        when(mileageLogRepository.sumReimbursementByEmployeeAndDateRange(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(new BigDecimal("290.00"));
        MileageLog tripLog = createMileageLog(MileageLog.MileageStatus.APPROVED);
        when(mileageLogRepository.findByTenantIdAndEmployeeIdAndTravelDateBetween(
                eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(List.of(tripLog));
        MileagePolicy policy = createPolicy();
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);

        MileageSummaryResponse summary = mileageService.getMonthlySummary(EMPLOYEE_ID, 2026, 4);

        assertThat(summary.getTotalDistanceKm()).isEqualByComparingTo(new BigDecimal("500.00"));
        assertThat(summary.getTotalReimbursement()).isEqualByComparingTo(new BigDecimal("290.00"));
        assertThat(summary.getTotalTrips()).isEqualTo(1);
        assertThat(summary.getPolicyMaxMonthlyKm()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(summary.getRemainingMonthlyKm()).isEqualByComparingTo(new BigDecimal("2500.00"));
    }

    // ======================== Edge Case Tests ========================

    @Test
    @DisplayName("Should fail with zero distance")
    void createMileageLog_zeroDistance() {
        MileageLogRequest request = new MileageLogRequest(
                LocalDate.now(), "A", "B", BigDecimal.ZERO,
                "Test", MileageLog.VehicleType.CAR, null
        );

        when(employeeRepository.existsByIdAndTenantId(EMPLOYEE_ID, TENANT_ID)).thenReturn(true);

        assertThatThrownBy(() -> mileageService.createMileageLog(EMPLOYEE_ID, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("greater than zero");
    }

    @Test
    @DisplayName("Should fail with negative distance")
    void createMileageLog_negativeDistance() {
        MileageLogRequest request = new MileageLogRequest(
                LocalDate.now(), "A", "B", new BigDecimal("-10.00"),
                "Test", MileageLog.VehicleType.CAR, null
        );

        when(employeeRepository.existsByIdAndTenantId(EMPLOYEE_ID, TENANT_ID)).thenReturn(true);

        assertThatThrownBy(() -> mileageService.createMileageLog(EMPLOYEE_ID, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("greater than zero");
    }

    @Test
    @DisplayName("Should use vehicle-specific rate when available")
    @SuppressWarnings("unchecked")
    void createMileageLog_vehicleSpecificRate() throws Exception {
        MileageLogRequest request = new MileageLogRequest(
                LocalDate.now(), "A", "B", new BigDecimal("10.00"),
                "Test", MileageLog.VehicleType.MOTORCYCLE, null
        );
        MileagePolicy policy = createPolicy();
        policy.setVehicleRates("{\"MOTORCYCLE\": 0.30}");

        when(employeeRepository.existsByIdAndTenantId(EMPLOYEE_ID, TENANT_ID)).thenReturn(true);
        when(mileagePolicyService.getActivePolicy(TENANT_ID)).thenReturn(policy);
        when(objectMapper.readValue(eq("{\"MOTORCYCLE\": 0.30}"), any(com.fasterxml.jackson.core.type.TypeReference.class)))
                .thenReturn(java.util.Map.of("MOTORCYCLE", new BigDecimal("0.30")));
        when(mileageLogRepository.save(any(MileageLog.class))).thenAnswer(inv -> {
            MileageLog saved = inv.getArgument(0);
            saved.setId(LOG_ID);
            return saved;
        });

        MileageLogResponse response = mileageService.createMileageLog(EMPLOYEE_ID, request);

        assertThat(response.getRatePerKm()).isEqualByComparingTo(new BigDecimal("0.30"));
        // 10.00 * 0.30 = 3.00
        assertThat(response.getReimbursementAmount()).isEqualByComparingTo(new BigDecimal("3.00"));
    }

    @Test
    @DisplayName("Should get employee mileage logs paginated")
    void getEmployeeMileageLogs_success() {
        MileageLog log = createMileageLog(MileageLog.MileageStatus.DRAFT);
        Pageable pageable = PageRequest.of(0, 20);
        Page<MileageLog> page = new PageImpl<>(List.of(log), pageable, 1);

        when(mileageLogRepository.findByTenantIdAndEmployeeId(TENANT_ID, EMPLOYEE_ID, pageable))
                .thenReturn(page);

        Page<MileageLogResponse> result = mileageService.getEmployeeMileageLogs(EMPLOYEE_ID, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
