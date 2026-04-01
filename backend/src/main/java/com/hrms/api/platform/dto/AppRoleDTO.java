package com.hrms.api.platform.dto;

import com.hrms.domain.platform.AppRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppRoleDTO {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private Integer level;
    private Boolean isSystemRole;
    private Boolean isDefaultRole;
    private String applicationCode;
    private Set<String> permissionCodes;
    private Integer permissionCount;

    public static AppRoleDTO fromEntity(AppRole role) {
        return AppRoleDTO.builder()
                .id(role.getId())
                .code(role.getCode())
                .name(role.getName())
                .description(role.getDescription())
                .level(role.getLevel())
                .isSystemRole(role.getIsSystemRole())
                .isDefaultRole(role.getIsDefaultRole())
                .applicationCode(role.getApplication() != null ? role.getApplication().getCode() : null)
                .permissionCodes(role.getPermissions().stream()
                        .map(p -> p.getCode())
                        .collect(Collectors.toSet()))
                .permissionCount(role.getPermissions().size())
                .build();
    }
}
