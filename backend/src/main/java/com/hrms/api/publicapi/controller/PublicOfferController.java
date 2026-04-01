package com.hrms.api.publicapi.controller;

import com.hrms.api.publicapi.dto.PublicOfferAcceptRequest;
import com.hrms.api.publicapi.dto.PublicOfferDeclineRequest;
import com.hrms.api.publicapi.dto.PublicOfferResponse;
import com.hrms.application.publicapi.service.PublicOfferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public controller for offer portal.
 * All endpoints are unauthenticated and use token-based access.
 */
@RestController
@RequestMapping("/api/v1/public/offers")
@RequiredArgsConstructor
@Slf4j
public class PublicOfferController {

    private final PublicOfferService publicOfferService;

    /**
     * Get offer details by token.
     * Token is typically sent via email to the candidate.
     */
    @GetMapping("/{token}")
    public ResponseEntity<PublicOfferResponse> getOfferByToken(@PathVariable String token) {
        log.info("Public offer request for token");
        return ResponseEntity.ok(publicOfferService.getOfferByToken(token));
    }

    /**
     * Accept offer using token.
     * Email in request must match the offer recipient.
     */
    @PostMapping("/{token}/accept")
    public ResponseEntity<PublicOfferResponse> acceptOffer(
            @PathVariable String token,
            @Valid @RequestBody PublicOfferAcceptRequest request) {
        log.info("Public offer accept for token");
        return ResponseEntity.ok(publicOfferService.acceptOffer(token, request));
    }

    /**
     * Decline offer using token.
     * Email in request must match the offer recipient.
     */
    @PostMapping("/{token}/decline")
    public ResponseEntity<PublicOfferResponse> declineOffer(
            @PathVariable String token,
            @Valid @RequestBody PublicOfferDeclineRequest request) {
        log.info("Public offer decline for token");
        return ResponseEntity.ok(publicOfferService.declineOffer(token, request));
    }
}
