package com.nulogic.hrms.iam.dto;

import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UserSummaryResponse {
    UUID id;
    String email;
    String fullName;
    String status;
    List<RoleSummaryResponse> roles;
}
