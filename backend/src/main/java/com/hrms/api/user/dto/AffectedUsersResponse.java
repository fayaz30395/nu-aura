package com.hrms.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AffectedUsersResponse {
    private UUID ruleId;
    private String ruleName;
    private long affectedUserCount;
    private List<ImplicitUserRoleResponse> affectedUsers;
}
