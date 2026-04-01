package com.hrms.domain.esignature;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "signature_approvals", indexes = {
        @Index(name = "idx_sig_appr_tenant", columnList = "tenant_id"),
        @Index(name = "idx_sig_appr_request", columnList = "tenant_id,signature_request_id"),
        @Index(name = "idx_sig_appr_signer", columnList = "tenant_id,signer_id"),
        @Index(name = "idx_sig_appr_status", columnList = "tenant_id,status"),
        @Index(name = "idx_sig_appr_order", columnList = "signature_request_id,signing_order")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignatureApproval {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "signature_request_id", nullable = false)
    private UUID signatureRequestId;

    @Column(name = "signer_id") // Nullable for EXTERNAL signers (candidates)
    private UUID signerId; // Employee ID - null for external signers

    @Column(name = "signer_email", nullable = false, length = 255)
    private String signerEmail;

    @Column(name = "signer_role", length = 100)
    @Enumerated(EnumType.STRING)
    private SignerRole signerRole;

    @Column(name = "signing_order")
    private Integer signingOrder; // For sequential signing

    @Column(name = "status", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    @Column(name = "is_required")
    private Boolean isRequired; // If false, signature is optional

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "signature_ip", length = 45)
    private String signatureIp;

    @Column(name = "signature_device", length = 255)
    private String signatureDevice;

    @Column(name = "signature_method", length = 50)
    @Enumerated(EnumType.STRING)
    private SignatureMethod signatureMethod;

    @Column(name = "signature_data", columnDefinition = "TEXT")
    private String signatureData; // Base64 encoded signature image or certificate data

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @Column(name = "decline_reason", columnDefinition = "TEXT")
    private String declineReason;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "reminder_count")
    private Integer reminderCount;

    @Column(name = "last_reminded_at")
    private LocalDateTime lastRemindedAt;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "authentication_token", length = 500)
    private String authenticationToken; // For email-based signature links

    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SignerRole {
        EMPLOYEE,
        HR,
        MANAGER,
        DIRECTOR,
        CEO,
        LEGAL,
        FINANCE,
        WITNESS,
        EXTERNAL
    }

    public enum ApprovalStatus {
        PENDING,      // Awaiting signature
        SENT,         // Email sent to signer
        VIEWED,       // Document viewed by signer
        SIGNED,       // Signature completed
        DECLINED,     // Signer declined to sign
        EXPIRED       // Signature deadline passed
    }

    public enum SignatureMethod {
        TYPED,           // Typed name
        DRAWN,           // Hand-drawn signature
        UPLOADED,        // Uploaded signature image
        DIGITAL_CERT,    // Digital certificate
        BIOMETRIC,       // Biometric signature
        OTP,             // OTP-based verification
        AADHAAR_ESIGN   // Aadhaar-based e-sign (India)
    }
}
