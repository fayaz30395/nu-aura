package com.nulogic.hrms.iam.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PermissionResponse {
    UUID id;
    String module;
    String action;
    String scope;
}
