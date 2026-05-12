package com.hrms.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class LoginRequest {

    private UUID tenantId;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    /**
     * reCAPTCHA v3 response token, populated by the browser widget after the
     * user solves a challenge. Optional — only required when the server
     * indicates {@code captcha-required} on a prior failed attempt (see
     * {@code AuthService.login} threshold logic). Blank / null on the first
     * three attempts is normal and accepted.
     */
    private String captchaToken;
}
