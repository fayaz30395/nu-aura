package com.hrms.application.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.dto.SamlConfigRequest;
import com.hrms.api.auth.dto.SamlConfigResponse;
import com.hrms.api.auth.dto.SamlTestConnectionResponse;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.EncryptionService;
import com.hrms.domain.auth.SamlIdentityProvider;
import com.hrms.domain.user.Role;
import com.hrms.infrastructure.auth.repository.SamlIdentityProviderRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.MessageDigest;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing SAML 2.0 Identity Provider configurations.
 *
 * <p>Handles CRUD operations for per-tenant SAML IdP settings, certificate
 * management (encrypted at rest), metadata parsing, and SP metadata generation.</p>
 */
@Service
@Slf4j
public class SamlConfigurationService {

    private final SamlIdentityProviderRepository samlIdpRepository;
    private final RoleRepository roleRepository;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    public SamlConfigurationService(SamlIdentityProviderRepository samlIdpRepository,
                                    RoleRepository roleRepository,
                                    EncryptionService encryptionService,
                                    ObjectMapper objectMapper) {
        this.samlIdpRepository = samlIdpRepository;
        this.roleRepository = roleRepository;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
    }

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // ==================== CRUD Operations ====================

    @Transactional
    public SamlConfigResponse configureSamlProvider(UUID tenantId, SamlConfigRequest request) {
        // Check if tenant already has a config
        if (samlIdpRepository.existsByTenantIdAndIsDeletedFalse(tenantId)) {
            throw new BusinessException("SAML configuration already exists for this tenant. Use update instead.");
        }

        validateRequest(request);

        SamlIdentityProvider idp = SamlIdentityProvider.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .entityId(request.getEntityId())
                .ssoUrl(request.getSsoUrl())
                .sloUrl(request.getSloUrl())
                .certificate(encryptCertificate(request.getCertificate()))
                .metadataUrl(request.getMetadataUrl())
                .isActive(request.getIsActive() != null ? request.getIsActive() : false)
                .autoProvisionUsers(request.getAutoProvisionUsers() != null ? request.getAutoProvisionUsers() : false)
                .defaultRoleId(request.getDefaultRoleId())
                .attributeMapping(request.getAttributeMapping())
                .spEntityId(request.getSpEntityId())
                .build();

        SamlIdentityProvider saved = samlIdpRepository.save(idp);
        log.info("SAML IdP configured for tenant {}: {} (entityId={})", tenantId, saved.getName(), saved.getEntityId());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SamlConfigResponse getSamlConfig(UUID tenantId) {
        SamlIdentityProvider idp = samlIdpRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("SamlIdentityProvider", "tenantId", tenantId.toString()));
        return toResponse(idp);
    }

    @Transactional(readOnly = true)
    public Optional<SamlConfigResponse> getSamlConfigOptional(UUID tenantId) {
        return samlIdpRepository.findByTenantId(tenantId).map(this::toResponse);
    }

    @Transactional
    public SamlConfigResponse updateSamlConfig(UUID tenantId, SamlConfigRequest request) {
        SamlIdentityProvider idp = samlIdpRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("SamlIdentityProvider", "tenantId", tenantId.toString()));

        validateRequest(request);

        idp.setName(request.getName());
        idp.setEntityId(request.getEntityId());
        idp.setSsoUrl(request.getSsoUrl());
        idp.setSloUrl(request.getSloUrl());
        idp.setMetadataUrl(request.getMetadataUrl());
        idp.setIsActive(request.getIsActive() != null ? request.getIsActive() : idp.getIsActive());
        idp.setAutoProvisionUsers(request.getAutoProvisionUsers() != null ? request.getAutoProvisionUsers() : idp.getAutoProvisionUsers());
        idp.setDefaultRoleId(request.getDefaultRoleId());
        idp.setAttributeMapping(request.getAttributeMapping());
        idp.setSpEntityId(request.getSpEntityId());

        // Only update certificate if a new one is provided
        if (request.getCertificate() != null && !request.getCertificate().isBlank()) {
            idp.setCertificate(encryptCertificate(request.getCertificate()));
        }

        SamlIdentityProvider saved = samlIdpRepository.save(idp);
        log.info("SAML IdP updated for tenant {}: {}", tenantId, saved.getName());

