package com.hrms.api.performance;

import com.hrms.application.performance.dto.ReviewCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleResponse;
import com.hrms.application.performance.service.ReviewCycleService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/review-cycles")
public class ReviewCycleController {

    @Autowired
    private ReviewCycleService reviewCycleService;

    @PostMapping
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewCycleResponse> createCycle(@RequestBody ReviewCycleRequest request) {
        ReviewCycleResponse response = reviewCycleService.createCycle(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<Page<ReviewCycleResponse>> getAllCycles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ReviewCycleResponse> cycles = reviewCycleService.getAllCycles(pageable);
        return ResponseEntity.ok(cycles);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<ReviewCycleResponse> getCycleById(@PathVariable UUID id) {
        ReviewCycleResponse response = reviewCycleService.getCycleById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<ReviewCycleResponse>> getActiveCycles() {
        List<ReviewCycleResponse> cycles = reviewCycleService.getActiveCycles();
        return ResponseEntity.ok(cycles);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewCycleResponse> updateCycle(
            @PathVariable UUID id,
            @RequestBody ReviewCycleRequest request
    ) {
        ReviewCycleResponse response = reviewCycleService.updateCycle(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @RequiresPermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewCycleResponse> completeCycle(@PathVariable UUID id) {
        ReviewCycleResponse response = reviewCycleService.completeCycle(id);
        return ResponseEntity.ok(response);
    }
}
