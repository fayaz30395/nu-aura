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
public class DesignationService {
    private final DesignationRepository designationRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;

    public DesignationService(DesignationRepository designationRepository,
                              AuthorizationService authorizationService,
                              OrgService orgService) {
        this.designationRepository = designationRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
    }

    @Transactional(readOnly = true)
    public List<OrgUnitResponse> list(UUID userId) {
        authorizationService.checkPermission(userId, "ORG", "VIEW", PermissionScope.ORG);
        return designationRepository.findByOrg_Id(orgService.getOrCreateOrg().getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrgUnitResponse create(UUID userId, OrgUnitRequest request) {
        authorizationService.checkPermission(userId, "ORG", "CREATE", PermissionScope.ORG);
        Designation designation = new Designation();
        designation.setOrg(orgService.getOrCreateOrg());
        designation.setName(request.getName().trim());
        designation.setActive(Boolean.TRUE.equals(request.getActive()));
        return toResponse(designationRepository.save(designation));
    }

    @Transactional
    public OrgUnitResponse update(UUID userId, UUID id, OrgUnitRequest request) {
        authorizationService.checkPermission(userId, "ORG", "UPDATE", PermissionScope.ORG);
        Designation designation = designationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Designation not found"));
        ensureOrg(designation);
        designation.setName(request.getName().trim());
        designation.setActive(Boolean.TRUE.equals(request.getActive()));
        return toResponse(designationRepository.save(designation));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        authorizationService.checkPermission(userId, "ORG", "DELETE", PermissionScope.ORG);
        Designation designation = designationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Designation not found"));
        ensureOrg(designation);
        designationRepository.delete(designation);
    }

    private OrgUnitResponse toResponse(Designation designation) {
        return OrgUnitResponse.builder()
                .id(designation.getId())
                .name(designation.getName())
                .active(designation.isActive())
                .build();
    }

    private void ensureOrg(Designation designation) {
        if (!designation.getOrg().getId().equals(orgService.getOrCreateOrg().getId())) {
            throw new IllegalArgumentException("Designation not found");
        }
    }
}
