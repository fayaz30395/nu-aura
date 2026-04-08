package com.hrms.api.employee;

import com.hrms.application.employee.service.SkillService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.EmployeeSkill;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for employee skill CRUD operations.
 * Supports the Competency Matrix frontend feature in NU-Grow.
 *
 * Note: No dedicated SKILL permission constants exist — we use EMPLOYEE_VIEW_SELF
 * for reads (any authenticated user can view skills) and rely on service-layer
 * tenant isolation for security. SuperAdmin bypasses all checks via PermissionAspect.
 */
@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employee Skills", description = "Employee skill management for the Competency Matrix")
@RequiredArgsConstructor
public class EmployeeSkillController {

    private final SkillService skillService;

    @GetMapping("/{employeeId}/skills")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Get skills for an employee",
            description = "Returns all skills for the specified employee within the caller's tenant")
    @ApiResponse(responseCode = "200", description = "Skills retrieved successfully")
    public ResponseEntity<List<EmployeeSkill>> getEmployeeSkills(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<EmployeeSkill> skills = skillService.getEmployeeSkills(tenantId, employeeId);
        return ResponseEntity.ok(skills);
    }

    @PostMapping("/{employeeId}/skills")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Add or update a skill for an employee",
            description = "Creates a new skill or updates an existing one (matched by skillName)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Skill created/updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public ResponseEntity<EmployeeSkill> addOrUpdateSkill(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Valid @RequestBody AddSkillRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        EmployeeSkill skill = skillService.addOrUpdateSkill(
                tenantId, employeeId,
                request.getSkillName(),
                request.getCategory(),
                request.getProficiencyLevel(),
                request.getSource()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(skill);
    }

    @PutMapping("/skills/{skillId}/verify")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Verify an employee skill",
            description = "Marks a skill as verified by the current user (typically a manager)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Skill verified successfully"),
            @ApiResponse(responseCode = "404", description = "Skill not found")
    })
    public ResponseEntity<Void> verifySkill(
            @Parameter(description = "Skill UUID") @PathVariable UUID skillId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID verifiedBy = SecurityContext.getCurrentEmployeeId();
        skillService.verifySkill(tenantId, skillId, verifiedBy);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/skills/{skillId}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Remove an employee skill",
            description = "Deletes a skill record from the employee's profile")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Skill removed successfully"),
            @ApiResponse(responseCode = "404", description = "Skill not found")
    })
    public ResponseEntity<Void> removeSkill(
            @Parameter(description = "Skill UUID") @PathVariable UUID skillId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        skillService.removeSkill(tenantId, skillId);
        return ResponseEntity.noContent().build();
    }

    // ─── Request DTO ────────────────────────────────────────────────────────

    @Data
    public static class AddSkillRequest {
        @NotBlank(message = "Skill name is required")
        private String skillName;

        @NotBlank(message = "Category is required")
        private String category;

        @NotNull(message = "Proficiency level is required")
        @Min(value = 1, message = "Proficiency level must be between 1 and 5")
        @Max(value = 5, message = "Proficiency level must be between 1 and 5")
        private Integer proficiencyLevel;

        private String source;
    }
}
