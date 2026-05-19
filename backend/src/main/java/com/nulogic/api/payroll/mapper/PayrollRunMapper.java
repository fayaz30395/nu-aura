package com.nulogic.api.payroll.mapper;

import com.nulogic.api.common.mapping.ApiMapperConfig;
import com.nulogic.api.payroll.dto.CreatePayrollRunRequest;
import com.nulogic.domain.payroll.PayrollRun;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * T3-10 — MapStruct mapper for {@link CreatePayrollRunRequest} → {@link PayrollRun}.
 *
 * <p>Replaces the hand-maintained whitelist-setter block in
 * {@code PayrollController#createPayrollRun} (formerly mass-assignment risk R-1.10).
 * The shared {@link ApiMapperConfig} forces {@code unmappedTargetPolicy = ERROR},
 * so adding any new field to {@link PayrollRun} <strong>breaks the build</strong>
 * until it is either explicitly mapped or explicitly ignored here.</p>
 *
 * <p>Every server-controlled field is explicitly ignored with a comment naming the
 * <em>reason</em> it cannot be client-bound. This documents the threat model in code.</p>
 */
@Mapper(config = ApiMapperConfig.class)
public interface PayrollRunMapper {

    // Server-owned identity / audit fields — never settable from the API.
    @Mapping(target = "id", ignore = true)                  // JPA-generated UUID
    @Mapping(target = "tenantId", ignore = true)            // TenantEntityListener populates from SecurityContext
    @Mapping(target = "createdAt", ignore = true)           // JPA auditing
    @Mapping(target = "updatedAt", ignore = true)           // JPA auditing
    @Mapping(target = "createdBy", ignore = true)           // JPA auditing
    @Mapping(target = "lastModifiedBy", ignore = true)      // JPA auditing
    @Mapping(target = "version", ignore = true)             // JPA @Version optimistic lock
    @Mapping(target = "isDeleted", ignore = true)           // soft-delete flag (via softDelete())
    @Mapping(target = "deletedAt", ignore = true)           // soft-delete timestamp

    // Domain state — server-controlled.
    @Mapping(target = "status", ignore = true)              // defaults to DRAFT in the entity; only domain methods transition
    @Mapping(target = "totalEmployees", ignore = true)      // computed by payroll processing
    @Mapping(target = "processedBy", ignore = true)         // set by markProcessing() / process()
    @Mapping(target = "processedAt", ignore = true)         // set by process()
    @Mapping(target = "approvedBy", ignore = true)          // set by approve()
    @Mapping(target = "approvedAt", ignore = true)          // set by approve()
    PayrollRun toEntity(CreatePayrollRunRequest request);
}
