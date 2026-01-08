package com.nulogic.hrms.org.dto;

import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OrgUnitResponse {
    UUID id;
    String name;
    boolean active;
}
