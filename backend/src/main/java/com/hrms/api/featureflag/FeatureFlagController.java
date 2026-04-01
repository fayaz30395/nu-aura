package com.hrms.api.featureflag;

import com.hrms.application.featureflag.FeatureFlagService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.featureflag.FeatureFlag;

import static com.hrms.common.security.Permission.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

/**
 * REST API for Feature Flags management.
 *
 * Playbook Reference: Prompt 34 - Feature flags (tenant-level)
 */
@RestController
@RequestMapping("/api/v1/feature-flags")
@RequiredArgsConstructor
@Tag(name = "Feature Flags", description = "Tenant-level feature flag management")
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Get all feature flags for current tenant")
    public ResponseEntity<List<FeatureFlag>> getAllFlags() {
        return ResponseEntity.ok(featureFlagService.getAllFlags());
    }

    @GetMapping("/map")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Get feature flags as key-value map")
    public ResponseEntity<Map<String, Boolean>> getFlagsAsMap() {
        return ResponseEntity.ok(featureFlagService.getFlagsAsMap());
    }

    @GetMapping("/enabled")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Get list of enabled feature keys")
    public ResponseEntity<List<String>> getEnabledFeatures() {
        return ResponseEntity.ok(featureFlagService.getEnabledFeatures());
    }

    @GetMapping("/check/{featureKey}")
    @Operation(summary = "Check if a specific feature is enabled")
    public ResponseEntity<Map<String, Object>> checkFeature(@PathVariable String featureKey) {
        boolean enabled = featureFlagService.isFeatureEnabled(featureKey);
        return ResponseEntity.ok(Map.of(
                "featureKey", featureKey,
                "enabled", enabled
        ));
    }

    @GetMapping("/category/{category}")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Get feature flags by category")
    public ResponseEntity<List<FeatureFlag>> getFlagsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(featureFlagService.getFlagsByCategory(category));
    }

    @PostMapping
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Create or update a feature flag")
    public ResponseEntity<FeatureFlag> setFeatureFlag(@Valid @RequestBody FeatureFlagRequest request) {
        FeatureFlag flag = featureFlagService.setFeatureFlag(
                request.featureKey(),
                request.enabled(),
                request.name(),
                request.description(),
                request.category()
        );
        return ResponseEntity.ok(flag);
    }

    @PostMapping("/{featureKey}/toggle")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Toggle a feature flag on/off")
    public ResponseEntity<FeatureFlag> toggleFeature(@PathVariable String featureKey) {
        return ResponseEntity.ok(featureFlagService.toggleFeature(featureKey));
    }

    public record FeatureFlagRequest(
            @NotBlank(message = "Feature key is required") String featureKey,
            boolean enabled,
            String name,
            String description,
            String category
    ) {}
}
