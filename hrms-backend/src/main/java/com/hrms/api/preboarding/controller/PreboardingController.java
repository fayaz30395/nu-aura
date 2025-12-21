package com.hrms.api.preboarding.controller;

import com.hrms.api.preboarding.dto.*;
import com.hrms.application.preboarding.service.PreboardingService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.preboarding.PreboardingCandidate;
import com.hrms.domain.preboarding.PreboardingCandidate.PreboardingStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/preboarding")
@RequiredArgsConstructor
public class PreboardingController {

    private final PreboardingService preboardingService;

    // ============ ADMIN ENDPOINTS ============

    @PostMapping("/candidates")
    @RequiresPermission("PREBOARDING:CREATE")
    public ResponseEntity<PreboardingCandidateResponse> createInvitation(
            @Valid @RequestBody CreatePreboardingRequest request) {
        PreboardingCandidate candidate = preboardingService.createInvitation(
                request.getFirstName(),
                request.getLastName(),
                request.getEmail(),
                request.getExpectedJoiningDate(),
                request.getDesignation(),
                request.getDepartmentId(),
                request.getReportingManagerId()
        );
        return ResponseEntity.ok(PreboardingCandidateResponse.from(candidate));
    }

    @GetMapping("/candidates")
    @RequiresPermission("PREBOARDING:VIEW")
    public ResponseEntity<Page<PreboardingCandidateResponse>> getAllCandidates(Pageable pageable) {
        Page<PreboardingCandidateResponse> candidates = preboardingService.getAllCandidates(pageable)
                .map(PreboardingCandidateResponse::from);
        return ResponseEntity.ok(candidates);
    }

    @GetMapping("/candidates/status/{status}")
    @RequiresPermission("PREBOARDING:VIEW")
    public ResponseEntity<Page<PreboardingCandidateResponse>> getCandidatesByStatus(
            @PathVariable String status, Pageable pageable) {
        PreboardingStatus preboardingStatus = PreboardingStatus.valueOf(status.toUpperCase());
        Page<PreboardingCandidateResponse> candidates = preboardingService
                .getCandidatesByStatus(preboardingStatus, pageable)
                .map(PreboardingCandidateResponse::from);
        return ResponseEntity.ok(candidates);
    }

    @GetMapping("/candidates/upcoming")
    @RequiresPermission("PREBOARDING:VIEW")
    public ResponseEntity<List<PreboardingCandidateResponse>> getUpcomingJoiners(
            @RequestParam(defaultValue = "7") int days) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(days);
        List<PreboardingCandidateResponse> candidates = preboardingService
                .getUpcomingJoiners(startDate, endDate)
                .stream()
                .map(PreboardingCandidateResponse::from)
                .toList();
        return ResponseEntity.ok(candidates);
    }

    @PostMapping("/candidates/{id}/cancel")
    @RequiresPermission("PREBOARDING:MANAGE")
    public ResponseEntity<Void> cancelInvitation(@PathVariable UUID id) {
        preboardingService.cancelInvitation(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/candidates/{id}/resend")
    @RequiresPermission("PREBOARDING:MANAGE")
    public ResponseEntity<Void> resendInvitation(@PathVariable UUID id) {
        preboardingService.resendInvitation(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/candidates/{id}/convert")
    @RequiresPermission("PREBOARDING:MANAGE")
    public ResponseEntity<Void> markConverted(@PathVariable UUID id, @RequestBody Map<String, UUID> body) {
        preboardingService.markConverted(id, body.get("employeeId"));
        return ResponseEntity.ok().build();
    }

    // ============ PUBLIC PORTAL ENDPOINTS ============

    @GetMapping("/portal/{token}")
    public ResponseEntity<PreboardingCandidateResponse> getPortalData(@PathVariable String token) {
        PreboardingCandidate candidate = preboardingService.getByAccessToken(token);
        return ResponseEntity.ok(PreboardingCandidateResponse.from(candidate));
    }

    @PutMapping("/portal/{token}/personal-info")
    public ResponseEntity<PreboardingCandidateResponse> updatePersonalInfo(
            @PathVariable String token,
            @Valid @RequestBody UpdatePersonalInfoRequest request) {
        PreboardingCandidate candidate = preboardingService.updatePersonalInfo(
                token,
                request.getDateOfBirth(),
                request.getAddress(),
                request.getCity(),
                request.getState(),
                request.getPostalCode(),
                request.getCountry(),
                request.getPhoneNumber(),
                request.getEmergencyContactNumber(),
                request.getEmergencyContactName()
        );
        return ResponseEntity.ok(PreboardingCandidateResponse.from(candidate));
    }

    @PutMapping("/portal/{token}/bank-details")
    public ResponseEntity<PreboardingCandidateResponse> updateBankDetails(
            @PathVariable String token,
            @Valid @RequestBody UpdateBankDetailsRequest request) {
        PreboardingCandidate candidate = preboardingService.updateBankDetails(
                token,
                request.getBankAccountNumber(),
                request.getBankName(),
                request.getBankIfscCode(),
                request.getTaxId()
        );
        return ResponseEntity.ok(PreboardingCandidateResponse.from(candidate));
    }

    @PostMapping("/portal/{token}/documents/{documentType}")
    public ResponseEntity<PreboardingCandidateResponse> markDocumentUploaded(
            @PathVariable String token,
            @PathVariable String documentType) {
        PreboardingCandidate candidate = preboardingService.markDocumentUploaded(token, documentType);
        return ResponseEntity.ok(PreboardingCandidateResponse.from(candidate));
    }

    @PostMapping("/portal/{token}/sign-offer")
    public ResponseEntity<PreboardingCandidateResponse> signOfferLetter(@PathVariable String token) {
        PreboardingCandidate candidate = preboardingService.signOfferLetter(token);
        return ResponseEntity.ok(PreboardingCandidateResponse.from(candidate));
    }
}
