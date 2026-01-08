package com.nulogic.hrms.iam.dto;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PermissionMatrixResponse {
    List<RoleSummaryResponse> roles;
    List<PermissionResponse> permissions;
    List<RolePermissionAssignment> assignments;
}
