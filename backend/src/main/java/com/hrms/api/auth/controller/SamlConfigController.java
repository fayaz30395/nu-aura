package com.hrms.api.auth.controller;

import com.hrms.api.auth.dto.SamlConfigRequest;
import com.hrms.api.auth.dto.SamlConfigResponse;
import com.hrms.api.auth.dto.SamlTestConnectionResponse;
import com.hrms.application.auth.service.SamlConfigurationService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for SAML 2.0 SSO configuration management.
 *
 * <p>Allows tenant administrators to configure their SAML Identity Provider,
 * test the connection, and download SP metadata for their IdP setup.</p>
 *
 * <p>All endpoints (except /providers) are tenant-scoped — the tenant is
 * derived from the authenticated user's JWT.</p>
 */
@RestController
@RequestMapping("/api/v1/auth/saml")
@Slf4j
@Tag(name = "SAML SSO Configuration", description = "SAML 2.0 Identity Provider configuration endpoints")
public class SamlConfigController {

    private final SamlConfigurationService samlConfigService;

    public SamlConfigController(SamlConfigurationService samlConfigService) {
        this.samlConfigService = samlConfigService;
    }

    @GetMapping("/config")
    @Operation(summary = "Get SAML configuration",
            description = "Get the SAML IdP configuration for the current tenant")
    public ResponseEntity<SamlConfigResponse> getSamlConfig() {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(samlConfigService.getSamlConfig(tenantId));
    }

    @PostMapping("/config")
    @Operation(summary = "Create SAML configuration",
            description = "Create a new SAML IdP configuration for the current tenant")
    public ResponseEntity<SamlConfigResponse> createSamlConfig(
            @Valid @RequestBody SamlConfigRequest request) {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating SAML config for tenant {} by user {}", tenantId, SecurityContext.getCurrentUserId());

        SamlConfigResponse response = samlConfigService.configureSamlProvider(tenantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/config")
    @Operation(summary = "Update SAML configuration",
            description = "Update the SAML IdP configuration for the current tenant")
    public ResponseEntity<SamlConfigResponse> updateSamlConfig(
            @Valid @RequestBody SamlConfigRequest request) {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating SAML config for tenant {} by user {}", tenantId, SecurityContext.getCurrentUserId());

        SamlConfigResponse response = samlConfigService.updateSamlConfig(tenantId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/config")
    @Operation(summary = "Delete SAML configuration",
            description = "Soft-delete the SAML IdP configuration for the current tenant")
    public ResponseEntity<Void> deleteSamlConfig() {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Deleting SAML config for tenant {} by user {}", tenantId, SecurityContext.getCurrentUserId());

        samlConfigService.deleteSamlConfig(tenantId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/metadata")
    @Operation(summary = "Download SP metadata",
            description = "Generate and download Service Provider metadata XML for the IdP")
    public ResponseEntity<String> getServiceProviderMetadata() {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();

        String metadataXml = samlConfigService.generateServiceProviderMetadata(tenantId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sp-metadata.xml")
                .contentType(MediaType.APPLICATION_XML)
                .body(metadataXml);
    }

    @PostMapping("/test")
    @Operation(summary = "Test IdP connection",
            description = "Validate the SAML IdP configuration by testing metadata URL and certificate")
    public ResponseEntity<SamlTestConnectionResponse> testConnection() {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Testing SAML connection for tenant {}", tenantId);

        SamlTestConnectionResponse response = samlConfigService.testConnection(tenantId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/providers")
    @Operation(summary = "List all SAML providers (SuperAdmin)",
            description = "List all configured SAML IdP providers across all tenants. SuperAdmin only.")
    public ResponseEntity<List<SamlConfigResponse>> getAllProviders() {
        // SuperAdmin bypass is handled by @RequiresPermission or SecurityConfig
        List<SamlConfigResponse> providers = samlConfigService.getAllProviders();
        return ResponseEntity.ok(providers);
    }
}
