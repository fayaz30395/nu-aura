package com.nulogic.hrms.employee;

import com.nulogic.hrms.config.HrmsProperties;
import com.nulogic.hrms.employee.dto.EmployeeImportError;
import com.nulogic.hrms.employee.dto.EmployeeImportResult;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Department;
import com.nulogic.hrms.org.DepartmentRepository;
import com.nulogic.hrms.org.Designation;
import com.nulogic.hrms.org.DesignationRepository;
import com.nulogic.hrms.org.Location;
import com.nulogic.hrms.org.LocationRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EmployeeImportService {
    private static final int MAX_ROWS = 500;

    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final HrmsProperties properties;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final LocationRepository locationRepository;

    public EmployeeImportService(AuthorizationService authorizationService,
                                 OrgService orgService,
                                 HrmsProperties properties,
                                 EmployeeRepository employeeRepository,
                                 DepartmentRepository departmentRepository,
                                 DesignationRepository designationRepository,
                                 LocationRepository locationRepository) {
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.properties = properties;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
        this.locationRepository = locationRepository;
    }

    @Transactional
    public EmployeeImportResult importEmployees(UUID userId, MultipartFile file) {
        authorizationService.checkPermission(userId, "EMP", "CREATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();

        Map<String, Department> departments = loadDepartments(org.getId());
        Map<String, Designation> designations = loadDesignations(org.getId());
        Map<String, Location> locations = loadLocations(org.getId());

        List<EmployeeImportError> errors = new ArrayList<>();
        int successCount = 0;

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
                    errors.add(EmployeeImportError.builder()
                            .rowNumber(Math.toIntExact(record.getRecordNumber()))
                            .message("Row limit exceeded (max 500)")
                            .build());
                    break;
                }

                try {
                    String employeeCode = value(record, "employee_code");
                    String email = value(record, "official_email").toLowerCase();
                    String firstName = value(record, "first_name");
                    String lastName = value(record, "last_name");
                    String phone = value(record, "phone");
                    String managerEmail = value(record, "manager_email");
                    String departmentName = value(record, "department");
                    String designationName = value(record, "designation");
                    String locationName = value(record, "location");
                    String joinDateValue = value(record, "join_date");

                    if (employeeCode.isBlank() || email.isBlank() || firstName.isBlank() || lastName.isBlank()) {
                        throw new IllegalArgumentException("Missing required fields");
                    }

                    String domain = email.substring(email.indexOf('@') + 1);
                    if (!domain.equalsIgnoreCase(properties.getOrg().getDomain())) {
                        throw new IllegalArgumentException("Email must be in organization domain");
                    }

                    LocalDate joinDate = joinDateValue.isBlank() ? null : LocalDate.parse(joinDateValue);

                    Department department = resolveOrgUnit(departments, departmentName, "Department");
                    Designation designation = resolveOrgUnit(designations, designationName, "Designation");
                    Location location = resolveOrgUnit(locations, locationName, "Location");

                    Employee byEmail = employeeRepository.findByOrg_IdAndOfficialEmail(org.getId(), email).orElse(null);
                    Employee byCode = employeeRepository.findByOrg_IdAndEmployeeCode(org.getId(), employeeCode).orElse(null);

                    if (byEmail != null && byCode != null && !byEmail.getId().equals(byCode.getId())) {
                        throw new IllegalArgumentException("Email and employee code map to different employees");
                    }

                    Employee target = byEmail != null ? byEmail : byCode;
                    if (target != null) {
                        if (!target.getEmployeeCode().equals(employeeCode)) {
                            throw new IllegalArgumentException("Employee code conflict for existing email");
                        }
                        if (!target.getOfficialEmail().equalsIgnoreCase(email)) {
                            throw new IllegalArgumentException("Email conflict for existing employee code");
                        }
                    } else {
                        target = new Employee();
                        target.setOrg(org);
                        target.setEmployeeCode(employeeCode);
                        target.setOfficialEmail(email);
                        target.setStatus(EmployeeStatus.PENDING);
                    }

                    if (managerEmail != null && !managerEmail.isBlank()) {
                        Employee manager = employeeRepository.findByOrg_IdAndOfficialEmail(org.getId(), managerEmail)
                                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
                        target.setManager(manager);
                    }

                    target.setFirstName(firstName);
                    target.setLastName(lastName);
                    target.setPhone(phone);
                    target.setDepartmentId(department != null ? department.getId() : null);
                    target.setDesignationId(designation != null ? designation.getId() : null);
                    target.setLocationId(location != null ? location.getId() : null);
                    if (joinDate != null) {
                        target.setJoinDate(joinDate);
                    }

                    employeeRepository.save(target);
                    successCount++;
                } catch (Exception ex) {
                    errors.add(EmployeeImportError.builder()
                            .rowNumber(Math.toIntExact(record.getRecordNumber()))
                            .message(ex.getMessage())
                            .build());
                }
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read CSV file", ex);
        }

        return EmployeeImportResult.builder()
                .successCount(successCount)
                .failureCount(errors.size())
                .errors(errors)
                .build();
    }

    private Map<String, Department> loadDepartments(UUID orgId) {
        Map<String, Department> map = new HashMap<>();
        for (Department dept : departmentRepository.findByOrg_Id(orgId)) {
            map.put(dept.getName().toLowerCase(), dept);
        }
        return map;
    }

    private Map<String, Designation> loadDesignations(UUID orgId) {
        Map<String, Designation> map = new HashMap<>();
        for (Designation designation : designationRepository.findByOrg_Id(orgId)) {
            map.put(designation.getName().toLowerCase(), designation);
        }
        return map;
    }

    private Map<String, Location> loadLocations(UUID orgId) {
        Map<String, Location> map = new HashMap<>();
        for (Location location : locationRepository.findByOrg_Id(orgId)) {
            map.put(location.getName().toLowerCase(), location);
        }
        return map;
    }

    private String value(CSVRecord record, String header) {
        return record.isMapped(header) ? record.get(header).trim() : "";
    }

    private <T> T resolveOrgUnit(Map<String, T> map, String name, String label) {
        if (name == null || name.isBlank()) {
            return null;
        }
        T value = map.get(name.toLowerCase());
        if (value == null) {
            throw new IllegalArgumentException(label + " not found: " + name);
        }
        return value;
    }
}
