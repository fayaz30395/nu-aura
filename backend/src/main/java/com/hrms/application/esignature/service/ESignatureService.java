package com.hrms.application.esignature.service;

import com.hrms.api.esignature.dto.*;
import com.hrms.application.esignature.event.SignatureCompletedEvent;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.esignature.SignatureApproval;
import com.hrms.domain.esignature.SignatureRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.esignature.repository.SignatureApprovalRepository;
import com.hrms.infrastructure.esignature.repository.SignatureRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
    private final DataScopeService dataScopeService;
    private final ApplicationEventPublisher eventPublisher;

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
        // Apply scope-based filtering using DataScopeService
        Specification<SignatureRequest> scopeSpec = dataScopeService.getScopeSpecification(Permission.ESIGNATURE_VIEW);
        Specification<SignatureRequest> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<SignatureRequest> combinedSpec = Specification.where(tenantSpec).and(scopeSpec);

        return signatureRequestRepository.findAll(combinedSpec, pageable)
                .map(this::mapToSignatureRequestResponse);
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

        // For EXTERNAL signers (e.g., candidates), we don't require an employee record
        // They sign via email link with authentication token
        if (request.getSignerRole() != SignatureApproval.SignerRole.EXTERNAL) {
            // Verify signer exists for internal signers
            if (request.getSignerId() == null) {
                throw new IllegalArgumentException("Signer ID is required for internal signers");
            }
            employeeRepository.findById(request.getSignerId())
                    .orElseThrow(() -> new IllegalArgumentException("Signer employee not found"));
        } else {
            // For EXTERNAL signers, email is required
            if (request.getSignerEmail() == null || request.getSignerEmail().isBlank()) {
                throw new IllegalArgumentException("Signer email is required for external signers");
            }
        }

        SignatureApproval approval = new SignatureApproval();
        approval.setId(UUID.randomUUID());
        approval.setTenantId(tenantId);
        approval.setSignatureRequestId(requestId);
        approval.setSignerId(request.getSignerId()); // May be null for EXTERNAL signers
        approval.setSignerEmail(request.getSignerEmail());
        approval.setSignerRole(request.getSignerRole());
        approval.setSigningOrder(request.getSigningOrder());
        approval.setStatus(SignatureApproval.ApprovalStatus.PENDING);
        approval.setIsRequired(request.getIsRequired() != null ? request.getIsRequired() : true);
        approval.setComments(request.getComments());
        approval.setReminderCount(0);

        // Generate authentication token for external signers
        if (request.getSignerRole() == SignatureApproval.SignerRole.EXTERNAL) {
            approval.setAuthenticationToken(UUID.randomUUID().toString());
            approval.setTokenExpiresAt(LocalDateTime.now().plusDays(7)); // Token valid for 7 days
        }

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

        // Publish event for declined signature (e.g., offer letter declined by candidate)
        publishSignatureCompletedEvent(signatureRequest);

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

        SignatureRequest.SignatureStatus previousStatus = signatureRequest.getStatus();

        // Check if all required signatures are received
        if (signedCount >= signatureRequest.getRequiredSignatures()) {
            signatureRequest.setStatus(SignatureRequest.SignatureStatus.COMPLETED);
            signatureRequest.setCompletedAt(LocalDateTime.now());
        } else if (signedCount > 0) {
            signatureRequest.setStatus(SignatureRequest.SignatureStatus.IN_PROGRESS);
        }

        signatureRequestRepository.save(signatureRequest);

        // Publish event when signature request is completed
        if (signatureRequest.getStatus() == SignatureRequest.SignatureStatus.COMPLETED
                && previousStatus != SignatureRequest.SignatureStatus.COMPLETED) {
            publishSignatureCompletedEvent(signatureRequest);
        }
    }

    /**
     * Publishes a SignatureCompletedEvent for completed or declined signature requests.
     * This allows other services (e.g., recruitment) to react to offer letter signing outcomes.
     */
    private void publishSignatureCompletedEvent(SignatureRequest signatureRequest) {
        log.info("Publishing signature completed event for request {} with status {}",
                signatureRequest.getId(), signatureRequest.getStatus());

        SignatureCompletedEvent event = new SignatureCompletedEvent(
                this,
                signatureRequest.getId(),
                signatureRequest.getTenantId(),
                signatureRequest.getDocumentType(),
                signatureRequest.getStatus(),
                signatureRequest.getMetadata()
        );

        eventPublisher.publishEvent(event);
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

    // ==================== External (Token-Based) Signing Operations ====================

    /**
     * Get signature information for external signer by token.
     * This is a public endpoint that doesn't require authentication.
     */
    @Transactional(readOnly = true)
    public ExternalSignatureInfoResponse getExternalSignatureInfo(String token) {
        log.info("Getting external signature info for token");

        SignatureApproval approval = signatureApprovalRepository.findByAuthenticationToken(token)
                .orElse(null);

        if (approval == null) {
            return ExternalSignatureInfoResponse.builder()
                    .tokenValid(false)
                    .errorMessage("Invalid or expired signing link")
                    .build();
        }

        // Check token expiry
        if (approval.getTokenExpiresAt() != null && approval.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            return ExternalSignatureInfoResponse.builder()
                    .tokenValid(false)
                    .errorMessage("This signing link has expired. Please contact HR for a new link.")
                    .build();
        }

        // Check if already signed or declined
        if (approval.getStatus() == SignatureApproval.ApprovalStatus.SIGNED) {
            return ExternalSignatureInfoResponse.builder()
                    .approvalId(approval.getId())
                    .status(approval.getStatus())
                    .tokenValid(false)
                    .errorMessage("This document has already been signed.")
                    .build();
        }

        if (approval.getStatus() == SignatureApproval.ApprovalStatus.DECLINED) {
            return ExternalSignatureInfoResponse.builder()
                    .approvalId(approval.getId())
                    .status(approval.getStatus())
                    .tokenValid(false)
                    .errorMessage("This document has been declined.")
                    .build();
        }

        // Get signature request details
        SignatureRequest signatureRequest = signatureRequestRepository
                .findById(approval.getSignatureRequestId())
                .orElse(null);

        if (signatureRequest == null) {
            return ExternalSignatureInfoResponse.builder()
                    .tokenValid(false)
                    .errorMessage("Document not found")
                    .build();
        }

        // Mark as viewed
        if (approval.getViewedAt() == null) {
            approval.setViewedAt(LocalDateTime.now());
            approval.setStatus(SignatureApproval.ApprovalStatus.VIEWED);
            signatureApprovalRepository.save(approval);
        }

        return ExternalSignatureInfoResponse.builder()
                .approvalId(approval.getId())
                .documentTitle(signatureRequest.getTitle())
                .documentDescription(signatureRequest.getDescription())
                .documentType(signatureRequest.getDocumentType())
                .documentUrl(signatureRequest.getDocumentUrl())
                .documentName(signatureRequest.getDocumentName())
                .status(approval.getStatus())
                .signerEmail(approval.getSignerEmail())
                .tokenExpiresAt(approval.getTokenExpiresAt())
                .tokenValid(true)
                .build();
    }

    /**
     * Sign document using external token (for candidates/external parties).
     * Validates token and email before signing.
     */
    public SignatureApprovalResponse signDocumentExternal(String token, ExternalSignRequest request) {
        log.info("External signing with token for email: {}", request.getSignerEmail());

        SignatureApproval approval = signatureApprovalRepository.findByAuthenticationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired signing link"));

        // Validate token expiry
        if (approval.getTokenExpiresAt() != null && approval.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("This signing link has expired. Please contact HR for a new link.");
        }

        // Validate email matches
        if (!approval.getSignerEmail().equalsIgnoreCase(request.getSignerEmail())) {
            throw new IllegalArgumentException("Email does not match the signer email for this document");
        }

        // Check status
        if (approval.getStatus() == SignatureApproval.ApprovalStatus.SIGNED) {
            throw new IllegalStateException("Document already signed");
        }

        if (approval.getStatus() == SignatureApproval.ApprovalStatus.DECLINED) {
            throw new IllegalStateException("Cannot sign a declined document");
        }

        // Update approval with signature
        approval.setStatus(SignatureApproval.ApprovalStatus.SIGNED);
        approval.setSignedAt(LocalDateTime.now());
        approval.setSignatureMethod(request.getSignatureMethod() != null ?
                request.getSignatureMethod() : SignatureApproval.SignatureMethod.TYPED);
        approval.setSignatureData(request.getSignatureData());
        if (request.getComments() != null) {
            approval.setComments(request.getComments());
        }

        // Invalidate token after use
        approval.setAuthenticationToken(null);

        SignatureApproval updatedApproval = signatureApprovalRepository.save(approval);

        // Update signature request status
        updateSignatureRequestStatus(approval.getSignatureRequestId());

        log.info("External document signed successfully for approval {}", approval.getId());

        return mapToSignatureApprovalResponse(updatedApproval);
    }

    /**
     * Decline document using external token (for candidates/external parties).
     */
    public SignatureApprovalResponse declineDocumentExternal(String token, String signerEmail, String reason) {
        log.info("External decline with token for email: {}", signerEmail);

        SignatureApproval approval = signatureApprovalRepository.findByAuthenticationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired signing link"));

        // Validate token expiry
        if (approval.getTokenExpiresAt() != null && approval.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("This signing link has expired");
        }

        // Validate email matches
        if (!approval.getSignerEmail().equalsIgnoreCase(signerEmail)) {
            throw new IllegalArgumentException("Email does not match the signer email for this document");
        }

        if (approval.getStatus() == SignatureApproval.ApprovalStatus.SIGNED) {
            throw new IllegalStateException("Cannot decline an already signed document");
        }

        // Update approval
        approval.setStatus(SignatureApproval.ApprovalStatus.DECLINED);
        approval.setDeclinedAt(LocalDateTime.now());
        approval.setDeclineReason(reason);

        // Invalidate token
        approval.setAuthenticationToken(null);

        SignatureApproval updatedApproval = signatureApprovalRepository.save(approval);

        // Update signature request to DECLINED
        SignatureRequest signatureRequest = signatureRequestRepository
                .findById(approval.getSignatureRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Signature request not found"));

        signatureRequest.setStatus(SignatureRequest.SignatureStatus.DECLINED);
        signatureRequestRepository.save(signatureRequest);

        // Publish event
        publishSignatureCompletedEvent(signatureRequest);

        log.info("External document declined for approval {}", approval.getId());

        return mapToSignatureApprovalResponse(updatedApproval);
    }

    private SignatureApprovalResponse mapToSignatureApprovalResponse(SignatureApproval approval) {
        String signerName = null;
        if (approval.getSignerId() != null) {
            signerName = employeeRepository.findById(approval.getSignerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

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
