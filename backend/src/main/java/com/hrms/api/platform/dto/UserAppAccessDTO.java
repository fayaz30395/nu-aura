package com.hrms.api.platform.dto;

import com.hrms.domain.platform.UserAppAccess;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAppAccessDTO {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String userName;
    private String applicationCode;
    private String applicationName;
    private String status;
    private LocalDateTime grantedAt;
    private UUID grantedBy;
    private Set<String> roleCodes;
    private Set<String> permissions;

    public static UserAppAccessDTO fromEntity(UserAppAccess access) {
        return UserAppAccessDTO.builder()
                .id(access.getId())
                .userId(access.getUser().getId())
                .userEmail(access.getUser().getEmail())
                .userName(access.getUser().getFullName())
                .applicationCode(access.getApplication().getCode())
                .applicationName(access.getApplication().getName())
                .status(access.getStatus().name())
                .grantedAt(access.getGrantedAt())
                .grantedBy(access.getGrantedBy())
                .roleCodes(access.getRoleCodes())
                .permissions(access.getAllPermissions())
                .build();
    }
}
