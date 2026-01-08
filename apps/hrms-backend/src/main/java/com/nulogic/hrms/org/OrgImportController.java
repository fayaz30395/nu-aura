package com.nulogic.hrms.org;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.org.dto.OrgUnitResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/org/import")
public class OrgImportController {
    private final OrgImportService orgImportService;

    public OrgImportController(OrgImportService orgImportService) {
        this.orgImportService = orgImportService;
    }

    @PostMapping("/departments")
    public ResponseEntity<List<OrgUnitResponse>> importDepartments(@RequestParam("file") MultipartFile file) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(orgImportService.importDepartments(userId, file));
    }

    @PostMapping("/designations")
    public ResponseEntity<List<OrgUnitResponse>> importDesignations(@RequestParam("file") MultipartFile file) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(orgImportService.importDesignations(userId, file));
    }

    @PostMapping("/locations")
    public ResponseEntity<List<OrgUnitResponse>> importLocations(@RequestParam("file") MultipartFile file) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(orgImportService.importLocations(userId, file));
    }

    @GetMapping("/template")
    public ResponseEntity<ByteArrayResource> template() {
        String header = "name,active\n";
        ByteArrayResource resource = new ByteArrayResource(header.getBytes(StandardCharsets.UTF_8));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=org_units_template.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(resource);
    }
}
