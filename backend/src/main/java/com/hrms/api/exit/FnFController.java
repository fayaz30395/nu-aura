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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

// BUG-010 FIX: Added class-level @RequestMapping so each method uses a relative path
// instead of duplicating the "/api/v1/exit" prefix on every annotation.
@RestController
@RequestMapping("/api/v1/exit")
public class FnFController {

    private final FnFCalculationService fnfService;
    private final ExitInterviewPublicService publicInterviewService;

    public FnFController(FnFCalculationService fnfService,
                         ExitInterviewPublicService publicInterviewService) {
        this.fnfService = fnfService;
        this.publicInterviewService = publicInterviewService;
    }

    // ---- FnF Settlement endpoints (authenticated) ----

    @GetMapping("/{exitProcessId}/fnf")
    @RequiresPermission(Permission.EXIT_VIEW)
    public ResponseEntity<FnFCalculationResponse> getOrCalculate(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(fnfService.getOrCalculate(exitProcessId));
    }

    @PutMapping("/{exitProcessId}/fnf/adjustments")
    @RequiresPermission(Permission.EXIT_MANAGE)
    public ResponseEntity<FnFCalculationResponse> adjust(
            @PathVariable UUID exitProcessId,
            @Valid @RequestBody FnFAdjustmentRequest request) {
        return ResponseEntity.ok(fnfService.addAdjustment(exitProcessId, request));
    }

    @PostMapping("/{exitProcessId}/fnf/approve")
    @RequiresPermission(Permission.EXIT_APPROVE)
    public ResponseEntity<FnFCalculationResponse> approve(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(fnfService.approve(exitProcessId));
    }

    @GetMapping("/fnf")
    @RequiresPermission(Permission.EXIT_VIEW)
    public ResponseEntity<Page<FnFCalculationResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(fnfService.getAll(pageable));
    }

    // ---- Generate public token for exit interview ----

    @PostMapping("/interviews/{interviewId}/generate-token")
    @RequiresPermission(Permission.EXIT_MANAGE)
    public ResponseEntity<String> generatePublicToken(@PathVariable UUID interviewId) {
        String token = publicInterviewService.generatePublicToken(interviewId);
        return ResponseEntity.ok(token);
    }

    // ---- Public (unauthenticated) exit interview endpoints ----

    @GetMapping("/interview/public/{token}")
    public ResponseEntity<ExitInterviewPublicResponse> getPublicInterview(@PathVariable String token) {
        return ResponseEntity.ok(publicInterviewService.getByToken(token));
    }

    @PostMapping("/interview/public/{token}/submit")
    public ResponseEntity<Void> submitPublicInterview(
            @PathVariable String token,
            @Valid @RequestBody ExitInterviewSubmitRequest request) {
        publicInterviewService.submitByToken(token, request);
        return ResponseEntity.ok().build();
    }
}
