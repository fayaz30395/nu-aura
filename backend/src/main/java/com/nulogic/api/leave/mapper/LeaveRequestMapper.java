package com.nulogic.api.leave.mapper;

import com.nulogic.api.leave.dto.LeaveRequestRequest;
import com.nulogic.api.leave.dto.LeaveRequestResponse;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.domain.leave.LeaveRequest.HalfDayPeriod;
import com.nulogic.domain.leave.LeaveRequest.LeaveRequestStatus;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * T3-10 — MapStruct mapper for {@link LeaveRequestRequest} → {@link LeaveRequest}.
 *
 * <p>Replaces {@code BeanUtils.copyProperties(request, leaveRequest, ...)} in
 * {@code LeaveRequestController#createLeaveRequest} (SEC-FIX F7). With
 * {@code unmappedTargetPolicy = ERROR}, a new sensitive field on
 * {@link LeaveRequest} now breaks the build until it is either explicitly
 * mapped or explicitly ignored here.</p>
 *
 * <p>The controller's post-mapping logic (BUG-QA2-001 totalDays compute)
 * is retained. The half-day period alias normalization (legacy clients sending
 * {@code FIRST_HALF}/{@code SECOND_HALF}; entity actually stores
 * {@code MORNING}/{@code AFTERNOON} — see {@link LeaveRequest.HalfDayPeriod})
 * is expressed in {@link #toHalfDayPeriod(String)} below so any future caller
 * of this mapper gets it for free.</p>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LeaveRequestMapper {

    // ----- Server-owned audit/identity fields (BaseEntity + TenantAware) -----
    @Mapping(target = "id", ignore = true)                  // JPA-generated UUID
    @Mapping(target = "tenantId", ignore = true)            // TenantEntityListener populates from SecurityContext
    @Mapping(target = "createdAt", ignore = true)           // JPA auditing
    @Mapping(target = "updatedAt", ignore = true)           // JPA auditing
    @Mapping(target = "createdBy", ignore = true)           // JPA auditing
    @Mapping(target = "lastModifiedBy", ignore = true)      // JPA auditing
    @Mapping(target = "version", ignore = true)             // JPA @Version
    @Mapping(target = "isDeleted", ignore = true)           // soft-delete flag
    @Mapping(target = "deletedAt", ignore = true)           // soft-delete timestamp

    // ----- Domain state — server-controlled, never client-bound --------------
    @Mapping(target = "requestNumber", ignore = true)       // server-generated reference
    @Mapping(target = "status", ignore = true)              // defaults to PENDING; transitions via approve/reject/cancel
    @Mapping(target = "appliedOn", ignore = true)           // set by service on create
    @Mapping(target = "approvedBy", ignore = true)          // set by approve()
    @Mapping(target = "approvedOn", ignore = true)          // set by approve()
    @Mapping(target = "rejectionReason", ignore = true)     // set by reject()
    @Mapping(target = "cancelledOn", ignore = true)         // set by cancel()
    @Mapping(target = "cancellationReason", ignore = true)  // set by cancel()
    @Mapping(target = "comments", ignore = true)            // internal admin notes only

    // ----- Mapped fields — String → enum via the default method below -------
    @Mapping(target = "halfDayPeriod", source = "halfDayPeriod")
    LeaveRequest toEntity(LeaveRequestRequest request);

    // ----- DTO → Entity (update, in-place) -----------------------------------
    // Used by the update endpoint. Same ignore-list as toEntity PLUS employeeId
    // (SEC-FIX F7 — the owner of a leave request must not be re-assigned via
    // mass assignment on update). NullValuePropertyMappingStrategy.IGNORE means
    // a null field in the request leaves the existing entity value alone, which
    // is the partial-update semantic the controller previously got from
    // BeanUtils.copyProperties.
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "deleted", ignore = true)        // soft-delete flag (Lombok exposes `deleted` setter)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "requestNumber", ignore = true)  // server-generated reference, immutable post-create
    @Mapping(target = "status", ignore = true)         // transitions via approve/reject/cancel — never via update
    @Mapping(target = "appliedOn", ignore = true)      // set by service on create
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "approvedOn", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "cancelledOn", ignore = true)
    @Mapping(target = "cancellationReason", ignore = true)
    @Mapping(target = "comments", ignore = true)
    @Mapping(target = "employeeId", ignore = true)     // SEC-FIX F7 — owner not re-assignable via update
    @Mapping(target = "halfDayPeriod", source = "halfDayPeriod")
    void updateEntity(LeaveRequestRequest request, @MappingTarget LeaveRequest entity);

    // ----- Entity → Response DTO ---------------------------------------------
    // Replaces BeanUtils.copyProperties(request, response) in the controller's
    // toResponse() / toBasicResponse() helpers. status and halfDayPeriod are
    // enum → String via the default methods below; the legacy "UNKNOWN" string
    // for a null status is preserved.
    //
    // approverId / approverName / pendingApproverName are enrichment fields
    // populated by the controller from repository projection queries (cannot be
    // derived from the LeaveRequest entity alone) — ignored here.
    @Mapping(target = "status", source = "status")
    @Mapping(target = "halfDayPeriod", source = "halfDayPeriod")
    @Mapping(target = "approverId", ignore = true)             // controller-enriched from manager projection
    @Mapping(target = "approverName", ignore = true)           // controller-enriched from name projection
    @Mapping(target = "pendingApproverName", ignore = true)    // controller-enriched from manager-name projection
    LeaveRequestResponse toResponse(LeaveRequest entity);

    /**
     * Normalize half-day period strings. The entity enum stores
     * {@code MORNING}/{@code AFTERNOON}. Legacy clients send
     * {@code FIRST_HALF}/{@code SECOND_HALF} (see DTO regex
     * accepting all four). MapStruct picks this up automatically
     * based on parameter/return types.
     */
    default HalfDayPeriod toHalfDayPeriod(String value) {
        if (value == null) {
            return null;
        }
        return switch (value.toUpperCase()) {
            case "FIRST_HALF" -> HalfDayPeriod.MORNING;
            case "SECOND_HALF" -> HalfDayPeriod.AFTERNOON;
            default -> HalfDayPeriod.valueOf(value.toUpperCase());
        };
    }

    /**
     * Enum → String for the response DTO. Null status surfaces as the legacy
     * sentinel {@code "UNKNOWN"} (matches the prior controller branch). MapStruct
     * picks this up automatically based on parameter/return types.
     */
    default String fromStatus(LeaveRequestStatus status) {
        return status == null ? "UNKNOWN" : status.name();
    }

    /**
     * Enum → String for the response DTO. Null stays null (matches the prior
     * controller branch which only set the field when non-null).
     */
    default String fromHalfDayPeriod(HalfDayPeriod period) {
        return period == null ? null : period.name();
    }
}
