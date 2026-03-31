package com.nulogic.pm.application.service;

import com.nulogic.pm.api.dto.MemberDTO;
import com.nulogic.common.security.TenantContext;
import com.nulogic.pm.domain.project.ProjectMember;
import com.nulogic.pm.domain.project.ProjectMember.ProjectRole;
import com.nulogic.pm.infrastructure.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service("pmMemberService")
@RequiredArgsConstructor
@Transactional
public class MemberService {

    private final ProjectMemberRepository memberRepository;

    public MemberDTO.Response add(MemberDTO.AddRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (memberRepository.existsByTenantIdAndProjectIdAndUserId(tenantId, request.getProjectId(), request.getUserId())) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        ProjectMember member = ProjectMember.builder()
                .projectId(request.getProjectId())
                .userId(request.getUserId())
                .userName(request.getUserName())
                .email(request.getEmail())
                .role(request.getRole() != null ? request.getRole() : ProjectRole.MEMBER)
                .joinedDate(LocalDate.now())
                .hoursPerWeek(request.getHoursPerWeek())
                .department(request.getDepartment())
                .designation(request.getDesignation())
                .build();

        member.setTenantId(tenantId);
        member = memberRepository.save(member);

        return MemberDTO.Response.fromEntity(member);
    }

    public MemberDTO.Response update(UUID id, MemberDTO.UpdateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMember member = memberRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + id));

        if (request.getRole() != null) member.setRole(request.getRole());
        if (request.getHoursPerWeek() != null) member.setHoursPerWeek(request.getHoursPerWeek());
        if (request.getDepartment() != null) member.setDepartment(request.getDepartment());
        if (request.getDesignation() != null) member.setDesignation(request.getDesignation());

        member = memberRepository.save(member);
        return MemberDTO.Response.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public MemberDTO.Response getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMember member = memberRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + id));

        return MemberDTO.Response.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public List<MemberDTO.ListResponse> listByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return memberRepository.findByTenantIdAndProjectIdAndIsActiveTrue(tenantId, projectId).stream()
                .map(MemberDTO.ListResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MemberDTO.Response> listByProjectPaged(UUID projectId, ProjectRole role, String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectMember> members = memberRepository.findByProjectWithFilters(tenantId, projectId, role, search, pageable);

        return members.map(MemberDTO.Response::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<UUID> getProjectIdsByUser(UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return memberRepository.findProjectIdsByUser(tenantId, userId);
    }

    public void remove(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMember member = memberRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + id));

        member.deactivate();
        memberRepository.save(member);
    }

    public MemberDTO.Response reactivate(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMember member = memberRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + id));

        member.activate();
        member = memberRepository.save(member);

        return MemberDTO.Response.fromEntity(member);
    }

    public MemberDTO.Response changeRole(UUID id, ProjectRole role) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectMember member = memberRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + id));

        member.setRole(role);
        member = memberRepository.save(member);

        return MemberDTO.Response.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public boolean isProjectMember(UUID projectId, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return memberRepository.findByTenantIdAndProjectIdAndUserId(tenantId, projectId, userId)
                .map(ProjectMember::getIsActive)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean canManageProject(UUID projectId, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return memberRepository.findByTenantIdAndProjectIdAndUserId(tenantId, projectId, userId)
                .map(member -> member.getIsActive() && member.canEditProject())
                .orElse(false);
    }
}
