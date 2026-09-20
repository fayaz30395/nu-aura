package com.nulogic.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for document expiry tracking response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentExpiryDto {

    private UUID id;
    private UUID documentId;
    private LocalDate expiryDate;
    private Integer reminderDaysBefore;
    private Boolean isNotified;
    private LocalDateTime notifiedAt;
}
