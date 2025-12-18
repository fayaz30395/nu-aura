package com.hrms.api.selfservice.dto;

import com.hrms.domain.selfservice.DocumentRequest.DeliveryMode;
import com.hrms.domain.selfservice.DocumentRequest.DocumentType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentRequestDto {

    @NotNull(message = "Document type is required")
    private DocumentType documentType;

    private String purpose;

    private String addressedTo;

    private LocalDate requiredByDate;

    @Builder.Default
    private DeliveryMode deliveryMode = DeliveryMode.DIGITAL;

    private String deliveryAddress;

    @Builder.Default
    private Integer priority = 2;
}
