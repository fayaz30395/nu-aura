package com.nulogic.pm.api.controller;

import com.nulogic.pm.api.dto.MemberDTO;
import com.nulogic.pm.application.service.MemberService;
import com.nulogic.pm.domain.project.ProjectMember.ProjectRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController("pmMemberController")
@RequestMapping("/api/v1/pm/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @PostMapping
    public ResponseEntity<MemberDTO.Response> add(@RequestBody MemberDTO.AddRequest request) {
        MemberDTO.Response response = memberService.add(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemberDTO.Response> update(@PathVariable UUID id,
                                                      @RequestBody MemberDTO.UpdateRequest request) {
        MemberDTO.Response response = memberService.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberDTO.Response> getById(@PathVariable UUID id) {
        MemberDTO.Response response = memberService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<MemberDTO.ListResponse>> listByProject(@PathVariable UUID projectId) {
        List<MemberDTO.ListResponse> response = memberService.listByProject(projectId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}/paged")
    public ResponseEntity<Page<MemberDTO.Response>> listByProjectPaged(
            @PathVariable UUID projectId,
            @RequestParam(required = false) ProjectRole role,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "joinedDate", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<MemberDTO.Response> response = memberService.listByProjectPaged(projectId, role, search, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}/projects")
    public ResponseEntity<List<UUID>> getProjectIdsByUser(@PathVariable UUID userId) {
        List<UUID> projectIds = memberService.getProjectIdsByUser(userId);
        return ResponseEntity.ok(projectIds);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable UUID id) {
        memberService.remove(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reactivate")
    public ResponseEntity<MemberDTO.Response> reactivate(@PathVariable UUID id) {
        MemberDTO.Response response = memberService.reactivate(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<MemberDTO.Response> changeRole(@PathVariable UUID id,
                                                          @RequestParam ProjectRole role) {
        MemberDTO.Response response = memberService.changeRole(id, role);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}/check/{userId}")
    public ResponseEntity<Boolean> isProjectMember(@PathVariable UUID projectId, @PathVariable UUID userId) {
        boolean isMember = memberService.isProjectMember(projectId, userId);
        return ResponseEntity.ok(isMember);
    }

    @GetMapping("/project/{projectId}/can-manage/{userId}")
    public ResponseEntity<Boolean> canManageProject(@PathVariable UUID projectId, @PathVariable UUID userId) {
        boolean canManage = memberService.canManageProject(projectId, userId);
        return ResponseEntity.ok(canManage);
    }
}
