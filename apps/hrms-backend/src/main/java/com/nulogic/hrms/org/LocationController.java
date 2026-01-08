package com.nulogic.hrms.org;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.org.dto.OrgUnitRequest;
import com.nulogic.hrms.org.dto.OrgUnitResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {
    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping
    public ResponseEntity<List<OrgUnitResponse>> list() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(locationService.list(userId));
    }

    @PostMapping
    public ResponseEntity<OrgUnitResponse> create(@Valid @RequestBody OrgUnitRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(locationService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrgUnitResponse> update(@PathVariable UUID id, @Valid @RequestBody OrgUnitRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(locationService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        locationService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
