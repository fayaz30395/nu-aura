package com.nulogic.api.project.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ReallocateRequest {

    private int allocationPercentage;
    private LocalDate startDate;
    private LocalDate endDate;
    private String role;
}
