package com.nulogic.hrms.org;

import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.dto.OrgUnitResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OrgImportService {
    private static final int MAX_ROWS = 500;

    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final LocationRepository locationRepository;

    public OrgImportService(AuthorizationService authorizationService,
                            OrgService orgService,
                            DepartmentRepository departmentRepository,
                            DesignationRepository designationRepository,
                            LocationRepository locationRepository) {
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
        this.locationRepository = locationRepository;
    }

    @Transactional
    public List<OrgUnitResponse> importDepartments(UUID userId, MultipartFile file) {
        authorizationService.checkPermission(userId, "ORG", "CREATE", PermissionScope.ORG);
        return importUnits(file, UnitType.DEPARTMENT);
    }

    @Transactional
    public List<OrgUnitResponse> importDesignations(UUID userId, MultipartFile file) {
        authorizationService.checkPermission(userId, "ORG", "CREATE", PermissionScope.ORG);
        return importUnits(file, UnitType.DESIGNATION);
    }

    @Transactional
    public List<OrgUnitResponse> importLocations(UUID userId, MultipartFile file) {
        authorizationService.checkPermission(userId, "ORG", "CREATE", PermissionScope.ORG);
        return importUnits(file, UnitType.LOCATION);
    }

    private List<OrgUnitResponse> importUnits(MultipartFile file, UnitType type) {
        List<OrgUnitResponse> responses = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .build()
                     .parse(reader)) {

            int rowCount = 0;
            for (CSVRecord record : parser) {
                rowCount++;
                if (rowCount > MAX_ROWS) {
                    break;
                }
                String name = value(record, "name");
                if (name.isBlank()) {
                    continue;
                }
                boolean active = parseActive(value(record, "active"));
                responses.add(saveUnit(name, active, type));
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read CSV file", ex);
        }
        return responses;
    }

    private OrgUnitResponse saveUnit(String name, boolean active, UnitType type) {
        return switch (type) {
            case DEPARTMENT -> {
                Department department = new Department();
                department.setOrg(orgService.getOrCreateOrg());
                department.setName(name.trim());
                department.setActive(active);
                yield toResponse(departmentRepository.save(department));
            }
            case DESIGNATION -> {
                Designation designation = new Designation();
                designation.setOrg(orgService.getOrCreateOrg());
                designation.setName(name.trim());
                designation.setActive(active);
                yield toResponse(designationRepository.save(designation));
            }
            case LOCATION -> {
                Location location = new Location();
                location.setOrg(orgService.getOrCreateOrg());
                location.setName(name.trim());
                location.setActive(active);
                yield toResponse(locationRepository.save(location));
            }
        };
    }

    private OrgUnitResponse toResponse(Department department) {
        return OrgUnitResponse.builder()
                .id(department.getId())
                .name(department.getName())
                .active(department.isActive())
                .build();
    }

    private OrgUnitResponse toResponse(Designation designation) {
        return OrgUnitResponse.builder()
                .id(designation.getId())
                .name(designation.getName())
                .active(designation.isActive())
                .build();
    }

    private OrgUnitResponse toResponse(Location location) {
        return OrgUnitResponse.builder()
                .id(location.getId())
                .name(location.getName())
                .active(location.isActive())
                .build();
    }

    private boolean parseActive(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.equalsIgnoreCase("true") || value.equalsIgnoreCase("yes") || value.equals("1");
    }

    private String value(CSVRecord record, String header) {
        return record.isMapped(header) ? record.get(header).trim() : "";
    }

    private enum UnitType {
        DEPARTMENT,
        DESIGNATION,
        LOCATION
    }
}
