package com.hrms.application.performance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PIPCheckInResponse {

    private UUID id;
    private UUID pipId;
    private LocalDate checkInDate;
    private String progressNotes;
    private String managerComments;
    private String goalUpdates;
    private LocalDateTime createdAt;
}
