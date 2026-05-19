package com.nulogic.api.leave.mapper;

import com.nulogic.api.leave.dto.LeaveRequestRequest;
import com.nulogic.api.leave.dto.LeaveRequestResponse;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.domain.leave.LeaveRequest.HalfDayPeriod;
import com.nulogic.domain.leave.LeaveRequest.LeaveRequestStatus;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the mass-assignment guard for {@link LeaveRequestMapper}.
 *
 * <p>If anyone in the future adds a sensitive field on {@link LeaveRequest} and
 * forgets to {@code @Mapping(target=…, ignore=true)} on the mapper, the
 * {@code unmappedTargetPolicy=ERROR} will surface it at <em>compile time</em>.
 * These tests verify the runtime behaviour: only client-fillable fields are
 * copied, every server-controlled field stays at its entity default.</p>
 */
class LeaveRequestMapperTest {

    private final LeaveRequestMapper mapper = Mappers.getMapper(LeaveRequestMapper.class);

    @Test
    void toEntity_copies_only_client_fillable_fields() {
        UUID employeeId = UUID.randomUUID();
        UUID leaveTypeId = UUID.randomUUID();
        LeaveRequestRequest request = new LeaveRequestRequest();
        request.setEmployeeId(employeeId);
        request.setLeaveTypeId(leaveTypeId);
        request.setStartDate(LocalDate.of(2026, 5, 20));
        request.setEndDate(LocalDate.of(2026, 5, 22));
        request.setTotalDays(new BigDecimal("3.0"));
        request.setIsHalfDay(false);
        request.setReason("Vacation");
        request.setDocumentPath("/uploads/doctor-note.pdf");

        LeaveRequest entity = mapper.toEntity(request);

        assertThat(entity.getEmployeeId()).isEqualTo(employeeId);
        assertThat(entity.getLeaveTypeId()).isEqualTo(leaveTypeId);
        assertThat(entity.getStartDate()).isEqualTo(LocalDate.of(2026, 5, 20));
        assertThat(entity.getEndDate()).isEqualTo(LocalDate.of(2026, 5, 22));
        assertThat(entity.getTotalDays()).isEqualByComparingTo("3.0");
        assertThat(entity.getIsHalfDay()).isFalse();
        assertThat(entity.getReason()).isEqualTo("Vacation");
        assertThat(entity.getDocumentPath()).isEqualTo("/uploads/doctor-note.pdf");
    }

    @Test
    void toEntity_ignores_every_server_controlled_field() {
        LeaveRequestRequest request = new LeaveRequestRequest();
        request.setEmployeeId(UUID.randomUUID());
        request.setLeaveTypeId(UUID.randomUUID());
        request.setStartDate(LocalDate.of(2026, 5, 20));
        request.setEndDate(LocalDate.of(2026, 5, 20));
        request.setTotalDays(BigDecimal.ONE);
        request.setReason("Sick");

        LeaveRequest entity = mapper.toEntity(request);

        // BaseEntity / TenantAware audit + identity fields — must stay null/default
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.getCreatedAt()).isNull();
        assertThat(entity.getUpdatedAt()).isNull();
        assertThat(entity.getCreatedBy()).isNull();
        assertThat(entity.getLastModifiedBy()).isNull();
        assertThat(entity.getVersion()).isNull();
        assertThat(entity.isDeleted()).isFalse();
        assertThat(entity.getDeletedAt()).isNull();

