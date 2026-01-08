package com.nulogic.hrms.leave;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.leave.dto.LeaveBalanceResponse;
import com.nulogic.hrms.leave.dto.LeavePolicyRequest;
import com.nulogic.hrms.leave.dto.LeavePolicyResponse;
import com.nulogic.hrms.leave.dto.LeaveRequestCreateRequest;
import com.nulogic.hrms.leave.dto.LeaveRequestResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/leave")
public class LeaveController {
    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/policies")
    public ResponseEntity<List<LeavePolicyResponse>> listPolicies() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(leaveService.listPolicies(userId));
    }

    @PostMapping("/policies")
    public ResponseEntity<LeavePolicyResponse> createPolicy(@Valid @RequestBody LeavePolicyRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(leaveService.createPolicy(userId, request));
    }

    @GetMapping("/balances")
    public ResponseEntity<List<LeaveBalanceResponse>> balances(@RequestParam(required = false) Integer year) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        int targetYear = year == null ? LocalDate.now().getYear() : year;
        return ResponseEntity.ok(leaveService.getBalances(userId, targetYear));
    }

    @PostMapping("/requests")
    public ResponseEntity<LeaveRequestResponse> apply(@Valid @RequestBody LeaveRequestCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(leaveService.createRequest(userId, request));
    }

    @GetMapping("/requests")
    public ResponseEntity<Page<LeaveRequestResponse>> listRequests(@PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(leaveService.listRequests(userId, pageable));
    }

    @PutMapping("/requests/{id}/approve")
    public ResponseEntity<LeaveRequestResponse> approve(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(leaveService.approve(userId, id));
    }

    @PutMapping("/requests/{id}/reject")
    public ResponseEntity<LeaveRequestResponse> reject(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(leaveService.reject(userId, id));
    }
}
