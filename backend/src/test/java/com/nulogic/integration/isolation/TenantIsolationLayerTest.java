package com.nulogic.integration.isolation;

import com.nulogic.application.employee.service.EmployeeService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.function.Supplier;

import static com.nulogic.integration.isolation.TwoTenantFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Repository / service / JDBC layers under the real RLS wiring (TenantRlsTransactionManager +
 * TenantAwareDataSource, connections as nu_app_rls). Shows that even application code that passes
 * the WRONG tenant id, or no tenant at all, cannot read another tenant's rows.
 */
@DisplayName("Tenant isolation: repository, service and JDBC layers")
class TenantIsolationLayerTest extends AbstractTenantIsolationIntegrationTest {

    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private LeaveRequestRepository leaveRequestRepository;
    @Autowired
    private PayslipRepository payslipRepository;
    @Autowired
    private EmployeeService employeeService;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @Autowired
    private DataSource dataSource;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private <T> T inTx(Tenant tenant, Supplier<T> work) {
        if (tenant == null) {
            TenantContext.clear();
        } else {
            TenantContext.setCurrentTenant(tenant.id());
        }
        try {
            return new TransactionTemplate(transactionManager).execute(s -> work.get());
        } finally {
            TenantContext.clear();
        }
    }

    @Test
    @DisplayName("tenant A context: findById / findAll / count never return tenant B rows")
    void repositoriesSeeOnlyTheContextTenant() {
        assertThat(inTx(Tenant.A, () -> employeeRepository.findById(Tenant.B.id(EMPLOYEE, 2)))).isEmpty();
        assertThat(inTx(Tenant.A, () -> departmentRepository.findById(Tenant.B.id(DEPARTMENT)))).isEmpty();
        assertThat(inTx(Tenant.A, () -> leaveRequestRepository.findById(Tenant.B.id(LEAVE_REQUEST)))).isEmpty();
        assertThat(inTx(Tenant.A, () -> payslipRepository.findById(Tenant.B.id(PAYSLIP)))).isEmpty();

        List<Employee> all = inTx(Tenant.A, () -> (List<Employee>) employeeRepository.findAll());
        assertThat(all).isNotEmpty().allSatisfy(e -> assertThat(e.getTenantId()).isEqualTo(Tenant.A.id()));
        assertThat(inTx(Tenant.A, () -> (Long) employeeRepository.count())).isEqualTo((long) all.size());
        // positive control: the same lookups work for the owning tenant
        assertThat(inTx(Tenant.B, () -> employeeRepository.findById(Tenant.B.id(EMPLOYEE, 2)))).isPresent();
    }

    @Test
    @DisplayName("custom query given tenant B's id explicitly, while the context is A, still returns nothing (RLS backstop)")
    void wrongTenantParameterIsStoppedByRls() {
        assertThat(inTx(Tenant.A, () -> employeeRepository.findByIdAndTenantId(Tenant.B.id(EMPLOYEE, 2), Tenant.B.id())))
                .isEmpty();
        assertThat(inTx(Tenant.A, () -> employeeRepository.findAllByTenantId(Tenant.B.id(), PageRequest.of(0, 50))
                .getTotalElements())).isZero();
    }

    @Test
    @DisplayName("fails if tenant context is missing: repositories return ZERO rows, the service throws")
    void missingTenantContextFailsClosed() {
        assertThat(inTx(null, () -> (Long) employeeRepository.count())).isZero();
        assertThat(inTx(null, () -> (List<Employee>) employeeRepository.findAll())).isEmpty();
        assertThat(inTx(null, () -> employeeRepository.findById(Tenant.A.id(EMPLOYEE, 2)))).isEmpty();
        assertThat(inTx(null, () -> employeeRepository.findByIdAndTenantId(Tenant.A.id(EMPLOYEE, 2), Tenant.A.id())))
                .isEmpty();
        TenantContext.clear();
        assertThatThrownBy(() -> employeeService.getEmployee(Tenant.A.id(EMPLOYEE, 2)))
                .as("service must refuse to run without a tenant").isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("JdbcTemplate through the tenant-aware DataSource: GUC follows TenantContext and never sticks to pooled connections")
    void jdbcPathIsTenantScopedAndResetOnCheckout() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        String foreign = "SELECT count(*) FROM employees WHERE tenant_id = ?";
        for (Tenant t : Tenant.values()) {
            TenantContext.setCurrentTenant(t.id());
            assertThat(jdbc.queryForObject(foreign, Long.class, t.other().id())).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM employees", Long.class))
                    .isEqualTo(jdbc.queryForObject(foreign, Long.class, t.id())).isPositive();
            assertThat(jdbc.queryForObject("SELECT current_setting('app.current_tenant_id', true)", String.class))
                    .isEqualTo(t.id().toString());
        }
        TenantContext.clear();
        // Many checkouts after tenant-scoped use: none may inherit a stale GUC.
        for (int i = 0; i < 25; i++) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM employees", Long.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT coalesce(current_setting('app.current_tenant_id', true), '')",
                    String.class)).isEmpty();
        }
    }

    @Test
    @DisplayName("tenant switched INSIDE an open transaction does not switch RLS (GUC is bound at begin) - fails closed")
    void tenantSwitchInsideTransactionDoesNotWidenAccess() {
        TenantContext.clear();
        Long seen = new TransactionTemplate(transactionManager).execute(s -> {
            TenantContext.setCurrentTenant(Tenant.B.id());
            return employeeRepository.count();
        });
        TenantContext.clear();
        assertThat(seen).as("rows visible after switching tenant mid-transaction").isZero();

        TenantContext.setCurrentTenant(Tenant.A.id());
        Long underA = new TransactionTemplate(transactionManager).execute(s -> {
            TenantContext.setCurrentTenant(Tenant.B.id());
            return employeeRepository.findAll().stream().filter(e -> Tenant.B.id().equals(e.getTenantId())).count();
        });
        assertThat(underA).as("switching to B inside an A transaction must not expose B").isZero();
    }
}
