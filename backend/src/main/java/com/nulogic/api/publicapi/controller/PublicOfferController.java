package com.nulogic.api.publicapi.controller;

import com.nulogic.api.publicapi.dto.PublicOfferAcceptRequest;
import com.nulogic.api.publicapi.dto.PublicOfferDeclineRequest;
import com.nulogic.api.publicapi.dto.PublicOfferResponse;
import com.nulogic.application.publicapi.service.PublicOfferService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.infrastructure.security.CaptchaService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final CaptchaService captchaService;

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
            @Valid @RequestBody PublicOfferAcceptRequest request,
            HttpServletRequest httpRequest) {
        requireCaptcha(request.getCaptchaToken(), httpRequest);
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
            @Valid @RequestBody PublicOfferDeclineRequest request,
            HttpServletRequest httpRequest) {
        requireCaptcha(request.getCaptchaToken(), httpRequest);
        log.info("Public offer decline for token");
        return ResponseEntity.ok(publicOfferService.declineOffer(token, request));
    }

    private void requireCaptcha(String captchaToken, HttpServletRequest httpRequest) {
        if (!captchaService.verify(captchaToken, httpRequest.getRemoteAddr())) {
            throw new BusinessException("Captcha verification failed. Please refresh the page and try again.");
        }
    }
}
