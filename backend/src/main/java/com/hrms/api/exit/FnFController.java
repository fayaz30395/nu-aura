package com.hrms.api.exit;

import com.hrms.application.exit.dto.ExitInterviewPublicResponse;
import com.hrms.application.exit.dto.ExitInterviewSubmitRequest;
import com.hrms.application.exit.dto.FnFAdjustmentRequest;
import com.hrms.application.exit.dto.FnFCalculationResponse;
import com.hrms.application.exit.service.ExitInterviewPublicService;
import com.hrms.application.exit.service.FnFCalculationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@Slf4j
public class FnFController {

    @Autowired
    private FnFCalculationService fnfService;

    @Autowired
    private ExitInterviewPublicService publicInterviewService;

    // ---- FnF Settlement endpoints (authenticated) ----

    @GetMapping("/api/v1/exit/{exitProcessId}/fnf")
    @RequiresPermission(Permission.EXIT_VIEW)
    public ResponseEntity<FnFCalculationResponse> getOrCalculate(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(fnfService.getOrCalculate(exitProcessId));
    }

    @PutMapping("/api/v1/exit/{exitProcessId}/fnf/adjustments")
    @RequiresPermission(Permission.EXIT_MANAGE)
    public ResponseEntity<FnFCalculationResponse> adjust(
            @PathVariable UUID exitProcessId,
            @RequestBody FnFAdjustmentRequest request) {
        return ResponseEntity.ok(fnfService.addAdjustment(exitProcessId, request));
    }

    @PostMapping("/api/v1/exit/{exitProcessId}/fnf/approve")
    @RequiresPermission(Permission.EXIT_APPROVE)
    public ResponseEntity<FnFCalculationResponse> approve(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(fnfService.approve(exitProcessId));
    }

    @GetMapping("/api/v1/exit/fnf")
    @RequiresPermission(Permission.EXIT_VIEW)
    public ResponseEntity<Page<FnFCalculationResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(fnfService.getAll(pageable));
    }

    // ---- Generate public token for exit interview ----

    @PostMapping("/api/v1/exit/interviews/{interviewId}/generate-token")
    @RequiresPermission(Permission.EXIT_MANAGE)
    public ResponseEntity<String> generatePublicToken(@PathVariable UUID interviewId) {
        String token = publicInterviewService.generatePublicToken(interviewId);
        return ResponseEntity.ok(token);
    }

    // ---- Public (unauthenticated) exit interview endpoints ----

    @GetMapping("/api/v1/exit/interview/public/{token}")
    public ResponseEntity<ExitInterviewPublicResponse> getPublicInterview(@PathVariable String token) {
        return ResponseEntity.ok(publicInterviewService.getByToken(token));
    }

    @PostMapping("/api/v1/exit/interview/public/{token}/submit")
    public ResponseEntity<Void> submitPublicInterview(
            @PathVariable String token,
            @Valid @RequestBody ExitInterviewSubmitRequest request) {
        publicInterviewService.submitByToken(token, request);
        return ResponseEntity.ok().build();
    }
}
