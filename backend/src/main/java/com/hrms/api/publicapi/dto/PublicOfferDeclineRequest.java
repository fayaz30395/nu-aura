package com.hrms.api.publicapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for declining an offer via public portal.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicOfferDeclineRequest {

    @NotBlank(message = "Email is required for verification")
    @Email(message = "Invalid email format")
    private String email;

    private String declineReason;
}
