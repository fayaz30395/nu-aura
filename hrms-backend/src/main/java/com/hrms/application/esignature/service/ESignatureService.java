package com.hrms.application.esignature.service;

import com.hrms.api.esignature.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.esignature.SignatureApproval;
import com.hrms.domain.esignature.SignatureRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.esignature.repository.SignatureApprovalRepository;
import com.hrms.infrastructure.esignature.repository.SignatureRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ESignatureService {

    private final SignatureRequestRepository signatureRequestRepository;
    private final SignatureApprovalRepository signatureApprovalRepository;
    private final EmployeeRepository employeeRepository;

    // ==================== Signature Request Operations ====================

    public SignatureRequestResponse createSignatureRequest(SignatureRequestRequest request, UUID createdBy) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating signature request '{}' by user {}", request.getTitle(), createdBy);

        // Verify creator exists
        employeeRepository.findById(createdBy)
                .orElseThrow(() -> new IllegalArgumentException("Creator employee not found"));

        SignatureRequest signatureRequest = new SignatureRequest();
        signatureRequest.setId(UUID.randomUUID());
        signatureRequest.setTenantId(tenantId);
        signatureRequest.setTitle(request.getTitle());
        signatureRequest.setDescription(request.getDescription());
        signatureRequest.setDocumentType(request.getDocumentType());
        signatureRequest.setDocumentUrl(request.getDocumentUrl());
        signatureRequest.setDocumentName(request.getDocumentName());
        signatureRequest.setDocumentSize(request.getDocumentSize());
        signatureRequest.setMimeType(request.getMimeType());
        signatureRequest.setCreatedBy(createdBy);
        signatureRequest.setStatus(SignatureRequest.SignatureStatus.DRAFT);
        signatureRequest.setSignatureOrder(request.getSignatureOrder() != null ? request.getSignatureOrder() : false);
        signatureRequest.setExpiresAt(request.getExpiresAt());
        signatureRequest.setReminderFrequencyDays(request.getReminderFrequencyDays());
        signatureRequest.setIsTemplate(request.getIsTemplate() != null ? request.getIsTemplate() : false);
        signatureRequest.setTemplateName(request.getTemplateName());
        signatureRequest.setMetadata(request.getMetadata());
        signatureRequest.setRequiredSignatures(0);
        signatureRequest.setReceivedSignatures(0);

        SignatureRequest savedRequest = signatureRequestRepository.save(signatureRequest);

        // Create signature approvals for signers
        if (request.getSigners() != null && !request.getSigners().isEmpty()) {
            for (SignatureApprovalRequest signerRequest : request.getSigners()) {
                createSignatureApproval(savedRequest.getId(), signerRequest);
            }

            // Update required signatures count
            long requiredCount = request.getSigners().stream()
                    .filter(s -> s.getIsRequired() == null || s.getIsRequired())
                    .count();
            savedRequest.setRequiredSignatures((int) requiredCount);
            signatureRequestRepository.save(savedRequest);
        }

        return mapToSignatureRequestResponse(savedRequest);
    }

    public SignatureRequestResponse updateSignatureRequest(UUID requestId, SignatureRequestRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating signature request {}", requestId);

        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        // Only allow updates if in DRAFT status
        if (signatureRequest.getStatus() != SignatureRequest.SignatureStatus.DRAFT) {
            throw new IllegalStateException("Only draft signature requests can be updated");
        }

        signatureRequest.setTitle(request.getTitle());
        signatureRequest.setDescription(request.getDescription());
        signatureRequest.setDocumentType(request.getDocumentType());
        signatureRequest.setDocumentUrl(request.getDocumentUrl());
        signatureRequest.setDocumentName(request.getDocumentName());
        signatureRequest.setDocumentSize(request.getDocumentSize());
        signatureRequest.setMimeType(request.getMimeType());
        signatureRequest.setExpiresAt(request.getExpiresAt());
        signatureRequest.setReminderFrequencyDays(request.getReminderFrequencyDays());
        signatureRequest.setMetadata(request.getMetadata());

        SignatureRequest updatedRequest = signatureRequestRepository.save(signatureRequest);
        return mapToSignatureRequestResponse(updatedRequest);
    }

    public SignatureRequestResponse sendForSignature(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Sending signature request {} for signing", requestId);

        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        if (signatureRequest.getStatus() != SignatureRequest.SignatureStatus.DRAFT) {
            throw new IllegalStateException("Only draft signature requests can be sent");
        }

        // Verify at least one signer exists
        List<SignatureApproval> approvals = signatureApprovalRepository
                .findByTenantIdAndSignatureRequestId(tenantId, requestId);
        if (approvals.isEmpty()) {
            throw new IllegalStateException("At least one signer is required");
        }

        signatureRequest.setStatus(SignatureRequest.SignatureStatus.PENDING);

        // Update approval statuses to SENT
        LocalDateTime now = LocalDateTime.now();
        for (SignatureApproval approval : approvals) {
            approval.setStatus(SignatureApproval.ApprovalStatus.SENT);
            approval.setSentAt(now);
            signatureApprovalRepository.save(approval);
        }

        SignatureRequest updatedRequest = signatureRequestRepository.save(signatureRequest);
        return mapToSignatureRequestResponse(updatedRequest);
    }

    public SignatureRequestResponse cancelSignatureRequest(UUID requestId, UUID cancelledBy, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Cancelling signature request {} by user {}", requestId, cancelledBy);

        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        if (signatureRequest.getStatus() == SignatureRequest.SignatureStatus.COMPLETED ||
                signatureRequest.getStatus() == SignatureRequest.SignatureStatus.CANCELLED) {
            throw new IllegalStateException("Cannot cancel " + signatureRequest.getStatus() + " signature request");
        }

        signatureRequest.setStatus(SignatureRequest.SignatureStatus.CANCELLED);
        signatureRequest.setCancelledAt(LocalDateTime.now());
        signatureRequest.setCancelledBy(cancelledBy);
        signatureRequest.setCancellationReason(reason);

        SignatureRequest updatedRequest = signatureRequestRepository.save(signatureRequest);
        return mapToSignatureRequestResponse(updatedRequest);
    }

    @Transactional(readOnly = true)
    public SignatureRequestResponse getSignatureRequestById(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));
        return mapToSignatureRequestResponse(signatureRequest);
    }

    @Transactional(readOnly = true)
    public Page<SignatureRequestResponse> getAllSignatureRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return signatureRequestRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToSignatureRequestResponse);
    }

    @Transactional(readOnly = true)
    public List<SignatureRequestResponse> getSignatureRequestsByCreator(UUID creatorId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return signatureRequestRepository.findByTenantIdAndCreatedByOrderByCreatedAtDesc(tenantId, creatorId).stream()
                .map(this::mapToSignatureRequestResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SignatureRequestResponse> getSignatureRequestsByStatus(SignatureRequest.SignatureStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return signatureRequestRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToSignatureRequestResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SignatureRequestResponse> getTemplates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return signatureRequestRepository.findByTenantIdAndIsTemplate(tenantId, true).stream()
                .map(this::mapToSignatureRequestResponse)
                .collect(Collectors.toList());
    }

    public void deleteSignatureRequest(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        // Only allow deletion if in DRAFT status
        if (signatureRequest.getStatus() != SignatureRequest.SignatureStatus.DRAFT) {
            throw new IllegalStateException("Only draft signature requests can be deleted");
        }

        signatureRequestRepository.delete(signatureRequest);
    }

    // ==================== Signature Approval Operations ====================

    private SignatureApproval createSignatureApproval(UUID requestId, SignatureApprovalRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Verify signer exists
        employeeRepository.findById(request.getSignerId())
                .orElseThrow(() -> new IllegalArgumentException("Signer employee not found"));

        SignatureApproval approval = new SignatureApproval();
        approval.setId(UUID.randomUUID());
        approval.setTenantId(tenantId);
        approval.setSignatureRequestId(requestId);
        approval.setSignerId(request.getSignerId());
        approval.setSignerEmail(request.getSignerEmail());
        approval.setSignerRole(request.getSignerRole());
        approval.setSigningOrder(request.getSigningOrder());
        approval.setStatus(SignatureApproval.ApprovalStatus.PENDING);
        approval.setIsRequired(request.getIsRequired() != null ? request.getIsRequired() : true);
        approval.setComments(request.getComments());
        approval.setReminderCount(0);

        return signatureApprovalRepository.save(approval);
    }

    public SignatureApprovalResponse addSigner(UUID requestId, SignatureApprovalRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Adding signer {} to signature request {}", request.getSignerId(), requestId);

        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        // Only allow adding signers if in DRAFT status
        if (signatureRequest.getStatus() != SignatureRequest.SignatureStatus.DRAFT) {
            throw new IllegalStateException("Can only add signers to draft signature requests");
        }

        SignatureApproval approval = createSignatureApproval(requestId, request);

        // Update required signatures count
        if (approval.getIsRequired()) {
            signatureRequest.setRequiredSignatures(signatureRequest.getRequiredSignatures() + 1);
            signatureRequestRepository.save(signatureRequest);
        }

        return mapToSignatureApprovalResponse(approval);
    }

    public SignatureApprovalResponse signDocument(UUID approvalId, SignDocumentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Signing document for approval {}", approvalId);

        SignatureApproval approval = signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature approval not found"));

        if (approval.getStatus() == SignatureApproval.ApprovalStatus.SIGNED) {
            throw new IllegalStateException("Document already signed");
        }

        if (approval.getStatus() == SignatureApproval.ApprovalStatus.DECLINED) {
            throw new IllegalStateException("Cannot sign a declined document");
        }

        // Check sequential signing order
        SignatureRequest signatureRequest = signatureRequestRepository
                .findByIdAndTenantId(approval.getSignatureRequestId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        if (signatureRequest.getSignatureOrder() && approval.getSigningOrder() != null) {
            // Verify all previous orders are signed
            List<SignatureApproval> previousApprovals = signatureApprovalRepository
                    .findByTenantIdAndSignatureRequestIdOrderBySigningOrderAsc(tenantId, approval.getSignatureRequestId());

            for (SignatureApproval prev : previousApprovals) {
                if (prev.getSigningOrder() != null &&
                    prev.getSigningOrder() < approval.getSigningOrder() &&
                    prev.getStatus() != SignatureApproval.ApprovalStatus.SIGNED) {
                    throw new IllegalStateException("Previous signers must sign first (sequential signing enabled)");
                }
            }
        }

        // Update approval
        approval.setStatus(SignatureApproval.ApprovalStatus.SIGNED);
        approval.setSignedAt(LocalDateTime.now());
        approval.setSignatureMethod(request.getSignatureMethod());
        approval.setSignatureData(request.getSignatureData());
        approval.setSignatureIp(request.getSignatureIp());
        approval.setSignatureDevice(request.getSignatureDevice());
        if (request.getComments() != null) {
            approval.setComments(request.getComments());
        }

        SignatureApproval updatedApproval = signatureApprovalRepository.save(approval);

        // Update signature request status
        updateSignatureRequestStatus(approval.getSignatureRequestId());

        return mapToSignatureApprovalResponse(updatedApproval);
    }

    public SignatureApprovalResponse declineDocument(UUID approvalId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Declining document for approval {}", approvalId);

        SignatureApproval approval = signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature approval not found"));

        if (approval.getStatus() == SignatureApproval.ApprovalStatus.SIGNED) {
            throw new IllegalStateException("Cannot decline an already signed document");
        }

        approval.setStatus(SignatureApproval.ApprovalStatus.DECLINED);
        approval.setDeclinedAt(LocalDateTime.now());
        approval.setDeclineReason(reason);

        SignatureApproval updatedApproval = signatureApprovalRepository.save(approval);

        // Update signature request to DECLINED
        SignatureRequest signatureRequest = signatureRequestRepository
                .findByIdAndTenantId(approval.getSignatureRequestId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        signatureRequest.setStatus(SignatureRequest.SignatureStatus.DECLINED);
        signatureRequestRepository.save(signatureRequest);

        return mapToSignatureApprovalResponse(updatedApproval);
    }

    @Transactional(readOnly = true)
    public List<SignatureApprovalResponse> getApprovalsByRequest(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return signatureApprovalRepository.findByTenantIdAndSignatureRequestIdOrderBySigningOrderAsc(tenantId, requestId).stream()
                .map(this::mapToSignatureApprovalResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SignatureApprovalResponse> getPendingApprovalsBySigner(UUID signerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return signatureApprovalRepository.findByTenantIdAndSignerIdAndStatus(
                tenantId, signerId, SignatureApproval.ApprovalStatus.SENT).stream()
                .map(this::mapToSignatureApprovalResponse)
                .collect(Collectors.toList());
    }

    public void removeSigner(UUID approvalId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SignatureApproval approval = signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature approval not found"));

        SignatureRequest signatureRequest = signatureRequestRepository
                .findByIdAndTenantId(approval.getSignatureRequestId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        // Only allow removal if in DRAFT status
        if (signatureRequest.getStatus() != SignatureRequest.SignatureStatus.DRAFT) {
            throw new IllegalStateException("Can only remove signers from draft signature requests");
        }

        signatureApprovalRepository.delete(approval);

        // Update required signatures count
        if (approval.getIsRequired()) {
            signatureRequest.setRequiredSignatures(Math.max(0, signatureRequest.getRequiredSignatures() - 1));
            signatureRequestRepository.save(signatureRequest);
        }
    }

    // ==================== Helper Methods ====================

    private void updateSignatureRequestStatus(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        SignatureRequest signatureRequest = signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        long signedCount = signatureApprovalRepository.countByTenantIdAndSignatureRequestIdAndStatus(
                tenantId, requestId, SignatureApproval.ApprovalStatus.SIGNED);

        signatureRequest.setReceivedSignatures((int) signedCount);

        // Check if all required signatures are received
        if (signedCount >= signatureRequest.getRequiredSignatures()) {
            signatureRequest.setStatus(SignatureRequest.SignatureStatus.COMPLETED);
            signatureRequest.setCompletedAt(LocalDateTime.now());
        } else if (signedCount > 0) {
            signatureRequest.setStatus(SignatureRequest.SignatureStatus.IN_PROGRESS);
        }

        signatureRequestRepository.save(signatureRequest);
    }

    private SignatureRequestResponse mapToSignatureRequestResponse(SignatureRequest request) {
        String createdByName = employeeRepository.findById(request.getCreatedBy())
                .map(Employee::getFullName)
                .orElse(null);

        String cancelledByName = null;
        if (request.getCancelledBy() != null) {
            cancelledByName = employeeRepository.findById(request.getCancelledBy())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        List<SignatureApprovalResponse> approvals = signatureApprovalRepository
                .findByTenantIdAndSignatureRequestIdOrderBySigningOrderAsc(
                        request.getTenantId(), request.getId())
                .stream()
                .map(this::mapToSignatureApprovalResponse)
                .collect(Collectors.toList());

        return SignatureRequestResponse.builder()
                .id(request.getId())
                .tenantId(request.getTenantId())
                .title(request.getTitle())
                .description(request.getDescription())
                .documentType(request.getDocumentType())
                .documentUrl(request.getDocumentUrl())
                .documentName(request.getDocumentName())
                .documentSize(request.getDocumentSize())
                .mimeType(request.getMimeType())
                .createdBy(request.getCreatedBy())
                .createdByName(createdByName)
                .status(request.getStatus())
                .requiredSignatures(request.getRequiredSignatures())
                .receivedSignatures(request.getReceivedSignatures())
                .signatureOrder(request.getSignatureOrder())
                .expiresAt(request.getExpiresAt())
                .completedAt(request.getCompletedAt())
                .cancelledAt(request.getCancelledAt())
                .cancelledBy(request.getCancelledBy())
                .cancelledByName(cancelledByName)
                .cancellationReason(request.getCancellationReason())
                .reminderFrequencyDays(request.getReminderFrequencyDays())
                .lastReminderSentAt(request.getLastReminderSentAt())
                .isTemplate(request.getIsTemplate())
                .templateName(request.getTemplateName())
                .metadata(request.getMetadata())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .approvals(approvals)
                .build();
    }

    private SignatureApprovalResponse mapToSignatureApprovalResponse(SignatureApproval approval) {
        String signerName = employeeRepository.findById(approval.getSignerId())
                .map(Employee::getFullName)
                .orElse(null);

        return SignatureApprovalResponse.builder()
                .id(approval.getId())
                .tenantId(approval.getTenantId())
                .signatureRequestId(approval.getSignatureRequestId())
                .signerId(approval.getSignerId())
                .signerName(signerName)
                .signerEmail(approval.getSignerEmail())
                .signerRole(approval.getSignerRole())
                .signingOrder(approval.getSigningOrder())
                .status(approval.getStatus())
                .isRequired(approval.getIsRequired())
                .signedAt(approval.getSignedAt())
                .signatureIp(approval.getSignatureIp())
                .signatureDevice(approval.getSignatureDevice())
                .signatureMethod(approval.getSignatureMethod())
                .declinedAt(approval.getDeclinedAt())
                .declineReason(approval.getDeclineReason())
                .sentAt(approval.getSentAt())
                .viewedAt(approval.getViewedAt())
                .reminderCount(approval.getReminderCount())
                .lastRemindedAt(approval.getLastRemindedAt())
                .comments(approval.getComments())
                .createdAt(approval.getCreatedAt())
                .updatedAt(approval.getUpdatedAt())
                .build();
    }
}
