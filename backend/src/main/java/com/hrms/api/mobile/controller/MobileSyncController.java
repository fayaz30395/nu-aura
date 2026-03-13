package com.hrms.api.mobile.controller;

import com.hrms.api.mobile.dto.MobileSyncDto;
import com.hrms.application.mobile.service.MobileSyncService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/mobile/sync")
@RequiredArgsConstructor
@Tag(name = "Mobile Sync", description = "Mobile delta sync endpoints for offline-first support")
public class MobileSyncController {

    private final MobileSyncService mobileSyncService;

    @GetMapping
    @RequiresPermission(Permission.DASHBOARD_VIEW)
    @Operation(summary = "Delta sync", description = "Get all changes since last sync timestamp for offline-first patterns")
    public ResponseEntity<MobileSyncDto.SyncResponse> deltaSync(
            @RequestParam LocalDateTime lastSyncAt,
            @RequestParam(required = false, defaultValue = "100") Integer limit) {
        MobileSyncDto.SyncRequest request = MobileSyncDto.SyncRequest.builder()
                .lastSyncAt(lastSyncAt)
                .limit(limit)
                .build();
        return ResponseEntity.ok(mobileSyncService.deltaSync(request));
    }
}
