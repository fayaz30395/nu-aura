package com.hrms.api.selfservice.dto;

import com.hrms.domain.selfservice.ProfileUpdateRequest.UpdateCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileUpdateRequestDto {

    @NotNull(message = "Category is required")
    private UpdateCategory category;

    @NotBlank(message = "Field name is required")
    private String fieldName;

    private String currentValue;

    @NotBlank(message = "Requested value is required")
    private String requestedValue;

    private String reason;

    private String supportingDocumentUrl;
}
