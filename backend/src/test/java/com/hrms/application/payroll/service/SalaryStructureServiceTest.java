package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SalaryStructureService Tests")
class SalaryStructureServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private SalaryStructureRepository salaryStructureRepository;
    @Mock
    private AuditLogService auditLogService;
    @InjectMocks
    private SalaryStructureService salaryStructureService;
    private UUID tenantId;
    private UUID employeeId;
    private SalaryStructure salaryStructure;

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
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        salaryStructure = SalaryStructure.builder()
                .employeeId(employeeId)
                .effectiveDate(LocalDate.of(2025, 1, 1))
                .basicSalary(new BigDecimal("50000"))
                .hra(new BigDecimal("20000"))
                .conveyanceAllowance(new BigDecimal("1600"))
                .medicalAllowance(new BigDecimal("1250"))
                .specialAllowance(new BigDecimal("10000"))
                .otherAllowances(new BigDecimal("5000"))
                .providentFund(new BigDecimal("6000"))
                .professionalTax(new BigDecimal("200"))
                .incomeTax(new BigDecimal("5000"))
                .otherDeductions(new BigDecimal("1000"))
                .isActive(true)
                .build();
        salaryStructure.setId(UUID.randomUUID());
        salaryStructure.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Salary Structure Tests")
    class CreateSalaryStructureTests {

        @Test
        @DisplayName("Should create salary structure successfully")
        void shouldCreateSalaryStructureSuccessfully() {
            when(salaryStructureRepository.existsByTenantIdAndEmployeeIdAndEffectiveDate(
                    any(), any(), any())).thenReturn(false);
            when(salaryStructureRepository.save(any(SalaryStructure.class)))
                    .thenAnswer(invocation -> {
                        SalaryStructure s = invocation.getArgument(0);
                        s.setId(UUID.randomUUID());
                        return s;
                    });

            SalaryStructure result = salaryStructureService.createSalaryStructure(salaryStructure);

            assertThat(result).isNotNull();
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
            verify(salaryStructureRepository).save(any(SalaryStructure.class));
        }

        @Test
        @DisplayName("Should throw exception when salary structure already exists")
        void shouldThrowExceptionWhenSalaryStructureExists() {
            when(salaryStructureRepository.existsByTenantIdAndEmployeeIdAndEffectiveDate(
                    tenantId, employeeId, LocalDate.of(2025, 1, 1))).thenReturn(true);

            assertThatThrownBy(() -> salaryStructureService.createSalaryStructure(salaryStructure))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Nested
    @DisplayName("Update Salary Structure Tests")
    class UpdateSalaryStructureTests {

        @Test
        @DisplayName("Should update salary structure successfully")
        void shouldUpdateSalaryStructureSuccessfully() {
            UUID structureId = salaryStructure.getId();
            when(salaryStructureRepository.findById(structureId)).thenReturn(Optional.of(salaryStructure));
            when(salaryStructureRepository.save(any(SalaryStructure.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            SalaryStructure updatedData = SalaryStructure.builder()
                    .employeeId(employeeId)
                    .effectiveDate(LocalDate.of(2025, 4, 1))
                    .basicSalary(new BigDecimal("55000"))
                    .hra(new BigDecimal("22000"))
                    .conveyanceAllowance(new BigDecimal("1800"))
                    .medicalAllowance(new BigDecimal("1500"))
                    .specialAllowance(new BigDecimal("12000"))
                    .otherAllowances(new BigDecimal("6000"))
                    .providentFund(new BigDecimal("6600"))
                    .professionalTax(new BigDecimal("200"))
                    .incomeTax(new BigDecimal("6000"))
                    .otherDeductions(new BigDecimal("1200"))
                    .isActive(true)
                    .build();

            SalaryStructure result = salaryStructureService.updateSalaryStructure(structureId, updatedData);

            assertThat(result).isNotNull();
            assertThat(result.getBasicSalary()).isEqualTo(new BigDecimal("55000"));
            assertThat(result.getEffectiveDate()).isEqualTo(LocalDate.of(2025, 4, 1));
        }

        @Test
        @DisplayName("Should throw exception when salary structure not found")
        void shouldThrowExceptionWhenNotFound() {
            UUID invalidId = UUID.randomUUID();
            when(salaryStructureRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> salaryStructureService.updateSalaryStructure(invalidId, salaryStructure))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should throw exception when tenant mismatch")
        void shouldThrowExceptionWhenTenantMismatch() {
            UUID structureId = salaryStructure.getId();
            salaryStructure.setTenantId(UUID.randomUUID()); // Different tenant
            when(salaryStructureRepository.findById(structureId)).thenReturn(Optional.of(salaryStructure));

            assertThatThrownBy(() -> salaryStructureService.updateSalaryStructure(structureId, salaryStructure))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Get Salary Structure Tests")
    class GetSalaryStructureTests {

        @Test
        @DisplayName("Should get salary structure by ID")
        void shouldGetSalaryStructureById() {
            UUID structureId = salaryStructure.getId();
            when(salaryStructureRepository.findById(structureId)).thenReturn(Optional.of(salaryStructure));

            SalaryStructure result = salaryStructureService.getSalaryStructureById(structureId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(structureId);
        }

        @Test
        @DisplayName("Should throw exception when not found by ID")
        void shouldThrowExceptionWhenNotFoundById() {
            UUID invalidId = UUID.randomUUID();
            when(salaryStructureRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> salaryStructureService.getSalaryStructureById(invalidId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get all salary structures with pagination")
        void shouldGetAllSalaryStructuresWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<SalaryStructure> page = new PageImpl<>(List.of(salaryStructure));
            when(salaryStructureRepository.findAllByTenantId(tenantId, pageable)).thenReturn(page);

            Page<SalaryStructure> result = salaryStructureService.getAllSalaryStructures(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get salary structures by employee ID")
        void shouldGetSalaryStructuresByEmployeeId() {
            when(salaryStructureRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(salaryStructure));

            List<SalaryStructure> result = salaryStructureService.getSalaryStructuresByEmployeeId(employeeId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should get active salary structure for employee and date")
        void shouldGetActiveSalaryStructure() {
            LocalDate date = LocalDate.of(2025, 3, 15);
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(tenantId, employeeId, date))
                    .thenReturn(Optional.of(salaryStructure));

            SalaryStructure result = salaryStructureService.getActiveSalaryStructure(employeeId, date);

            assertThat(result).isNotNull();
            assertThat(result.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("Should throw exception when no active salary structure found")
        void shouldThrowExceptionWhenNoActiveSalaryStructure() {
            LocalDate date = LocalDate.of(2020, 1, 1);
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(tenantId, employeeId, date))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> salaryStructureService.getActiveSalaryStructure(employeeId, date))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No active salary structure");
        }

        @Test
        @DisplayName("Should get all active salary structures with pagination")
        void shouldGetAllActiveSalaryStructures() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<SalaryStructure> page = new PageImpl<>(List.of(salaryStructure));
            when(salaryStructureRepository.findAllByTenantIdAndIsActive(tenantId, true, pageable))
                    .thenReturn(page);

            Page<SalaryStructure> result = salaryStructureService.getActiveSalaryStructures(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getIsActive()).isTrue();
        }
    }

    @Nested
    @DisplayName("Delete Salary Structure Tests")
    class DeleteSalaryStructureTests {

        @Test
        @DisplayName("Should delete salary structure successfully")
        void shouldDeleteSalaryStructureSuccessfully() {
            UUID structureId = salaryStructure.getId();
            when(salaryStructureRepository.findById(structureId)).thenReturn(Optional.of(salaryStructure));
            when(salaryStructureRepository.save(any(SalaryStructure.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            salaryStructureService.deleteSalaryStructure(structureId);

            verify(salaryStructureRepository).save(any(SalaryStructure.class));
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent structure")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            UUID invalidId = UUID.randomUUID();
            when(salaryStructureRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> salaryStructureService.deleteSalaryStructure(invalidId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Deactivate Salary Structure Tests")
    class DeactivateSalaryStructureTests {

        @Test
        @DisplayName("Should deactivate salary structure successfully")
        void shouldDeactivateSalaryStructureSuccessfully() {
            UUID structureId = salaryStructure.getId();
            when(salaryStructureRepository.findById(structureId)).thenReturn(Optional.of(salaryStructure));
            when(salaryStructureRepository.save(any(SalaryStructure.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            SalaryStructure result = salaryStructureService.deactivateSalaryStructure(structureId);

            assertThat(result).isNotNull();
            assertThat(result.getIsActive()).isFalse();
            verify(salaryStructureRepository).save(any(SalaryStructure.class));
        }

        @Test
        @DisplayName("Should throw exception when deactivating non-existent structure")
        void shouldThrowExceptionWhenDeactivatingNonExistent() {
            UUID invalidId = UUID.randomUUID();
            when(salaryStructureRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> salaryStructureService.deactivateSalaryStructure(invalidId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
