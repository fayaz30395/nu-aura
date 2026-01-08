package com.nulogic.hrms.employee;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.employee.dto.EmployeeCreateRequest;
import com.nulogic.hrms.employee.dto.EmployeeImportResult;
import com.nulogic.hrms.employee.dto.EmployeeResponse;
import com.nulogic.hrms.employee.dto.EmployeeSelfUpdateRequest;
import com.nulogic.hrms.employee.dto.EmployeeUpdateRequest;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {
    private final EmployeeService employeeService;
    private final EmployeeImportService employeeImportService;

    public EmployeeController(EmployeeService employeeService, EmployeeImportService employeeImportService) {
        this.employeeService = employeeService;
        this.employeeImportService = employeeImportService;
    }

    @GetMapping
    public ResponseEntity<Page<EmployeeResponse>> list(@PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(employeeService.list(userId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponse> getById(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(employeeService.getById(userId, id));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(employeeService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponse> update(@PathVariable UUID id,
                                                   @Valid @RequestBody EmployeeUpdateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(employeeService.update(userId, id, request));
    }

    @PatchMapping("/me")
    public ResponseEntity<EmployeeResponse> updateSelf(@Valid @RequestBody EmployeeSelfUpdateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(employeeService.updateSelf(userId, request));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EmployeeImportResult> importEmployees(@RequestParam("file") MultipartFile file) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(employeeImportService.importEmployees(userId, file));
    }

    @GetMapping("/import/template")
    public ResponseEntity<ByteArrayResource> template() {
        String header = "employee_code,official_email,first_name,last_name,phone,manager_email,department,designation,location,join_date\n";
        ByteArrayResource resource = new ByteArrayResource(header.getBytes(StandardCharsets.UTF_8));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee_import_template.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(resource);
    }
}
