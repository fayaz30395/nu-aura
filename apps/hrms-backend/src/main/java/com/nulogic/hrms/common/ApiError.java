package com.nulogic.hrms.common;

import java.time.OffsetDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ApiError {
    String message;
    String code;
    List<String> details;
    OffsetDateTime timestamp;
}
