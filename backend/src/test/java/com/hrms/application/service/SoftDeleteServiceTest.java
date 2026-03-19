package com.hrms.application.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.attendance.service.HolidayService;
import com.hrms.application.employee.service.DepartmentService;
import com.hrms.application.leave.service.LeaveTypeService;
import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.application.payroll.service.PayslipService;
import com.hrms.application.payroll.service.SalaryStructureService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.attendance.Holiday;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.employee.Department;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests verifying that critical services perform soft-delete
 * (set isDeleted=true + deletedAt) instead of hard-delete (repository.delete()).
 *
 * <p>Each test verifies:
 * <ol>
 *   <li>The entity is marked as soft-deleted (isDeleted=true, deletedAt populated)</li>
 *   <li>repository.save() is called (NOT repository.delete())</li>
 *   <li>An audit log entry is created for the deletion</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
class SoftDeleteServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ENTITY_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
        SecurityContext.setCurrentUser(USER_ID, USER_ID,
                java.util.Set.of("ADMIN"),
                java.util.Map.of("employee.read", RoleScope.GLOBAL));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    // ========== DepartmentService ==========

    @Nested
    @DisplayName("DepartmentService.deleteDepartment()")
    class DepartmentSoftDeleteTest {

        @InjectMocks
        private DepartmentService departmentService;

        @Mock
        private DepartmentRepository departmentRepository;

        @Mock
        private EmployeeRepository employeeRepository;

        @Mock
        private AuditLogService auditLogService;

        @Test
        @DisplayName("should soft-delete department and create audit log")
        void shouldSoftDeleteDepartment() {
            Department dept = Department.builder()
                    .code("ENG")
                    .name("Engineering")
                    .isActive(true)
                    .build();
            dept.setId(ENTITY_ID);
            dept.setTenantId(TENANT_ID);

            when(departmentRepository.findById(ENTITY_ID)).thenReturn(Optional.of(dept));
            when(employeeRepository.countByDepartmentIdAndTenantId(ENTITY_ID, TENANT_ID)).thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(TENANT_ID, ENTITY_ID)).thenReturn(0L);
            when(departmentRepository.save(any(Department.class))).thenAnswer(inv -> inv.getArgument(0));
            when(auditLogService.logAction(anyString(), any(), any(), any(), any(), anyString()))
                    .thenReturn(new AuditLog());

            departmentService.deleteDepartment(ENTITY_ID);

            assertThat(dept.isDeleted()).isTrue();
            assertThat(dept.getDeletedAt()).isNotNull();
            verify(departmentRepository).save(dept);
            verify(departmentRepository, never()).delete(any());
            verify(auditLogService).logAction(eq("DEPARTMENT"), eq(ENTITY_ID), eq(AuditLog.AuditAction.DELETE),
                    any(), any(), contains("soft-deleted"));
        }
    }

    // ========== PayslipService ==========

    @Nested
    @DisplayName("PayslipService.deletePayslip()")
    class PayslipSoftDeleteTest {

        @InjectMocks
        private PayslipService payslipService;

        @Mock
        private PayslipRepository payslipRepository;

        @Mock
        private AuditLogService auditLogService;

        @Test
        @DisplayName("should soft-delete payslip and create audit log")
        void shouldSoftDeletePayslip() {
            Payslip payslip = Payslip.builder()
                    .employeeId(UUID.randomUUID())
                    .payPeriodYear(2026)
                    .payPeriodMonth(3)
                    .build();
            payslip.setId(ENTITY_ID);
            payslip.setTenantId(TENANT_ID);

            when(payslipRepository.findById(ENTITY_ID)).thenReturn(Optional.of(payslip));
            when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));
            when(auditLogService.logAction(anyString(), any(), any(), any(), any(), anyString()))
                    .thenReturn(new AuditLog());

            payslipService.deletePayslip(ENTITY_ID);

            assertThat(payslip.isDeleted()).isTrue();
            assertThat(payslip.getDeletedAt()).isNotNull();
            verify(payslipRepository).save(payslip);
            verify(payslipRepository, never()).delete(any());
            verify(auditLogService).logAction(eq("PAYSLIP"), eq(ENTITY_ID), eq(AuditLog.AuditAction.DELETE),
                    any(), any(), contains("soft-deleted"));
        }
    }

    // ========== SalaryStructureService ==========

    @Nested
    @DisplayName("SalaryStructureService.deleteSalaryStructure()")
    class SalaryStructureSoftDeleteTest {

        @InjectMocks
        private SalaryStructureService salaryStructureService;

        @Mock
        private SalaryStructureRepository salaryStructureRepository;

        @Mock
        private AuditLogService auditLogService;

        @Test
        @DisplayName("should soft-delete salary structure and create audit log")
        void shouldSoftDeleteSalaryStructure() {
            SalaryStructure structure = SalaryStructure.builder()
                    .employeeId(UUID.randomUUID())
                    .basicSalary(BigDecimal.valueOf(50000))
                    .effectiveDate(LocalDate.now())
                    .build();
            structure.setId(ENTITY_ID);
            structure.setTenantId(TENANT_ID);

            when(salaryStructureRepository.findById(ENTITY_ID)).thenReturn(Optional.of(structure));
            when(salaryStructureRepository.save(any(SalaryStructure.class))).thenAnswer(inv -> inv.getArgument(0));
            when(auditLogService.logAction(anyString(), any(), any(), any(), any(), anyString()))
                    .thenReturn(new AuditLog());

            salaryStructureService.deleteSalaryStructure(ENTITY_ID);

            assertThat(structure.isDeleted()).isTrue();
            assertThat(structure.getDeletedAt()).isNotNull();
            verify(salaryStructureRepository).save(structure);
            verify(salaryStructureRepository, never()).delete(any());
            verify(auditLogService).logAction(eq("SALARY_STRUCTURE"), eq(ENTITY_ID), eq(AuditLog.AuditAction.DELETE),
                    any(), any(), contains("soft-deleted"));
        }
    }

    // ========== PayrollRunService ==========

    @Nested
    @DisplayName("PayrollRunService.deletePayrollRun()")
    class PayrollRunSoftDeleteTest {

        @InjectMocks
        private PayrollRunService payrollRunService;

        @Mock
        private PayrollRunRepository payrollRunRepository;

        @Mock
        private AuditLogService auditLogService;

        @Test
        @DisplayName("should soft-delete payroll run and create audit log")
        void shouldSoftDeletePayrollRun() {
            PayrollRun run = PayrollRun.builder()
                    .payPeriodYear(2026)
                    .payPeriodMonth(3)
                    .status(PayrollRun.PayrollStatus.DRAFT)
                    .build();
            run.setId(ENTITY_ID);
            run.setTenantId(TENANT_ID);

            when(payrollRunRepository.findById(ENTITY_ID)).thenReturn(Optional.of(run));
            when(payrollRunRepository.save(any(PayrollRun.class))).thenAnswer(inv -> inv.getArgument(0));
            when(auditLogService.logAction(anyString(), any(), any(), any(), any(), anyString()))
                    .thenReturn(new AuditLog());

            payrollRunService.deletePayrollRun(ENTITY_ID);

            assertThat(run.isDeleted()).isTrue();
            assertThat(run.getDeletedAt()).isNotNull();
            verify(payrollRunRepository).save(run);
            verify(payrollRunRepository, never()).delete(any());
            verify(auditLogService).logAction(eq("PAYROLL_RUN"), eq(ENTITY_ID), eq(AuditLog.AuditAction.DELETE),
                    any(), any(), contains("soft-deleted"));
        }
    }

    // ========== LeaveTypeService ==========

    @Nested
    @DisplayName("LeaveTypeService.deleteLeaveType()")
    class LeaveTypeSoftDeleteTest {

        @InjectMocks
        private LeaveTypeService leaveTypeService;

        @Mock
        private LeaveTypeRepository leaveTypeRepository;

        @Mock
        private AuditLogService auditLogService;

        @Test
        @DisplayName("should soft-delete leave type and create audit log")
        void shouldSoftDeleteLeaveType() {
            LeaveType leaveType = LeaveType.builder()
                    .leaveCode("CL")
                    .leaveName("Casual Leave")
                    .build();
            leaveType.setId(ENTITY_ID);
            leaveType.setTenantId(TENANT_ID);

            when(leaveTypeRepository.findById(ENTITY_ID)).thenReturn(Optional.of(leaveType));
            when(leaveTypeRepository.save(any(LeaveType.class))).thenAnswer(inv -> inv.getArgument(0));
            when(auditLogService.logAction(anyString(), any(), any(), any(), any(), anyString()))
                    .thenReturn(new AuditLog());

            leaveTypeService.deleteLeaveType(ENTITY_ID);

            assertThat(leaveType.isDeleted()).isTrue();
            assertThat(leaveType.getDeletedAt()).isNotNull();
            verify(leaveTypeRepository).save(leaveType);
            verify(leaveTypeRepository, never()).delete(any());
            verify(auditLogService).logAction(eq("LEAVE_TYPE"), eq(ENTITY_ID), eq(AuditLog.AuditAction.DELETE),
                    any(), any(), contains("soft-deleted"));
        }
    }

    // ========== HolidayService ==========

    @Nested
    @DisplayName("HolidayService.deleteHoliday()")
    class HolidaySoftDeleteTest {

        @InjectMocks
        private HolidayService holidayService;

        @Mock
        private HolidayRepository holidayRepository;

        @Mock
        private AuditLogService auditLogService;

        @Test
        @DisplayName("should soft-delete holiday and create audit log")
        void shouldSoftDeleteHoliday() {
            Holiday holiday = Holiday.builder()
                    .holidayName("Republic Day")
                    .holidayDate(LocalDate.of(2026, 1, 26))
                    .build();
            holiday.setId(ENTITY_ID);
            holiday.setTenantId(TENANT_ID);

            when(holidayRepository.findById(ENTITY_ID)).thenReturn(Optional.of(holiday));
            when(holidayRepository.save(any(Holiday.class))).thenAnswer(inv -> inv.getArgument(0));
            when(auditLogService.logAction(anyString(), any(), any(), any(), any(), anyString()))
                    .thenReturn(new AuditLog());

            holidayService.deleteHoliday(ENTITY_ID);

            assertThat(holiday.isDeleted()).isTrue();
            assertThat(holiday.getDeletedAt()).isNotNull();
            verify(holidayRepository).save(holiday);
            verify(holidayRepository, never()).delete(any());
            verify(auditLogService).logAction(eq("HOLIDAY"), eq(ENTITY_ID), eq(AuditLog.AuditAction.DELETE),
                    any(), any(), contains("soft-deleted"));
        }
    }
}
