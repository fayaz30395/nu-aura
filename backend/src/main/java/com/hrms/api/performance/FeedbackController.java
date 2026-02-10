package com.hrms.api.performance;

import com.hrms.application.performance.dto.FeedbackRequest;
import com.hrms.application.performance.dto.FeedbackResponse;
import com.hrms.application.performance.service.FeedbackService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @PostMapping
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<FeedbackResponse> giveFeedback(@Valid @RequestBody FeedbackRequest request) {
        FeedbackResponse response = feedbackService.giveFeedback(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<FeedbackResponse> getFeedbackById(@PathVariable UUID id) {
        FeedbackResponse response = feedbackService.getFeedbackById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/received/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<FeedbackResponse>> getReceivedFeedback(@PathVariable UUID employeeId) {
        List<FeedbackResponse> feedback = feedbackService.getReceivedFeedback(employeeId);
        return ResponseEntity.ok(feedback);
    }

    @GetMapping("/given/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<FeedbackResponse>> getGivenFeedback(@PathVariable UUID employeeId) {
        List<FeedbackResponse> feedback = feedbackService.getGivenFeedback(employeeId);
        return ResponseEntity.ok(feedback);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<FeedbackResponse> updateFeedback(
            @PathVariable UUID id,
            @Valid @RequestBody FeedbackRequest request
    ) {
        FeedbackResponse response = feedbackService.updateFeedback(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<Void> deleteFeedback(@PathVariable UUID id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.noContent().build();
    }
}
