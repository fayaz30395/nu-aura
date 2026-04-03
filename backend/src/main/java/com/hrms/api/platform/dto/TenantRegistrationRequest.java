package com.hrms.api.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TenantRegistrationRequest {

    @NotBlank(message = "Company name is required")
    @Size(min = 2, max = 200, message = "Company name must be 2-200 characters")
    private String companyName;

    /**
     * URL-safe identifier, e.g. "acme-corp"
     */
    @NotBlank(message = "Company code is required")
    @Pattern(regexp = "^[a-z0-9-]{2,50}$",
            message = "Company code must be lowercase alphanumeric with hyphens (2-50 chars)")
    private String companyCode;

    @NotBlank(message = "Admin first name is required")
    private String adminFirstName;

    @NotBlank(message = "Admin last name is required")
    private String adminLastName;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid email address")
    private String adminEmail;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private String contactPhone;
    private String timezone;
}
