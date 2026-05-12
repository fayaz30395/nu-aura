package com.nulogic.api.user.dto;

import com.nulogic.domain.user.ImplicitRoleCondition;
import com.nulogic.domain.user.RoleScope;
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
public class ImplicitRoleRuleResponse {
    private UUID id;
    private String ruleName;
    private String description;
    private ImplicitRoleCondition conditionType;
    private UUID targetRoleId;
    private String targetRoleName;
    private RoleScope scope;
    private Integer priority;
    private Boolean isActive;
    private long affectedUserCount;
    private Instant createdAt;
    private Instant updatedAt;
}
