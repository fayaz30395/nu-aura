package com.nulogic.application.benefits.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.benefits.*;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.benefits.repository.BenefitClaimRepository;
import com.nulogic.infrastructure.benefits.repository.BenefitEnrollmentRepository;
import com.nulogic.infrastructure.benefits.repository.FlexBenefitAllocationRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BenefitStatementPdfService")
class BenefitStatementPdfServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private BenefitEnrollmentRepository enrollmentRepository;
    @Mock
    private BenefitClaimRepository claimRepository;
    @Mock
    private FlexBenefitAllocationRepository flexAllocationRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private TenantTimeService tenantTimeService;

    private BenefitStatementPdfService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        service = new BenefitStatementPdfService(enrollmentRepository, claimRepository,
                flexAllocationRepository, employeeRepository, tenantTimeService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        org.mockito.Mockito.lenient().when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2026, 6, 1));
    }

    @Test
    @DisplayName("renders a non-empty PDF with enrollments, contributions and claims")
    void rendersStatement() {
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("Jane");
        employee.setLastName("Doe");
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder().name("Health Plan").build();
        BenefitEnrollment enrollment = BenefitEnrollment.builder()
                .benefitPlan(plan)
                .coverageLevel(BenefitEnrollment.CoverageLevel.EMPLOYEE_ONLY)
                .effectiveDate(LocalDate.of(2026, 1, 1))
                .totalPremium(BigDecimal.valueOf(200))
                .build();
        when(enrollmentRepository.findByTenantIdAndEmployeeIdAndStatus(
                tenantId, employeeId, BenefitEnrollment.EnrollmentStatus.ACTIVE))
                .thenReturn(List.of(enrollment));
        when(enrollmentRepository.calculateTotalEmployeeContribution(tenantId, employeeId))
                .thenReturn(BigDecimal.valueOf(100));
        when(enrollmentRepository.calculateTotalEmployerContribution(tenantId, employeeId))
                .thenReturn(BigDecimal.valueOf(100));

        BenefitClaim claim = BenefitClaim.builder()
                .claimType(BenefitClaim.ClaimType.OUTPATIENT)
                .status(BenefitClaim.ClaimStatus.APPROVED)
                .serviceDate(LocalDate.of(2026, 3, 1))
                .claimedAmount(BigDecimal.valueOf(500))
                .build();
        when(claimRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)).thenReturn(List.of(claim));

        when(flexAllocationRepository.findActiveAllocation(tenantId, employeeId)).thenReturn(Optional.empty());

        byte[] pdf = service.generateStatement(employeeId);

        assertThat(pdf).isNotEmpty();
        // OpenPDF output starts with the PDF magic bytes ("%PDF")
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("throws when employee not found")
    void throwsWhenEmployeeMissing() {
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generateStatement(employeeId))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
