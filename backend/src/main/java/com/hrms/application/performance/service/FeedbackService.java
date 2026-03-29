package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.FeedbackRequest;
import com.hrms.application.performance.dto.FeedbackResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.performance.Feedback;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.FeedbackRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FeedbackService {

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
                .orElseThrow(() -> new RuntimeException("Feedback not found"));

        return mapToResponse(feedback);
    }

    @Transactional
    public FeedbackResponse updateFeedback(UUID feedbackId, FeedbackRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Feedback feedback = feedbackRepository.findByIdAndTenantId(feedbackId, tenantId)
                .orElseThrow(() -> new RuntimeException("Feedback not found"));

        if (request.getRecipientId() != null) feedback.setRecipientId(request.getRecipientId());
        if (request.getGiverId() != null) feedback.setGiverId(request.getGiverId());
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
                .orElseThrow(() -> new RuntimeException("Feedback not found"));

        feedbackRepository.delete(feedback);
    }

    private FeedbackResponse mapToResponse(Feedback feedback) {
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

        // Enrich with recipient name
        if (feedback.getRecipientId() != null) {
            employeeRepository.findById(feedback.getRecipientId())
                    .ifPresent(employee -> response.setRecipientName(employee.getFullName()));
        }

        // Enrich with giver name (unless anonymous)
        if (feedback.getGiverId() != null && !feedback.getIsAnonymous()) {
            employeeRepository.findById(feedback.getGiverId())
                    .ifPresent(employee -> response.setGiverName(employee.getFullName()));
        } else if (feedback.getIsAnonymous()) {
            response.setGiverName("Anonymous");
        }

        return response;
    }
}