        // Domain-state fields — server-only
        assertThat(entity.getRequestNumber()).isNull();
        assertThat(entity.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.PENDING);
        assertThat(entity.getAppliedOn()).isNull();
        assertThat(entity.getApprovedBy()).isNull();
        assertThat(entity.getApprovedOn()).isNull();
        assertThat(entity.getRejectionReason()).isNull();
        assertThat(entity.getCancelledOn()).isNull();
        assertThat(entity.getCancellationReason()).isNull();
        assertThat(entity.getComments()).isNull();
    }

    @Test
    void toEntity_normalizes_legacy_FIRST_HALF_alias_to_MORNING() {
        LeaveRequestRequest request = baseRequest();
        request.setHalfDayPeriod("FIRST_HALF");

        LeaveRequest entity = mapper.toEntity(request);

        assertThat(entity.getHalfDayPeriod()).isEqualTo(HalfDayPeriod.MORNING);
    }

    @Test
    void toEntity_normalizes_legacy_SECOND_HALF_alias_to_AFTERNOON() {
        LeaveRequestRequest request = baseRequest();
        request.setHalfDayPeriod("SECOND_HALF");

        LeaveRequest entity = mapper.toEntity(request);

        assertThat(entity.getHalfDayPeriod()).isEqualTo(HalfDayPeriod.AFTERNOON);
    }

    @Test
    void toEntity_passes_through_real_enum_values_unchanged() {
        LeaveRequestRequest morning = baseRequest();
        morning.setHalfDayPeriod("MORNING");
        assertThat(mapper.toEntity(morning).getHalfDayPeriod()).isEqualTo(HalfDayPeriod.MORNING);

        LeaveRequestRequest afternoon = baseRequest();
        afternoon.setHalfDayPeriod("AFTERNOON");
        assertThat(mapper.toEntity(afternoon).getHalfDayPeriod()).isEqualTo(HalfDayPeriod.AFTERNOON);
    }

    @Test
    void toEntity_leaves_halfDayPeriod_null_when_request_omits_it() {
        LeaveRequestRequest request = baseRequest();
        request.setHalfDayPeriod(null);

        LeaveRequest entity = mapper.toEntity(request);

        assertThat(entity.getHalfDayPeriod()).isNull();
    }

    private LeaveRequestRequest baseRequest() {
        LeaveRequestRequest r = new LeaveRequestRequest();
        r.setEmployeeId(UUID.randomUUID());
        r.setLeaveTypeId(UUID.randomUUID());
        r.setStartDate(LocalDate.of(2026, 5, 20));
        r.setEndDate(LocalDate.of(2026, 5, 20));
        r.setTotalDays(BigDecimal.ONE);
        r.setReason("Half-day");
        return r;
    }

    // ============== updateEntity (in-place, SEC-FIX F7) ====================

    @Test
    void updateEntity_overwrites_client_fillable_fields_only() {
        UUID originalEmployeeId = UUID.randomUUID();
        UUID originalApprover = UUID.randomUUID();
        LeaveRequest existing = new LeaveRequest();
        existing.setEmployeeId(originalEmployeeId);
        existing.setLeaveTypeId(UUID.randomUUID());
        existing.setStartDate(LocalDate.of(2026, 5, 1));
        existing.setEndDate(LocalDate.of(2026, 5, 2));
        existing.setTotalDays(new BigDecimal("2.0"));
        existing.setReason("Old reason");
        existing.setStatus(LeaveRequestStatus.APPROVED);  // server-only — must not be overwritten
        existing.setRequestNumber("LR-2026-0001");        // server-only — must not be overwritten
        existing.setApprovedBy(originalApprover);
        existing.setApprovedOn(LocalDateTime.of(2026, 5, 1, 10, 0));

        UUID newLeaveType = UUID.randomUUID();
        LeaveRequestRequest patch = new LeaveRequestRequest();
        patch.setEmployeeId(UUID.randomUUID()); // SEC-FIX F7 — must be ignored
        patch.setLeaveTypeId(newLeaveType);
        patch.setStartDate(LocalDate.of(2026, 5, 10));
        patch.setEndDate(LocalDate.of(2026, 5, 12));
        patch.setTotalDays(new BigDecimal("3.0"));
        patch.setReason("Updated reason");

        mapper.updateEntity(patch, existing);

        // Client-fillable: overwritten
        assertThat(existing.getLeaveTypeId()).isEqualTo(newLeaveType);
        assertThat(existing.getStartDate()).isEqualTo(LocalDate.of(2026, 5, 10));
        assertThat(existing.getEndDate()).isEqualTo(LocalDate.of(2026, 5, 12));
        assertThat(existing.getTotalDays()).isEqualByComparingTo("3.0");
        assertThat(existing.getReason()).isEqualTo("Updated reason");

        // SEC-FIX F7 — employeeId is mass-assignment-protected
        assertThat(existing.getEmployeeId()).isEqualTo(originalEmployeeId);

        // Server-controlled state — preserved
        assertThat(existing.getStatus()).isEqualTo(LeaveRequestStatus.APPROVED);
        assertThat(existing.getRequestNumber()).isEqualTo("LR-2026-0001");
        assertThat(existing.getApprovedBy()).isEqualTo(originalApprover);
        assertThat(existing.getApprovedOn()).isEqualTo(LocalDateTime.of(2026, 5, 1, 10, 0));
    }

    @Test
    void updateEntity_treats_null_request_fields_as_unchanged() {
        // NullValuePropertyMappingStrategy.IGNORE — null in the patch leaves the
        // existing entity value alone (partial-update semantic).
        LeaveRequest existing = new LeaveRequest();
        existing.setEmployeeId(UUID.randomUUID());
        existing.setLeaveTypeId(UUID.randomUUID());
        existing.setStartDate(LocalDate.of(2026, 5, 1));
        existing.setEndDate(LocalDate.of(2026, 5, 2));
        existing.setTotalDays(new BigDecimal("2.0"));
        existing.setReason("Existing reason");
        existing.setDocumentPath("/existing.pdf");

        LeaveRequestRequest patch = new LeaveRequestRequest();
        patch.setReason("New reason only");
        // Every other field null

        mapper.updateEntity(patch, existing);

        assertThat(existing.getReason()).isEqualTo("New reason only");
        assertThat(existing.getStartDate()).isEqualTo(LocalDate.of(2026, 5, 1));
        assertThat(existing.getEndDate()).isEqualTo(LocalDate.of(2026, 5, 2));
        assertThat(existing.getTotalDays()).isEqualByComparingTo("2.0");
        assertThat(existing.getDocumentPath()).isEqualTo("/existing.pdf");
    }

    @Test
    void updateEntity_normalizes_legacy_halfDayPeriod_aliases() {
        LeaveRequest existing = new LeaveRequest();
        LeaveRequestRequest patch = new LeaveRequestRequest();
        patch.setHalfDayPeriod("FIRST_HALF");

        mapper.updateEntity(patch, existing);

        assertThat(existing.getHalfDayPeriod()).isEqualTo(HalfDayPeriod.MORNING);
    }

    // ============== toResponse (entity → response DTO) =====================

    @Test
    void toResponse_copies_every_client_facing_field() {
        UUID id = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID leaveTypeId = UUID.randomUUID();
        UUID approver = UUID.randomUUID();

        LeaveRequest entity = new LeaveRequest();
        entity.setId(id);
        entity.setEmployeeId(employeeId);
        entity.setLeaveTypeId(leaveTypeId);
        entity.setRequestNumber("LR-2026-0042");
        entity.setStartDate(LocalDate.of(2026, 5, 20));
        entity.setEndDate(LocalDate.of(2026, 5, 22));
        entity.setTotalDays(new BigDecimal("3.0"));
        entity.setIsHalfDay(false);
        entity.setReason("Trip");
        entity.setStatus(LeaveRequestStatus.APPROVED);
        entity.setDocumentPath("/uploads/note.pdf");
        entity.setAppliedOn(LocalDateTime.of(2026, 5, 1, 9, 0));
        entity.setApprovedBy(approver);
        entity.setApprovedOn(LocalDateTime.of(2026, 5, 2, 10, 0));
        entity.setComments("Looks good");

        LeaveRequestResponse response = mapper.toResponse(entity);

        assertThat(response.getId()).isEqualTo(id);
        assertThat(response.getEmployeeId()).isEqualTo(employeeId);
        assertThat(response.getLeaveTypeId()).isEqualTo(leaveTypeId);
        assertThat(response.getRequestNumber()).isEqualTo("LR-2026-0042");
        assertThat(response.getStartDate()).isEqualTo(LocalDate.of(2026, 5, 20));
        assertThat(response.getEndDate()).isEqualTo(LocalDate.of(2026, 5, 22));
        assertThat(response.getTotalDays()).isEqualByComparingTo("3.0");
        assertThat(response.getIsHalfDay()).isFalse();
        assertThat(response.getReason()).isEqualTo("Trip");
        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(response.getDocumentPath()).isEqualTo("/uploads/note.pdf");
        assertThat(response.getAppliedOn()).isEqualTo(LocalDateTime.of(2026, 5, 1, 9, 0));
        assertThat(response.getApprovedBy()).isEqualTo(approver);
        assertThat(response.getApprovedOn()).isEqualTo(LocalDateTime.of(2026, 5, 2, 10, 0));
        assertThat(response.getComments()).isEqualTo("Looks good");
    }

    @Test
    void toResponse_null_status_surfaces_as_legacy_UNKNOWN_sentinel() {
        // Preserves the prior controller branch:
        //   request.getStatus() != null ? request.getStatus().name() : "UNKNOWN"
        LeaveRequest entity = new LeaveRequest();
        entity.setStatus(null);

        LeaveRequestResponse response = mapper.toResponse(entity);

        assertThat(response.getStatus()).isEqualTo("UNKNOWN");
    }

    @Test
    void toResponse_null_halfDayPeriod_stays_null() {
        // Preserves the prior controller branch:
        //   if (request.getHalfDayPeriod() != null) { response.setHalfDayPeriod(...); }
        LeaveRequest entity = new LeaveRequest();
        entity.setStatus(LeaveRequestStatus.PENDING);
        entity.setHalfDayPeriod(null);

        LeaveRequestResponse response = mapper.toResponse(entity);

        assertThat(response.getHalfDayPeriod()).isNull();
    }

    @Test
    void toResponse_halfDayPeriod_enum_serialises_to_its_name() {
        LeaveRequest entity = new LeaveRequest();
        entity.setStatus(LeaveRequestStatus.PENDING);
        entity.setHalfDayPeriod(HalfDayPeriod.AFTERNOON);

        LeaveRequestResponse response = mapper.toResponse(entity);

        assertThat(response.getHalfDayPeriod()).isEqualTo("AFTERNOON");
    }

    @Test
    void toResponse_leaves_enrichment_fields_null_for_controller_to_populate() {
        // approverId / approverName / pendingApproverName come from repository
        // projection queries — the mapper cannot derive them. They are marked
        // ignore=true on toResponse and stay null here.
        LeaveRequest entity = new LeaveRequest();
        entity.setEmployeeId(UUID.randomUUID());
        entity.setApprovedBy(UUID.randomUUID());
        entity.setStatus(LeaveRequestStatus.APPROVED);

        LeaveRequestResponse response = mapper.toResponse(entity);

        assertThat(response.getApproverId()).isNull();
        assertThat(response.getApproverName()).isNull();
        assertThat(response.getPendingApproverName()).isNull();
    }
}
