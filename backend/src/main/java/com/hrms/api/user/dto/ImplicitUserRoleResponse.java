package com.hrms.api.user.dto;

import com.hrms.domain.user.RoleScope;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImplicitUserRoleResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private UUID roleId;
    private String roleName;
    private RoleScope scope;
    private String derivedFromContext;
    private Instant computedAt;
    private Boolean isActive;
}
