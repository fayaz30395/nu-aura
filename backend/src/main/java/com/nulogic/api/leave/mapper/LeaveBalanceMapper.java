package com.nulogic.api.leave.mapper;

import com.nulogic.api.leave.dto.LeaveBalanceResponse;
import com.nulogic.domain.leave.LeaveBalance;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * T3-10 — MapStruct mapper for {@link LeaveBalance} → {@link LeaveBalanceResponse}.
 *
 * <p>Replaces {@code BeanUtils.copyProperties(balance, response, "tenantId",
 * "createdAt", "updatedAt", "createdBy", "updatedBy", "version")} in
 * {@code LeaveBalanceController#toResponse}. The previous ignore-list was a
 * known mass-assignment / info-leak risk: any new sensitive field on
 * {@link LeaveBalance} would be silently copied into the response unless
 * someone remembered to extend the string list. With
 * {@code unmappedTargetPolicy = ERROR}, the compiler now refuses to build
 * unless every target field is either explicitly mapped or explicitly ignored.</p>
 *
 * <p>{@code leaveTypeName} is enriched by the controller from the
 * {@code LeaveTypeRepository} lookup — the mapper intentionally leaves it null.</p>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LeaveBalanceMapper {

    // ---- Entity → Response DTO -----------------------------------------------
    // leaveTypeName is enriched by the controller from a separate repository
    // lookup (cannot be derived from LeaveBalance alone). Leave it null here.
    @Mapping(target = "leaveTypeName", ignore = true)
    LeaveBalanceResponse toResponse(LeaveBalance balance);
}
