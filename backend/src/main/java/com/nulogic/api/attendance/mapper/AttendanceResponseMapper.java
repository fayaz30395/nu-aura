package com.nulogic.api.attendance.mapper;

import com.nulogic.api.attendance.dto.AttendanceResponse;
import com.nulogic.domain.attendance.AttendanceRecord;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * T3-10 — MapStruct mapper for {@link AttendanceRecord} → {@link AttendanceResponse}.
 *
 * <p>Replaces {@code BeanUtils.copyProperties(record, response)} in
 * {@code AttendanceController#toResponse} (entity → response copy). With
 * {@code unmappedTargetPolicy = ERROR}, a new field on {@link AttendanceResponse}
 * now breaks the build until it is either explicitly mapped from the entity or
 * explicitly ignored here.</p>
 *
 * <p>The controller still applies its null-safe defaults post-mapping (boolean
 * flags default to {@code false}, minute counters default to {@code 0}). Status
 * is converted from the {@link AttendanceRecord.AttendanceStatus} enum to its
 * {@code .name()} string in the controller because the legacy contract surfaces
 * {@code "UNKNOWN"} when the entity field is null — that branch must not be
 * silently inverted by the mapper, so we ignore {@code status} here and let the
 * controller set it explicitly.</p>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface AttendanceResponseMapper {

    // ---- Entity → Response DTO -----------------------------------------------
    // Status is set by the controller (enum → name() with "UNKNOWN" fallback for
    // legacy/imported records that have a null status). Ignoring here keeps the
    // existing behaviour intact.
    @Mapping(target = "status", ignore = true)
    AttendanceResponse toResponse(AttendanceRecord record);
}
