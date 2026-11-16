package com.nulogic.api.engagement.controller;

import com.nulogic.api.engagement.dto.AgendaTemplateRequest;
import com.nulogic.api.engagement.dto.AgendaTemplateResponse;
import com.nulogic.application.engagement.service.MeetingAgendaTemplateService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/meetings/agenda-templates")
@RequiredArgsConstructor
public class MeetingAgendaTemplateController {

    private final MeetingAgendaTemplateService service;

    @GetMapping
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<List<AgendaTemplateResponse>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PostMapping
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<AgendaTemplateResponse> create(@Valid @RequestBody AgendaTemplateRequest request) {
        return ResponseEntity.status(201).body(service.create(request));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
