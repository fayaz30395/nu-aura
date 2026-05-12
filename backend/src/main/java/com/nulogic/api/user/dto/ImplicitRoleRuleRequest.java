package com.nulogic.api.user.dto;

import com.nulogic.domain.user.ImplicitRoleCondition;
import com.nulogic.domain.user.RoleScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImplicitRoleRuleRequest {
    @NotBlank(message = "Rule name is required")
    private String ruleName;

    private String description;

    @NotNull(message = "Condition type is required")
    private ImplicitRoleCondition conditionType;

    @NotNull(message = "Target role ID is required")
    private UUID targetRoleId;

    private RoleScope scope = RoleScope.TEAM;

    private Integer priority = 0;
}
