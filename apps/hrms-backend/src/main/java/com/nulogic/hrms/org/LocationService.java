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
public class LocationService {
    private final LocationRepository locationRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;

    public LocationService(LocationRepository locationRepository,
                           AuthorizationService authorizationService,
                           OrgService orgService) {
        this.locationRepository = locationRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
    }

    @Transactional(readOnly = true)
    public List<OrgUnitResponse> list(UUID userId) {
        authorizationService.checkPermission(userId, "ORG", "VIEW", PermissionScope.ORG);
        return locationRepository.findByOrg_Id(orgService.getOrCreateOrg().getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrgUnitResponse create(UUID userId, OrgUnitRequest request) {
        authorizationService.checkPermission(userId, "ORG", "CREATE", PermissionScope.ORG);
        Location location = new Location();
        location.setOrg(orgService.getOrCreateOrg());
        location.setName(request.getName().trim());
        location.setActive(Boolean.TRUE.equals(request.getActive()));
        return toResponse(locationRepository.save(location));
    }

    @Transactional
    public OrgUnitResponse update(UUID userId, UUID id, OrgUnitRequest request) {
        authorizationService.checkPermission(userId, "ORG", "UPDATE", PermissionScope.ORG);
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        ensureOrg(location);
        location.setName(request.getName().trim());
        location.setActive(Boolean.TRUE.equals(request.getActive()));
        return toResponse(locationRepository.save(location));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        authorizationService.checkPermission(userId, "ORG", "DELETE", PermissionScope.ORG);
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        ensureOrg(location);
        locationRepository.delete(location);
    }

    private OrgUnitResponse toResponse(Location location) {
        return OrgUnitResponse.builder()
                .id(location.getId())
                .name(location.getName())
                .active(location.isActive())
                .build();
    }

    private void ensureOrg(Location location) {
        if (!location.getOrg().getId().equals(orgService.getOrCreateOrg().getId())) {
            throw new IllegalArgumentException("Location not found");
        }
    }
}
