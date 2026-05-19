package com.nulogic.api.common.mapping;

import org.mapstruct.MapperConfig;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * T3-10 — Shared MapStruct configuration for request-DTO → entity mappers.
 *
 * <p>This config exists to eliminate the recurring mass-assignment risk introduced
 * by hand-maintained ignore-lists (legacy: {@code BeanUtils.copyProperties(src, dst,
 * "id", "tenantId", ...)} or per-controller whitelist setters). With those patterns,
 * adding a new sensitive field to an entity is silently writable from the API until
 * a developer remembers to update every ignore-list. With MapStruct + this config,
 * adding a target field forces a <em>compile error</em> until someone explicitly
 * maps or ignores it.</p>
 *
 * <h3>What this config bakes in</h3>
 * <ul>
 *   <li>{@code componentModel = "spring"} — generated mappers are Spring beans
 *       and can be {@code @Autowired} or constructor-injected.</li>
 *   <li>{@code unmappedTargetPolicy = ERROR} — the <strong>whole point</strong>:
 *       a new entity field with no explicit mapping or {@code @Mapping(ignore=true)}
 *       breaks the build. This is the compile-time guard that replaces the silent
 *       ignore-list.</li>
 *   <li>{@code nullValuePropertyMappingStrategy = IGNORE} — partial-update friendly:
 *       a null in the request DTO leaves the existing entity value alone, matching
 *       {@code BeanUtils.copyProperties} legacy behaviour.</li>
 * </ul>
 *
 * <p>Note: source-property guarding is delegated to the narrow request-DTO design
 * (request DTOs expose only client-fillable fields). If a DTO ever exposes a
 * server-controlled name, MapStruct's default
 * {@code unmappedSourcePolicy = WARN} will surface it in the build log; individual
 * mappers can override with {@code unmappedSourcePolicy = ERROR} when paranoid.</p>
 *
 * <h3>How to use</h3>
 * <pre>{@code
 * @Mapper(config = ApiMapperConfig.class)
 * public interface PayrollRunMapper {
 *     @Mapping(target = "id",        ignore = true)
 *     @Mapping(target = "tenantId",  ignore = true)
 *     // ... explicitly ignore every server-controlled field
 *     PayrollRun toEntity(CreatePayrollRunRequest request);
 * }
 * }</pre>
 */
@MapperConfig(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.ERROR,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface ApiMapperConfig {
}
