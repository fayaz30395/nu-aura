package com.nulogic.api.performance.controller;

import com.nulogic.application.performance.service.CompetencyFrameworkService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.performance.CompetencyFramework;
import com.nulogic.domain.performance.CompetencyRequirement;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * CRUD for role-based competency requirements, replacing the hardcoded skill
 * matrix that used to live in SkillGapAnalysisService and the frontend.
 */
@RestController
@RequestMapping("/api/v1/performance/competency-frameworks")
@RequiredArgsConstructor
@Tag(name = "Competency Frameworks", description = "Role-based skill requirement frameworks")
public class CompetencyFrameworkController {

    private final CompetencyFrameworkService competencyFrameworkService;

    @GetMapping
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<CompetencyFramework>> listFrameworks() {
        return ResponseEntity.ok(competencyFrameworkService.listFrameworks());
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<CompetencyFramework> getFramework(@PathVariable UUID id) {
        return ResponseEntity.ok(competencyFrameworkService.getFramework(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequiresPermission(Permission.REVIEW_UPDATE)
    public CompetencyFramework createFramework(@Valid @RequestBody CompetencyFramework framework) {
        return competencyFrameworkService.createFramework(framework);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_UPDATE)
    public ResponseEntity<CompetencyFramework> updateFramework(
            @PathVariable UUID id, @Valid @RequestBody CompetencyFramework framework) {
        return ResponseEntity.ok(competencyFrameworkService.updateFramework(id, framework));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.REVIEW_UPDATE)
    public ResponseEntity<Void> deleteFramework(@PathVariable UUID id) {
        competencyFrameworkService.deleteFramework(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/requirements")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public ResponseEntity<List<CompetencyRequirement>> listRequirements(@PathVariable UUID id) {
        return ResponseEntity.ok(competencyFrameworkService.listRequirements(id));
    }

    @PostMapping("/{id}/requirements")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiresPermission(Permission.REVIEW_UPDATE)
    public CompetencyRequirement addRequirement(
            @PathVariable("id") UUID frameworkId, @Valid @RequestBody CompetencyRequirement requirement) {
        return competencyFrameworkService.addRequirement(frameworkId, requirement);
    }

    @PutMapping("/{id}/requirements/{requirementId}")
    @RequiresPermission(Permission.REVIEW_UPDATE)
    public ResponseEntity<CompetencyRequirement> updateRequirement(
            @PathVariable("id") UUID frameworkId,
            @PathVariable UUID requirementId,
            @Valid @RequestBody CompetencyRequirement requirement) {
        return ResponseEntity.ok(competencyFrameworkService.updateRequirement(frameworkId, requirementId, requirement));
    }

    @DeleteMapping("/{id}/requirements/{requirementId}")
    @RequiresPermission(Permission.REVIEW_UPDATE)
    public ResponseEntity<Void> deleteRequirement(
            @PathVariable("id") UUID frameworkId,
            @Parameter(description = "Requirement UUID") @PathVariable UUID requirementId) {
        competencyFrameworkService.deleteRequirement(frameworkId, requirementId);
        return ResponseEntity.noContent().build();
    }
}
