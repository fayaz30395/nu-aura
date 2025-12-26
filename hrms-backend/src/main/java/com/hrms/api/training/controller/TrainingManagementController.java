package com.hrms.api.training.controller;

import com.hrms.api.training.dto.*;
import com.hrms.application.training.service.TrainingManagementService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.training.TrainingEnrollment;
import com.hrms.domain.training.TrainingProgram;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/training")
@RequiredArgsConstructor
public class TrainingManagementController {

    private final TrainingManagementService trainingService;

    @PostMapping("/programs")
    @RequiresPermission("TRAINING_CREATE")
    public ResponseEntity<TrainingProgramResponse> createProgram(@Valid @RequestBody TrainingProgramRequest request) {
        TrainingProgramResponse response = trainingService.createProgram(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/programs/{programId}")
    @RequiresPermission("TRAINING_CREATE")
    public ResponseEntity<TrainingProgramResponse> updateProgram(
            @PathVariable UUID programId,
            @Valid @RequestBody TrainingProgramRequest request) {
        TrainingProgramResponse response = trainingService.updateProgram(programId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/programs/{programId}")
    @RequiresPermission("TRAINING_VIEW")
    public ResponseEntity<TrainingProgramResponse> getProgramById(@PathVariable UUID programId) {
        TrainingProgramResponse response = trainingService.getProgramById(programId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/programs")
    @RequiresPermission("TRAINING_VIEW")
    public ResponseEntity<Page<TrainingProgramResponse>> getAllPrograms(Pageable pageable) {
        Page<TrainingProgramResponse> response = trainingService.getAllPrograms(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/programs/status/{status}")
    @RequiresPermission("TRAINING_VIEW")
    public ResponseEntity<List<TrainingProgramResponse>> getProgramsByStatus(
            @PathVariable TrainingProgram.ProgramStatus status) {
        List<TrainingProgramResponse> response = trainingService.getProgramsByStatus(status);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/programs/{programId}")
    @RequiresPermission("TRAINING_CREATE")
    public ResponseEntity<Void> deleteProgram(@PathVariable UUID programId) {
        trainingService.deleteProgram(programId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/enrollments")
    @RequiresPermission("TRAINING_ENROLL")
    public ResponseEntity<TrainingEnrollmentResponse> enrollEmployee(
            @Valid @RequestBody TrainingEnrollmentRequest request) {
        TrainingEnrollmentResponse response = trainingService.enrollEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/enrollments/{enrollmentId}/status")
    @RequiresPermission("TRAINING_APPROVE")
    public ResponseEntity<TrainingEnrollmentResponse> updateEnrollmentStatus(
            @PathVariable UUID enrollmentId,
            @RequestParam TrainingEnrollment.EnrollmentStatus status) {
        TrainingEnrollmentResponse response = trainingService.updateEnrollmentStatus(enrollmentId, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/enrollments/program/{programId}")
    @RequiresPermission("TRAINING_VIEW")
    public ResponseEntity<List<TrainingEnrollmentResponse>> getEnrollmentsByProgram(@PathVariable UUID programId) {
        List<TrainingEnrollmentResponse> response = trainingService.getEnrollmentsByProgram(programId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/enrollments/employee/{employeeId}")
    @RequiresPermission("TRAINING_VIEW")
    public ResponseEntity<List<TrainingEnrollmentResponse>> getEnrollmentsByEmployee(@PathVariable UUID employeeId) {
        List<TrainingEnrollmentResponse> response = trainingService.getEnrollmentsByEmployee(employeeId);
        return ResponseEntity.ok(response);
    }
}
