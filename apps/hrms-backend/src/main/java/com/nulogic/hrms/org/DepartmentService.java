package com.nulogic.hrms.org;

import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.dto.OrgUnitRequest;
import com.nulogic.hrms.org.dto.OrgUnitResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;

    public DepartmentService(DepartmentRepository departmentRepository,
                             AuthorizationService authorizationService,
                             OrgService orgService) {
        this.departmentRepository = departmentRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
    }

    @Transactional(readOnly = true)
    public List<OrgUnitResponse> list(UUID userId) {
        authorizationService.checkPermission(userId, "ORG", "VIEW", PermissionScope.ORG);
        return departmentRepository.findByOrg_Id(orgService.getOrCreateOrg().getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrgUnitResponse create(UUID userId, OrgUnitRequest request) {
        authorizationService.checkPermission(userId, "ORG", "CREATE", PermissionScope.ORG);
        Department department = new Department();
        department.setOrg(orgService.getOrCreateOrg());
        department.setName(request.getName().trim());
        department.setActive(Boolean.TRUE.equals(request.getActive()));
        return toResponse(departmentRepository.save(department));
    }

    @Transactional
    public OrgUnitResponse update(UUID userId, UUID id, OrgUnitRequest request) {
        authorizationService.checkPermission(userId, "ORG", "UPDATE", PermissionScope.ORG);
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        ensureOrg(department);
        department.setName(request.getName().trim());
        department.setActive(Boolean.TRUE.equals(request.getActive()));
        return toResponse(departmentRepository.save(department));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        authorizationService.checkPermission(userId, "ORG", "DELETE", PermissionScope.ORG);
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        ensureOrg(department);
        departmentRepository.delete(department);
    }

    private OrgUnitResponse toResponse(Department department) {
        return OrgUnitResponse.builder()
                .id(department.getId())
                .name(department.getName())
                .active(department.isActive())
                .build();
    }

    private void ensureOrg(Department department) {
        if (!department.getOrg().getId().equals(orgService.getOrCreateOrg().getId())) {
            throw new IllegalArgumentException("Department not found");
        }
    }
}
