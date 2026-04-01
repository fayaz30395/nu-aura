package com.hrms.application.esignature.event;

import com.hrms.domain.esignature.SignatureRequest;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Event fired when a signature request is completed or declined.
 * Used to notify other services (e.g., recruitment) about offer letter signing outcomes.
 */
@Getter
public class SignatureCompletedEvent extends ApplicationEvent {

    private final UUID signatureRequestId;
    private final UUID tenantId;
    private final SignatureRequest.DocumentType documentType;
    private final SignatureRequest.SignatureStatus status;
    private final String metadata; // JSON containing candidateId, letterId, etc.

    public SignatureCompletedEvent(Object source, UUID signatureRequestId, UUID tenantId,
                                   SignatureRequest.DocumentType documentType,
                                   SignatureRequest.SignatureStatus status,
                                   String metadata) {
        super(source);
        this.signatureRequestId = signatureRequestId;
        this.tenantId = tenantId;
        this.documentType = documentType;
        this.status = status;
        this.metadata = metadata;
    }
}
