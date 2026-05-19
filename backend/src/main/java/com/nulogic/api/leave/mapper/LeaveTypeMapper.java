package com.nulogic.api.leave.mapper;

import com.nulogic.api.leave.dto.LeaveTypeRequest;
import com.nulogic.api.leave.dto.LeaveTypeResponse;
import com.nulogic.domain.leave.LeaveType;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * T3-10 pilot — MapStruct-driven mapping between LeaveType DTOs and entity.
 *
 * Replaces the previous BeanUtils.copyProperties(..., ignoreFields) pattern in
 * {@link com.nulogic.api.leave.controller.LeaveTypeController}, which was a
 * known mass-assignment risk: any new entity field added later (audit, money,
 * tenant-scoped flag) was silently writable from the API unless someone
 * remembered to extend the string ignore-list. With
 * {@code unmappedTargetPolicy = ERROR}, the compiler now refuses to build
 * unless every target field is either explicitly mapped or explicitly ignored.
 *
 * Per-field ignore comments below document the *reason* each field is not
 * settable from the API — these mirror (and tighten) the original ignore-list.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LeaveTypeMapper {

    // ---- DTO → Entity (create) -------------------------------------------------

    @Mapping(target = "id", ignore = true)                  // not settable from API — assigned by JPA on persist
    @Mapping(target = "tenantId", ignore = true)            // not settable from API — populated by TenantEntityListener
    @Mapping(target = "createdAt", ignore = true)           // not settable from API — JPA auditing
    @Mapping(target = "updatedAt", ignore = true)           // not settable from API — JPA auditing
    @Mapping(target = "createdBy", ignore = true)           // not settable from API — JPA auditing
    @Mapping(target = "lastModifiedBy", ignore = true)      // not settable from API — JPA auditing (was 'updatedBy' in legacy ignore-list; that field never existed on the entity)
    @Mapping(target = "version", ignore = true)             // not settable from API — JPA @Version optimistic lock
    @Mapping(target = "isDeleted", ignore = true)           // not settable from API — soft-delete via softDelete()/restore()
    @Mapping(target = "deletedAt", ignore = true)           // not settable from API — set by softDelete()
    @Mapping(target = "accrualType", source = "accrualType")        // String → enum (default method below)
    @Mapping(target = "genderSpecific", source = "genderSpecific")  // String → enum (default method below)
    @Mapping(target = "maxEncashableDaysPerYear", ignore = true)    // F2.3 finance cap — admin-only via separate config flow, not user-settable on leave-type CRUD
    @Mapping(target = "maxEncashableAtExit", ignore = true)         // F2.3 finance cap — admin-only via separate config flow, not user-settable on leave-type CRUD
    LeaveType toEntity(LeaveTypeRequest request);

    // ---- DTO → Entity (update, in-place) --------------------------------------
    // Same ignore semantics as toEntity. NullValuePropertyMappingStrategy.IGNORE
    // means a null field in the request leaves the existing entity value alone
    // (partial-update-friendly; matches BeanUtils' previous behaviour because
    // primitives/wrappers were never overwritten when both were null).

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "accrualType", source = "accrualType")
    @Mapping(target = "genderSpecific", source = "genderSpecific")
    @Mapping(target = "maxEncashableDaysPerYear", ignore = true)
    @Mapping(target = "maxEncashableAtExit", ignore = true)
    void updateEntity(LeaveTypeRequest request, @MappingTarget LeaveType entity);

    // ---- Entity → Response DTO -------------------------------------------------

    @Mapping(target = "accrualType", source = "accrualType")        // enum → String (default method below)
    @Mapping(target = "genderSpecific", source = "genderSpecific")  // enum → String (default method below)
    LeaveTypeResponse toResponse(LeaveType entity);

    // ---- Enum <-> String helpers ----------------------------------------------
    // MapStruct picks these up automatically based on parameter/return types.

    default LeaveType.AccrualType toAccrualType(String value) {
        return value == null ? null : LeaveType.AccrualType.valueOf(value);
    }

    default String fromAccrualType(LeaveType.AccrualType value) {
        return value == null ? null : value.name();
    }

    default LeaveType.GenderSpecific toGenderSpecific(String value) {
        return value == null ? null : LeaveType.GenderSpecific.valueOf(value);
    }

    default String fromGenderSpecific(LeaveType.GenderSpecific value) {
        return value == null ? null : value.name();
    }
}
