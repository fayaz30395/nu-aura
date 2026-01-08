package com.nulogic.hrms.iam.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RoleSummaryResponse {
    UUID id;
    String name;
    String description;
    boolean system;
}
