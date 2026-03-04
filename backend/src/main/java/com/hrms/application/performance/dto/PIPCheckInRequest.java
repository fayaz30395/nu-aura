package com.hrms.application.performance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PIPCheckInRequest {

    @NotNull
    private LocalDate checkInDate;

    private String progressNotes;

    private String managerComments;

    private String goalUpdates; // JSON string
}