        return toResponse(saved);
    }

    @Transactional
    public void deleteSamlConfig(UUID tenantId) {
        SamlIdentityProvider idp = samlIdpRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("SamlIdentityProvider", "tenantId", tenantId.toString()));

        idp.softDelete();
        samlIdpRepository.save(idp);
        log.info("SAML IdP soft-deleted for tenant {}", tenantId);
    }

    // ==================== Connection Testing ====================

    public SamlTestConnectionResponse testConnection(UUID tenantId) {
        SamlIdentityProvider idp = samlIdpRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("SamlIdentityProvider", "tenantId", tenantId.toString()));

        SamlTestConnectionResponse.SamlTestConnectionResponseBuilder response = SamlTestConnectionResponse.builder()
                .idpEntityId(idp.getEntityId())
                .ssoUrl(idp.getSsoUrl());

        // Test metadata URL reachability
        boolean metadataReachable = false;
        if (idp.getMetadataUrl() != null && !idp.getMetadataUrl().isBlank()) {
            metadataReachable = testMetadataUrl(idp.getMetadataUrl());
        }
        response.metadataReachable(metadataReachable);

        // Validate certificate
        boolean certValid = false;
        String certExpiry = null;
        if (idp.getCertificate() != null && !idp.getCertificate().isBlank()) {
            try {
                String decryptedCert = encryptionService.decrypt(idp.getCertificate());
                X509Certificate x509 = parseCertificate(decryptedCert);
                x509.checkValidity();
                certValid = true;
                certExpiry = x509.getNotAfter().toInstant()
                        .atZone(ZoneId.systemDefault())
                        .toLocalDateTime().toString();
            } catch (Exception e) { // Intentional broad catch — authentication error boundary
                log.warn("Certificate validation failed for tenant {}: {}", tenantId, e.getMessage());
            }
        }
        response.certificateValid(certValid);
        response.certificateExpiry(certExpiry);

        boolean overallSuccess = certValid && (idp.getMetadataUrl() == null || idp.getMetadataUrl().isBlank() || metadataReachable);
        response.success(overallSuccess);
        response.message(overallSuccess ? "Connection test successful" : buildFailureMessage(certValid, metadataReachable, idp.getMetadataUrl()));

        return response.build();
    }

    // ==================== SP Metadata Generation ====================

    /**
     * Generate SP (Service Provider) metadata XML for the tenant's IdP configuration.
     * This XML is provided to the IdP administrator to complete the SSO setup.
     */
    public String generateServiceProviderMetadata(UUID tenantId) {
        SamlIdentityProvider idp = samlIdpRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("SamlIdentityProvider", "tenantId", tenantId.toString()));

        String registrationId = tenantId.toString();
        String spEntityId = idp.getSpEntityId() != null ? idp.getSpEntityId()
                : appBaseUrl + "/saml2/service-provider-metadata/" + registrationId;
        String acsUrl = appBaseUrl + "/login/saml2/sso/" + registrationId;
        String sloResponseUrl = appBaseUrl + "/logout/saml2/slo";

        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                                     entityID="%s">
                    <md:SPSSODescriptor AuthnRequestsSigned="false"
                                        WantAssertionsSigned="true"
                                        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
                        <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
                        <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                                     Location="%s"
                                                     index="0"
                                                     isDefault="true"/>
                        <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                                Location="%s"/>
                    </md:SPSSODescriptor>
                </md:EntityDescriptor>
                """.formatted(spEntityId, acsUrl, sloResponseUrl);
    }

    // ==================== Provider Listing (SuperAdmin) ====================

    @Transactional(readOnly = true)
    public List<SamlConfigResponse> getAllProviders() {
        return samlIdpRepository.findAllProviders().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SamlIdentityProvider> getAllActiveProviders() {
        return samlIdpRepository.findAllActive();
    }

    // ==================== Internal Helpers ====================

    private void validateRequest(SamlConfigRequest request) {
        // Validate SSO URL format
        try {
            URI.create(request.getSsoUrl());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid SSO URL format: " + request.getSsoUrl());
        }

        // Validate SLO URL format if provided
        if (request.getSloUrl() != null && !request.getSloUrl().isBlank()) {
            try {
                URI.create(request.getSloUrl());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Invalid SLO URL format: " + request.getSloUrl());
            }
        }

        // Validate metadata URL format if provided
        if (request.getMetadataUrl() != null && !request.getMetadataUrl().isBlank()) {
            try {
                URI.create(request.getMetadataUrl());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Invalid metadata URL format: " + request.getMetadataUrl());
            }
        }

        // Validate certificate if provided
        if (request.getCertificate() != null && !request.getCertificate().isBlank()) {
            try {
                parseCertificate(request.getCertificate());
            } catch (Exception e) { // Intentional broad catch — authentication error boundary
                throw new BusinessException("Invalid X.509 certificate: " + e.getMessage());
            }
        }

        // Validate attribute mapping JSON if provided
        if (request.getAttributeMapping() != null && !request.getAttributeMapping().isBlank()) {
            try {
                objectMapper.readTree(request.getAttributeMapping());
            } catch (Exception e) { // Intentional broad catch — authentication error boundary
                throw new BusinessException("Invalid attribute mapping JSON: " + e.getMessage());
            }
        }

        // Validate default role exists if provided
        if (request.getDefaultRoleId() != null) {
            if (!roleRepository.existsById(request.getDefaultRoleId())) {
                throw new BusinessException("Default role not found: " + request.getDefaultRoleId());
            }
        }
    }

    private String encryptCertificate(String certificate) {
        if (certificate == null || certificate.isBlank()) {
            return null;
        }
        return encryptionService.encrypt(certificate);
    }

    private X509Certificate parseCertificate(String pemCertificate) throws Exception {
        String cleaned = pemCertificate
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll("\\s+", "");

        byte[] decoded = Base64.getDecoder().decode(cleaned);
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(decoded));
    }

    private String computeCertificateFingerprint(String encryptedCert) {
        if (encryptedCert == null || encryptedCert.isBlank()) {
            return null;
        }
        try {
            String decrypted = encryptionService.decrypt(encryptedCert);
            X509Certificate cert = parseCertificate(decrypted);
            byte[] encoded = cert.getEncoded();
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(encoded);
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < digest.length; i++) {
                if (i > 0) sb.append(':');
                sb.append(String.format("%02X", digest[i]));
            }
            return sb.toString();
        } catch (Exception e) { // Intentional broad catch — authentication error boundary
            log.warn("Failed to compute certificate fingerprint: {}", e.getMessage());
            return "Unable to compute";
        }
    }

    private boolean testMetadataUrl(String metadataUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(metadataUrl))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            boolean reachable = response.statusCode() == 200 && response.body().contains("EntityDescriptor");
            if (!reachable) {
                log.warn("Metadata URL returned status {} or invalid content for {}", response.statusCode(), metadataUrl);
            }
            return reachable;
        } catch (Exception e) { // Intentional broad catch — authentication error boundary
            log.warn("Metadata URL unreachable: {} — {}", metadataUrl, e.getMessage());
            return false;
        }
    }

    private String buildFailureMessage(boolean certValid, boolean metadataReachable, String metadataUrl) {
        List<String> issues = new ArrayList<>();
        if (!certValid) {
            issues.add("Certificate is invalid or expired");
        }
        if (metadataUrl != null && !metadataUrl.isBlank() && !metadataReachable) {
            issues.add("Metadata URL is unreachable");
        }
        return "Connection test failed: " + String.join("; ", issues);
    }

    private SamlConfigResponse toResponse(SamlIdentityProvider idp) {
        String roleName = null;
        if (idp.getDefaultRoleId() != null) {
            roleName = roleRepository.findById(idp.getDefaultRoleId())
                    .map(Role::getName)
                    .orElse(null);
        }

        return SamlConfigResponse.builder()
                .id(idp.getId())
                .tenantId(idp.getTenantId())
                .name(idp.getName())
                .entityId(idp.getEntityId())
                .ssoUrl(idp.getSsoUrl())
                .sloUrl(idp.getSloUrl())
                .hasCertificate(idp.getCertificate() != null && !idp.getCertificate().isBlank())
                .certificateFingerprint(computeCertificateFingerprint(idp.getCertificate()))
                .metadataUrl(idp.getMetadataUrl())
                .isActive(idp.getIsActive())
                .autoProvisionUsers(idp.getAutoProvisionUsers())
                .defaultRoleId(idp.getDefaultRoleId())
                .defaultRoleName(roleName)
                .attributeMapping(idp.getAttributeMapping())
                .spEntityId(idp.getSpEntityId())
                .createdAt(idp.getCreatedAt())
                .updatedAt(idp.getUpdatedAt())
                .build();
    }
}
