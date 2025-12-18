package com.hrms.application.user.service;

import com.hrms.api.user.dto.PermissionResponse;
import com.hrms.domain.user.Permission;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        List<Permission> permissions = permissionRepository.findAllByOrderByResourceAscActionAsc();
        return permissions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getPermissionsByResource(String resource) {
        List<Permission> permissions = permissionRepository.findByResource(resource);
        return permissions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private PermissionResponse mapToResponse(Permission permission) {
        return new PermissionResponse(
                permission.getId(),
                permission.getCode(),
                permission.getName(),
                permission.getDescription(),
                permission.getResource(),
                permission.getAction()
        );
    }
}
