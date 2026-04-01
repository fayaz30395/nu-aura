package com.hrms.api.platform.dto;

import com.hrms.domain.platform.NuApplication;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDTO {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private String iconUrl;
    private String baseUrl;
    private String apiBasePath;
    private String status;
    private Integer displayOrder;
    private Boolean isSystemApp;
    private String appVersion;
    private Integer permissionCount;

    public static ApplicationDTO fromEntity(NuApplication app) {
        return ApplicationDTO.builder()
                .id(app.getId())
                .code(app.getCode())
                .name(app.getName())
                .description(app.getDescription())
                .iconUrl(app.getIconUrl())
                .baseUrl(app.getBaseUrl())
                .apiBasePath(app.getApiBasePath())
                .status(app.getStatus().name())
                .displayOrder(app.getDisplayOrder())
                .isSystemApp(app.getIsSystemApp())
                .appVersion(app.getAppVersion())
                .permissionCount(app.getPermissions() != null ? app.getPermissions().size() : 0)
                .build();
    }
}
