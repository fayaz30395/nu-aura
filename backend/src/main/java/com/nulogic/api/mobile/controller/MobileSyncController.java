package com.nulogic.api.mobile.controller;

import com.nulogic.api.mobile.dto.MobileSyncDto;
import com.nulogic.application.mobile.service.MobileSyncService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
