package com.nulogic.hrms.iam.dto;

import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PermissionGroupResponse {
    UUID id;
    String name;
    String description;
    List<UUID> permissionIds;
}
