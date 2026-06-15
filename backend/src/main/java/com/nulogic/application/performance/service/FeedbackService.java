package com.nulogic.application.performance.service;

import com.nulogic.application.performance.dto.FeedbackRequest;
import com.nulogic.application.performance.dto.FeedbackResponse;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.performance.Feedback;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.FeedbackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FeedbackService {

    private static final String FEEDBACK_NOT_FOUND = "Feedback not found";

    private final FeedbackRepository feedbackRepository;
    private final EmployeeRepository employeeRepository;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           EmployeeRepository employeeRepository) {
        this.feedbackRepository = feedbackRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public FeedbackResponse giveFeedback(FeedbackRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // IDOR fix: validate employee IDs belong to the current tenant before linking.
        if (request.getRecipientId() != null) {
            employeeRepository.findByIdAndTenantId(request.getRecipientId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Recipient employee not found"));
        }
        if (request.getGiverId() != null) {
            employeeRepository.findByIdAndTenantId(request.getGiverId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Giver employee not found"));
        }

        Feedback feedback = Feedback.builder()
                .recipientId(request.getRecipientId())
                .giverId(request.getGiverId())
                .feedbackType(request.getFeedbackType())
                .category(request.getCategory())
                .feedbackText(request.getFeedbackText())
                .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                .relatedReviewId(request.getRelatedReviewId())
                .build();

        feedback.setTenantId(tenantId);
        feedback = feedbackRepository.save(feedback);

        return mapToResponse(feedback);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getReceivedFeedback(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Feedback> feedbackList = feedbackRepository.findReceivedFeedback(tenantId, employeeId);
        return feedbackList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getGivenFeedback(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Feedback> feedbackList = feedbackRepository.findGivenFeedback(tenantId, employeeId);
        return feedbackList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FeedbackResponse getFeedbackById(UUID feedbackId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Feedback feedback = feedbackRepository.findByIdAndTenantId(feedbackId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(FEEDBACK_NOT_FOUND));

        return mapToResponse(feedback);
    }

    @Transactional
    public FeedbackResponse updateFeedback(UUID feedbackId, FeedbackRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Feedback feedback = feedbackRepository.findByIdAndTenantId(feedbackId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(FEEDBACK_NOT_FOUND));

        // IDOR fix: validate employee IDs belong to the current tenant before updating.
        if (request.getRecipientId() != null) {
            employeeRepository.findByIdAndTenantId(request.getRecipientId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Recipient employee not found"));
            feedback.setRecipientId(request.getRecipientId());
        }
        if (request.getGiverId() != null) {
            employeeRepository.findByIdAndTenantId(request.getGiverId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Giver employee not found"));
            feedback.setGiverId(request.getGiverId());
        }
        if (request.getFeedbackType() != null) feedback.setFeedbackType(request.getFeedbackType());
        if (request.getCategory() != null) feedback.setCategory(request.getCategory());
        if (request.getFeedbackText() != null) feedback.setFeedbackText(request.getFeedbackText());
        if (request.getIsAnonymous() != null) feedback.setIsAnonymous(request.getIsAnonymous());
        if (request.getIsPublic() != null) feedback.setIsPublic(request.getIsPublic());
        if (request.getRelatedReviewId() != null) feedback.setRelatedReviewId(request.getRelatedReviewId());

        feedback = feedbackRepository.save(feedback);

        return mapToResponse(feedback);
    }

    @Transactional
    public void deleteFeedback(UUID feedbackId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Feedback feedback = feedbackRepository.findByIdAndTenantId(feedbackId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(FEEDBACK_NOT_FOUND));

        feedbackRepository.delete(feedback);
    }

    private FeedbackResponse mapToResponse(Feedback feedback) {
        UUID tenantId = TenantContext.getCurrentTenant();

        FeedbackResponse response = FeedbackResponse.builder()
                .id(feedback.getId())
                .recipientId(feedback.getRecipientId())
                .giverId(feedback.getGiverId())
                .feedbackType(feedback.getFeedbackType())
                .category(feedback.getCategory())
                .feedbackText(feedback.getFeedbackText())
                .isAnonymous(feedback.getIsAnonymous())
                .isPublic(feedback.getIsPublic())
                .relatedReviewId(feedback.getRelatedReviewId())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();

        if (feedback.getRecipientId() != null) {
            employeeRepository.findByIdAndTenantId(feedback.getRecipientId(), tenantId)
                    .ifPresent(employee -> response.setRecipientName(employee.getFullName()));
        }

        if (feedback.getGiverId() != null && !feedback.getIsAnonymous()) {
            employeeRepository.findByIdAndTenantId(feedback.getGiverId(), tenantId)
                    .ifPresent(employee -> response.setGiverName(employee.getFullName()));
        } else if (feedback.getIsAnonymous()) {
            response.setGiverName("Anonymous");
        }

        return response;
    }
}
