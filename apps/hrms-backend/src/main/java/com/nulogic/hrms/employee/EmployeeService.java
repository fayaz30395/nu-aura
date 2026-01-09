package com.nulogic.hrms.employee;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.hrms.config.HrmsProperties;
import com.nulogic.hrms.employee.dto.EmployeeCreateRequest;
import com.nulogic.hrms.employee.dto.EmployeeResponse;
import com.nulogic.hrms.employee.dto.EmployeeSelfUpdateRequest;
import com.nulogic.hrms.employee.dto.EmployeeUpdateRequest;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final HrmsProperties properties;
    private final ObjectMapper objectMapper;

    public EmployeeService(EmployeeRepository employeeRepository,
                           AuthorizationService authorizationService,
                           OrgService orgService,
                           HrmsProperties properties,
                           ObjectMapper objectMapper) {
        this.employeeRepository = employeeRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> list(UUID userId, String search, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "EMP", "VIEW");
        Org org = orgService.getOrCreateOrg();
        String searchTerm = normalizeSearch(search);
        return switch (scope) {
            case ORG -> searchTerm == null
                    ? employeeRepository.findByOrg_Id(org.getId(), pageable).map(this::toResponse)
                    : employeeRepository.searchForOrgScope(org.getId(), searchTerm, pageable).map(this::toResponse);
            case DEPARTMENT -> {
                Employee self = getCurrentEmployee(userId, org);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield searchTerm == null
                        ? employeeRepository.findByOrg_IdAndDepartmentId(org.getId(), self.getDepartmentId(), pageable)
                            .map(this::toResponse)
                        : employeeRepository.searchForDepartmentScope(org.getId(), self.getDepartmentId(), searchTerm, pageable)
                            .map(this::toResponse);
            }
            case TEAM -> {
                Employee self = getCurrentEmployee(userId, org);
                yield searchTerm == null
                        ? employeeRepository.findByOrg_IdAndManager_Id(org.getId(), self.getId(), pageable)
                            .map(this::toResponse)
                        : employeeRepository.searchForTeamScope(org.getId(), self.getId(), searchTerm, pageable)
                            .map(this::toResponse);
            }
            case SELF -> searchTerm == null
                    ? employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId, pageable)
                        .map(this::toResponse)
                    : employeeRepository.searchForSelfScope(org.getId(), userId, searchTerm, pageable)
                        .map(this::toResponse);
        };
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getById(UUID userId, UUID employeeId) {
        Org org = orgService.getOrCreateOrg();
        Employee target = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        ensureOrg(target, org);
        ensureEmployeeAccess(userId, target, org);
        return toResponse(target);
    }

    @Transactional
    public EmployeeResponse create(UUID userId, EmployeeCreateRequest request) {
        authorizationService.checkPermission(userId, "EMP", "CREATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();

        String email = request.getOfficialEmail().trim().toLowerCase();
        String domain = email.substring(email.indexOf('@') + 1);
        if (!domain.equalsIgnoreCase(properties.getOrg().getDomain())) {
            throw new IllegalArgumentException("Email must be in organization domain");
        }

        employeeRepository.findByOrg_IdAndOfficialEmail(org.getId(), email)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Employee with email already exists");
                });
        employeeRepository.findByOrg_IdAndEmployeeCode(org.getId(), request.getEmployeeCode().trim())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Employee code already exists");
                });

        Employee employee = new Employee();
        employee.setOrg(org);
        employee.setEmployeeCode(request.getEmployeeCode().trim());
        employee.setOfficialEmail(email);
        employee.setFirstName(request.getFirstName().trim());
        employee.setLastName(request.getLastName().trim());
        employee.setPhone(request.getPhone());
        employee.setStatus(EmployeeStatus.PENDING);
        employee.setManager(resolveManager(org, request.getManagerId()));
        employee.setDepartmentId(request.getDepartmentId());
        employee.setDesignationId(request.getDesignationId());
        employee.setLocationId(request.getLocationId());
        employee.setJoinDate(request.getJoinDate());

        return toResponse(employeeRepository.save(employee));
    }

    @Transactional
    public EmployeeResponse update(UUID userId, UUID employeeId, EmployeeUpdateRequest request) {
        authorizationService.checkPermission(userId, "EMP", "UPDATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        ensureOrg(employee, org);

        if (request.getManagerId() != null && request.getManagerId().equals(employee.getId())) {
            throw new IllegalArgumentException("Employee cannot report to self");
        }

        employee.setFirstName(request.getFirstName().trim());
        employee.setLastName(request.getLastName().trim());
        employee.setPhone(request.getPhone());
        employee.setManager(resolveManager(org, request.getManagerId()));
        employee.setDepartmentId(request.getDepartmentId());
        employee.setDesignationId(request.getDesignationId());
        employee.setLocationId(request.getLocationId());
        if (request.getJoinDate() != null) {
            employee.setJoinDate(request.getJoinDate());
        }

        return toResponse(employeeRepository.save(employee));
    }

    @Transactional
    public EmployeeResponse updateSelf(UUID userId, EmployeeSelfUpdateRequest request) {
        authorizationService.resolveScope(userId, "EMP", "UPDATE");
        Org org = orgService.getOrCreateOrg();
        Employee employee = getCurrentEmployee(userId, org);

        employee.setPhone(request.getPhone());
        employee.setCurrentAddress(request.getCurrentAddress());
        employee.setPermanentAddress(request.getPermanentAddress());
        employee.setProfilePhotoUrl(request.getProfilePhotoUrl());
        if (request.getEmergencyContacts() != null) {
            employee.setEmergencyContacts(serializeEmergencyContacts(request));
        }

        return toResponse(employeeRepository.save(employee));
    }

    private String serializeEmergencyContacts(EmployeeSelfUpdateRequest request) {
        try {
            return objectMapper.writeValueAsString(request.getEmergencyContacts());
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid emergency contact data");
        }
    }

    private String normalizeSearch(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return "%" + trimmed.toLowerCase() + "%";
    }

    private void ensureEmployeeAccess(UUID userId, Employee target, Org org) {
        PermissionScope scope = authorizationService.resolveScope(userId, "EMP", "VIEW");
        if (scope == PermissionScope.ORG) {
            return;
        }
        Employee self = getCurrentEmployee(userId, org);
        switch (scope) {
            case SELF -> {
                if (target.getUser() == null || !target.getUser().getId().equals(userId)) {
                    throw new IllegalArgumentException("Employee not found");
                }
            }
            case TEAM -> {
                if (target.getManager() == null || !target.getManager().getId().equals(self.getId())) {
                    throw new IllegalArgumentException("Employee not found");
                }
            }
            case DEPARTMENT -> {
                if (self.getDepartmentId() == null || target.getDepartmentId() == null
                        || !self.getDepartmentId().equals(target.getDepartmentId())) {
                    throw new IllegalArgumentException("Employee not found");
                }
            }
            default -> throw new IllegalArgumentException("Employee not found");
        }
    }

    private Employee resolveManager(Org org, UUID managerId) {
        if (managerId == null) {
            return null;
        }
        Employee manager = employeeRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
        ensureOrg(manager, org);
        return manager;
    }

    private Employee getCurrentEmployee(UUID userId, Org org) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
    }

    private void ensureOrg(Employee employee, Org org) {
        if (!employee.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("Employee not found");
        }
    }

    private EmployeeResponse toResponse(Employee employee) {
        return EmployeeResponse.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .officialEmail(employee.getOfficialEmail())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .phone(employee.getPhone())
                .managerId(employee.getManager() != null ? employee.getManager().getId() : null)
                .departmentId(employee.getDepartmentId())
                .designationId(employee.getDesignationId())
                .locationId(employee.getLocationId())
                .joinDate(employee.getJoinDate())
                .status(employee.getStatus().name())
                .currentAddress(employee.getCurrentAddress())
                .permanentAddress(employee.getPermanentAddress())
                .emergencyContacts(employee.getEmergencyContacts())
                .profilePhotoUrl(employee.getProfilePhotoUrl())
                .build();
    }
}
