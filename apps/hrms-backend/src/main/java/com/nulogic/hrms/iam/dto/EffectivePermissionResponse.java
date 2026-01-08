package com.nulogic.hrms.iam.dto;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EffectivePermissionResponse {
    String module;
    String action;
    List<String> scopes;
    String highestScope;
}
