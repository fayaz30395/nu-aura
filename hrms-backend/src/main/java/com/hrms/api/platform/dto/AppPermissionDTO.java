package com.hrms.api.platform.dto;

import com.hrms.domain.platform.AppPermission;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppPermissionDTO {
    private UUID id;
    private String code;
    private String module;
    private String action;
    private String name;
    private String description;
    private String category;
    private Boolean isSystemPermission;
    private Integer displayOrder;
    private String applicationCode;

    public static AppPermissionDTO fromEntity(AppPermission permission) {
        return AppPermissionDTO.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .module(permission.getModule())
                .action(permission.getAction())
                .name(permission.getName())
                .description(permission.getDescription())
                .category(permission.getCategory())
                .isSystemPermission(permission.getIsSystemPermission())
                .displayOrder(permission.getDisplayOrder())
                .applicationCode(permission.getApplication() != null ? permission.getApplication().getCode() : null)
                .build();
    }
}
