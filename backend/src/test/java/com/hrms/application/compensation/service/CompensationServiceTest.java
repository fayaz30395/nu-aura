package com.hrms.application.compensation.service;

import com.hrms.api.compensation.dto.*;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.compensation.CompensationReviewCycle;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleStatus;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleType;
import com.hrms.domain.compensation.SalaryRevision;
import com.hrms.domain.compensation.SalaryRevision.RevisionStatus;
import com.hrms.domain.compensation.SalaryRevision.RevisionType;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.compensation.repository.CompensationReviewCycleRepository;
import com.hrms.infrastructure.compensation.repository.SalaryRevisionRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
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
@DisplayName("CompensationService Tests")
class CompensationServiceTest {

    @Mock
    private SalaryRevisionRepository revisionRepository;

    @Mock
    private CompensationReviewCycleRepository cycleRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private SalaryStructureRepository salaryStructureRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private CompensationService compensationService;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;
    private UUID userId;
    private UUID cycleId;
    private UUID revisionId;
    private UUID employeeId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        cycleId = UUID.randomUUID();
        revisionId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
    }

    // ==================== Review Cycle Tests ====================

    @Test
    @DisplayName("createCycle - creates compensation review cycle")
    void createCycle_success() {
        CompensationCycleRequest request = CompensationCycleRequest.builder()
                .name("FY2026 Annual Review")
                .cycleType(CycleType.ANNUAL)
                .fiscalYear(2026)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 3, 31))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .budgetAmount(new BigDecimal("1000000"))
                .build();

        when(cycleRepository.save(any(CompensationReviewCycle.class))).thenAnswer(inv -> {
            CompensationReviewCycle c = inv.getArgument(0);
            c.setId(cycleId);
            return c;
        });

        CompensationCycleResponse result = compensationService.createCycle(request);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("FY2026 Annual Review");
        verify(cycleRepository).save(any(CompensationReviewCycle.class));
    }

    @Test
    @DisplayName("getCycleById - returns cycle with enrichment")
    void getCycleById_success() {
        CompensationReviewCycle cycle = CompensationReviewCycle.builder()
                .name("FY2026 Annual Review")
                .cycleType(CycleType.ANNUAL)
                .fiscalYear(2026)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 3, 31))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .build();
        cycle.setId(cycleId);
        cycle.setTenantId(tenantId);

        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId)).thenReturn(Optional.of(cycle));
        when(revisionRepository.getAverageIncrementPercentageByCycle(tenantId, cycleId)).thenReturn(null);
        when(revisionRepository.countPromotionsByCycle(tenantId, cycleId)).thenReturn(0L);

        CompensationCycleResponse result = compensationService.getCycleById(cycleId);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("FY2026 Annual Review");
    }

    @Test
    @DisplayName("getCycleById - throws when not found")
    void getCycleById_notFound() {
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> compensationService.getCycleById(cycleId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getAllCycles - returns paginated results")
    void getAllCycles_success() {
        Pageable pageable = PageRequest.of(0, 10);
        CompensationReviewCycle cycle = CompensationReviewCycle.builder()
                .name("Test")
                .cycleType(CycleType.ANNUAL)
                .fiscalYear(2026)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .effectiveDate(LocalDate.now().plusMonths(4))
                .build();
        cycle.setId(cycleId);
        cycle.setTenantId(tenantId);

        Page<CompensationReviewCycle> page = new PageImpl<>(List.of(cycle), pageable, 1);
        when(cycleRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)).thenReturn(page);

        Page<CompensationCycleResponse> result = compensationService.getAllCycles(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ==================== Salary Revision Tests ====================

    @Test
    @DisplayName("createRevision - creates salary revision")
    void createRevision_success() {
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setDesignation("Software Engineer");

        SalaryRevisionRequest request = SalaryRevisionRequest.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now().plusMonths(1))
                .justification("Annual increment")
                .build();

        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
        when(revisionRepository.existsByEmployeeIdAndTenantIdAndStatusIn(eq(employeeId), eq(tenantId), any()))
                .thenReturn(false);
        when(salaryStructureRepository.findActiveByEmployeeIdAndDate(eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.empty());
        when(revisionRepository.save(any(SalaryRevision.class))).thenAnswer(inv -> {
            SalaryRevision r = inv.getArgument(0);
            r.setId(revisionId);
            return r;
        });

        SalaryRevisionResponse result = compensationService.createRevision(request);

        assertThat(result).isNotNull();
        verify(revisionRepository).save(any(SalaryRevision.class));
    }

    @Test
    @DisplayName("createRevision - fails when employee not found")
    void createRevision_employeeNotFound() {
        SalaryRevisionRequest request = SalaryRevisionRequest.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();

        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> compensationService.createRevision(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createRevision - fails when pending revision exists")
    void createRevision_pendingExists() {
        Employee employee = new Employee();
        employee.setId(employeeId);

        SalaryRevisionRequest request = SalaryRevisionRequest.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();

        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
        when(revisionRepository.existsByEmployeeIdAndTenantIdAndStatusIn(eq(employeeId), eq(tenantId), any()))
                .thenReturn(true);

        assertThatThrownBy(() -> compensationService.createRevision(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("pending salary revision");
    }

    // ==================== Revision Workflow Tests ====================

    @Test
    @DisplayName("submitRevision - submits draft revision")
    void submitRevision_success() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        revision.setStatus(RevisionStatus.DRAFT);

        when(revisionRepository.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));
        when(revisionRepository.save(any(SalaryRevision.class))).thenAnswer(inv -> inv.getArgument(0));

        SalaryRevisionResponse result = compensationService.submitRevision(revisionId);

        assertThat(result).isNotNull();
        verify(revisionRepository).save(any(SalaryRevision.class));
    }

    @Test
    @DisplayName("submitRevision - fails for non-DRAFT revision")
    void submitRevision_wrongStatus() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        revision.setStatus(RevisionStatus.PENDING_REVIEW);

        when(revisionRepository.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));

        assertThatThrownBy(() -> compensationService.submitRevision(revisionId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("draft");
    }

    @Test
    @DisplayName("rejectRevision - rejects with reason")
    void rejectRevision_success() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        revision.setStatus(RevisionStatus.PENDING_APPROVAL);

        when(revisionRepository.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));
        when(revisionRepository.save(any(SalaryRevision.class))).thenAnswer(inv -> inv.getArgument(0));

        SalaryRevisionResponse result = compensationService.rejectRevision(revisionId, "Budget constraints");

        assertThat(result).isNotNull();
        verify(auditLogService).logAction(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("rejectRevision - fails for APPLIED revision")
    void rejectRevision_appliedThrows() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        revision.setStatus(RevisionStatus.APPLIED);

        when(revisionRepository.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));

        assertThatThrownBy(() -> compensationService.rejectRevision(revisionId, "reason"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("applyRevision - fails for non-APPROVED revision")
    void applyRevision_wrongStatus() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        revision.setStatus(RevisionStatus.PENDING_APPROVAL);

        when(revisionRepository.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));

        assertThatThrownBy(() -> compensationService.applyRevision(revisionId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("applyRevision - fails before effective date")
    void applyRevision_beforeEffectiveDate() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now().plusMonths(2))
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);
        revision.setStatus(RevisionStatus.APPROVED);

        when(revisionRepository.findByIdAndTenantId(revisionId, tenantId)).thenReturn(Optional.of(revision));

        assertThatThrownBy(() -> compensationService.applyRevision(revisionId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("effective date");
    }

    // ==================== Query method tests ====================

    @Test
    @DisplayName("getEmployeeRevisionHistory - returns history")
    void getEmployeeRevisionHistory_success() {
        SalaryRevision revision = SalaryRevision.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .previousSalary(new BigDecimal("100000"))
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.now())
                .build();
        revision.setId(revisionId);
        revision.setTenantId(tenantId);

        when(revisionRepository.findByEmployeeIdAndTenantIdOrderByEffectiveDateDesc(employeeId, tenantId))
                .thenReturn(List.of(revision));

        List<SalaryRevisionResponse> result = compensationService.getEmployeeRevisionHistory(employeeId);

        assertThat(result).hasSize(1);
    }
}
