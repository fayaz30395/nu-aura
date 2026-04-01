package com.hrms.api.publicapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request DTO for accepting an offer via public portal.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicOfferAcceptRequest {

    @NotBlank(message = "Email is required for verification")
    @Email(message = "Invalid email format")
    private String email;

    private LocalDate confirmedJoiningDate;

    private String signatureData;
}
