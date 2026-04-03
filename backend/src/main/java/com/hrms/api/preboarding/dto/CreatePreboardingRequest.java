package com.hrms.api.preboarding.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreatePreboardingRequest {
    @NotBlank
    private String firstName;

    private String lastName;

    @NotBlank
    @Email
    private String email;

    @NotNull
    private LocalDate expectedJoiningDate;

    private String designation;
    private UUID departmentId;
    private UUID reportingManagerId;
}
