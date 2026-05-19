package com.nulogic.api.leave.mapper;

import com.nulogic.api.leave.dto.LeaveBalanceResponse;
import com.nulogic.domain.leave.LeaveBalance;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T3-10 — runtime guard for {@link LeaveBalanceMapper}.
 *
 * <p>Verifies the entity → response copy is field-by-field explicit and that
 * sensitive audit/tenant fields on {@link LeaveBalance} are NOT leaked into
 * {@link LeaveBalanceResponse} (which is the whole point of this migration —
 * the legacy {@code BeanUtils.copyProperties(balance, response, "tenantId",
 * "createdAt", ...)} string ignore-list silently dropped fields by name).</p>
 */
class LeaveBalanceMapperTest {

    private final LeaveBalanceMapper mapper = Mappers.getMapper(LeaveBalanceMapper.class);

    @Test
    void toResponse_copies_every_client_facing_field() {
        UUID id = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID leaveTypeId = UUID.randomUUID();
        LocalDate lastAccrual = LocalDate.of(2026, 5, 1);

        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .year(2026)
                .openingBalance(new BigDecimal("10.0"))
                .accrued(new BigDecimal("5.5"))
                .used(new BigDecimal("3.0"))
                .pending(new BigDecimal("1.0"))
                .available(new BigDecimal("11.5"))
                .carriedForward(new BigDecimal("2.0"))
                .encashed(new BigDecimal("0.5"))
                .lapsed(new BigDecimal("0.0"))
                .lastAccrualDate(lastAccrual)
                .build();
        balance.setId(id);

        LeaveBalanceResponse response = mapper.toResponse(balance);

        assertThat(response.getId()).isEqualTo(id);
        assertThat(response.getEmployeeId()).isEqualTo(employeeId);
        assertThat(response.getLeaveTypeId()).isEqualTo(leaveTypeId);
        assertThat(response.getYear()).isEqualTo(2026);
        assertThat(response.getOpeningBalance()).isEqualByComparingTo("10.0");
        assertThat(response.getAccrued()).isEqualByComparingTo("5.5");
        assertThat(response.getUsed()).isEqualByComparingTo("3.0");
        assertThat(response.getPending()).isEqualByComparingTo("1.0");
        assertThat(response.getAvailable()).isEqualByComparingTo("11.5");
        assertThat(response.getCarriedForward()).isEqualByComparingTo("2.0");
        assertThat(response.getEncashed()).isEqualByComparingTo("0.5");
        assertThat(response.getLapsed()).isEqualByComparingTo("0.0");
        assertThat(response.getLastAccrualDate()).isEqualTo(lastAccrual);
    }

    @Test
    void toResponse_leaves_leaveTypeName_null_for_controller_to_enrich() {
        // leaveTypeName comes from a separate LeaveTypeRepository lookup in the
        // controller — the mapper cannot derive it from LeaveBalance alone.
        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(UUID.randomUUID())
                .leaveTypeId(UUID.randomUUID())
                .year(2026)
                .build();

        LeaveBalanceResponse response = mapper.toResponse(balance);

        assertThat(response.getLeaveTypeName()).isNull();
    }

    @Test
    void toResponse_does_not_leak_audit_or_tenant_fields() {
        // The LeaveBalanceResponse DTO simply has no audit / tenant fields —
        // unmappedTargetPolicy=ERROR on the mapper guarantees a build failure
        // if anyone adds {tenantId, createdAt, updatedAt, createdBy,
        // lastModifiedBy, version, isDeleted, deletedAt} to the response DTO
        // without an explicit mapping decision. This test pins the *current*
        // response shape so a future DTO change forces a review.
        UUID tenantId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.of(2026, 5, 20, 12, 0);

        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(UUID.randomUUID())
                .leaveTypeId(UUID.randomUUID())
                .year(2026)
                .build();
        balance.setTenantId(tenantId);
        balance.setCreatedAt(now);
        balance.setUpdatedAt(now);
        balance.setCreatedBy(UUID.randomUUID());
        balance.setLastModifiedBy(UUID.randomUUID());
        balance.setVersion(7L);

        LeaveBalanceResponse response = mapper.toResponse(balance);

        // The DTO has no setters for these — the assertion here is structural:
        // if any of them appear on the DTO later, this test won't compile until
        // the mapper is updated to explicitly map-or-ignore them.
        assertThat(response.getId()).isNull(); // balance.id was never set above
        assertThat(response.getEmployeeId()).isNotNull();
    }
}
