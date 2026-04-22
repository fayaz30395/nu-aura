package com.hrms.application.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.platform.service.HrmsPermissionInitializer;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.domain.auth.SamlIdentityProvider;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.platform.UserAppAccess;
import com.hrms.domain.user.*;
import com.hrms.infrastructure.auth.repository.SamlIdentityProviderRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.platform.repository.UserAppAccessRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handles SAML 2.0 authentication responses — user provisioning, linking, and JWT issuance.
 *
 * <p>After the IdP redirects back with a SAML assertion, this service:
 * <ol>
 *   <li>Extracts user attributes from the SAML assertion</li>
 *   <li>Maps SAML attributes to NU-AURA user fields using tenant's attribute mapping</li>
 *   <li>Provisions a new user or links to an existing one</li>
 *   <li>Issues a JWT token for the authenticated session</li>
 * </ol></p>
 */
@Service
@Slf4j
public class SamlAuthenticationHandler {

    private final SamlIdentityProviderRepository samlIdpRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final UserAppAccessRepository userAppAccessRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public SamlAuthenticationHandler(SamlIdentityProviderRepository samlIdpRepository,
                                     UserRepository userRepository,
                                     EmployeeRepository employeeRepository,
                                     RoleRepository roleRepository,
                                     UserAppAccessRepository userAppAccessRepository,
                                     JwtTokenProvider tokenProvider,
                                     @Lazy PasswordEncoder passwordEncoder,
                                     ObjectMapper objectMapper) {
        this.samlIdpRepository = samlIdpRepository;
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.roleRepository = roleRepository;
        this.userAppAccessRepository = userAppAccessRepository;
        this.tokenProvider = tokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    /**
     * Map SAML assertion attributes to user fields using the tenant's attribute mapping.
     *
     * @param attributes  raw SAML attributes from the assertion (attribute name -> first value)
     * @param mappingJson JSON attribute mapping from the SamlIdentityProvider config
     * @return mapped user attributes
     */
    public SamlUserAttributes mapSamlAttributesToUser(Map<String, String> attributes, String mappingJson) {
        if (mappingJson == null || mappingJson.isBlank()) {
            // Default attribute names (common SAML attributes)
            return new SamlUserAttributes(
                    findAttribute(attributes, "email", "urn:oid:0.9.2342.19200300.100.1.3",
                            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"),
                    findAttribute(attributes, "firstName", "urn:oid:2.5.4.42",
                            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"),
                    findAttribute(attributes, "lastName", "urn:oid:2.5.4.4",
                            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"),
                    attributes.get("employeeId"),
                    attributes.get("department")
            );
        }

        try {
            JsonNode mapping = objectMapper.readTree(mappingJson);
            return new SamlUserAttributes(
                    getAttributeByMapping(attributes, mapping, "email"),
                    getAttributeByMapping(attributes, mapping, "firstName"),
                    getAttributeByMapping(attributes, mapping, "lastName"),
                    getAttributeByMapping(attributes, mapping, "employeeId"),
                    getAttributeByMapping(attributes, mapping, "department")
            );
        } catch (Exception e) { // Intentional broad catch — authentication error boundary
            log.error("Failed to parse attribute mapping JSON, using defaults", e);
            return new SamlUserAttributes(
                    attributes.get("email"),
                    attributes.get("firstName"),
                    attributes.get("lastName"),
                    attributes.get("employeeId"),
                    attributes.get("department")
            );
        }
    }

    /**
     * Provision a new user or link to an existing one after SAML authentication.
     *
     * @param tenantId       the tenant this SAML login belongs to
     * @param samlAttributes extracted and mapped user attributes
     * @return the User entity (existing or newly created)
     */
    @Transactional
    public User provisionOrLinkUser(UUID tenantId, SamlUserAttributes samlAttributes) {
        if (samlAttributes.email() == null || samlAttributes.email().isBlank()) {
            throw new com.hrms.common.exception.AuthenticationException("SAML assertion missing email attribute");
        }

        // Try to find existing user by email + tenant
        Optional<User> existingUser = userRepository.findByEmailAndTenantId(samlAttributes.email(), tenantId);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            // Link existing user to SAML auth provider if not already
            if (user.getAuthProvider() != AuthProvider.SAML) {
                user.setAuthProvider(AuthProvider.SAML);
                log.info("Linked existing user {} to SAML auth provider for tenant {}", user.getEmail(), tenantId);
            }
            user.recordSuccessfulLogin();
            return userRepository.save(user);
        }

        // Check if auto-provisioning is enabled for this tenant
        SamlIdentityProvider idp = samlIdpRepository.findActiveByTenantId(tenantId)
                .orElseThrow(() -> new com.hrms.common.exception.AuthenticationException(
                        "No active SAML configuration for tenant " + tenantId));

        if (!Boolean.TRUE.equals(idp.getAutoProvisionUsers())) {
            throw new com.hrms.common.exception.AuthenticationException(
                    "User " + samlAttributes.email() + " does not exist and auto-provisioning is disabled. " +
                            "Contact your HR administrator to create your account.");
        }

        // Auto-provision new user
        User newUser = User.builder()
                .tenantId(tenantId)
                .email(samlAttributes.email())
                .firstName(samlAttributes.firstName() != null ? samlAttributes.firstName() : "SAML User")
                .lastName(samlAttributes.lastName())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString())) // Random password (SAML users won't use it)
                .status(User.UserStatus.ACTIVE)
                .authProvider(AuthProvider.SAML)
                .lastLoginAt(LocalDateTime.now())
                .mfaEnabled(false)
                .build();

        // Assign default role if configured
        if (idp.getDefaultRoleId() != null) {
            roleRepository.findById(idp.getDefaultRoleId()).ifPresent(role -> {
                newUser.getRoles().add(role);
            });
        }

        User savedUser = userRepository.save(newUser);
        log.info("Auto-provisioned SAML user {} for tenant {} with auth provider SAML", savedUser.getEmail(), tenantId);

        return savedUser;
    }

    /**
     * Generate a JWT token for a SAML-authenticated user.
     * Follows the same pattern as AuthService.login() for consistency.
     */
    @Transactional(readOnly = true)
    public String generateJwtFromSamlAuth(User user) {
        UUID tenantId = user.getTenantId();

        // Load employee context
        Optional<Employee> empOpt = employeeRepository.findByUserIdWithUser(user.getId(), tenantId);

        // Load app permissions and roles
        userAppAccessRepository
                .findByUserIdAndAppCodeWithPermissions(user.getId(), HrmsPermissionInitializer.APP_CODE);

        Set<String> appRoles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        // Build accessible apps list (lightweight projection — codes only)
        List<String> appCodes = userAppAccessRepository.findActiveApplicationCodesByUserId(user.getId());
        Set<String> accessibleApps = new HashSet<>(appCodes);

        UUID employeeId = empOpt.map(Employee::getId).orElse(null);
        UUID locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
        UUID departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
        UUID teamId = empOpt.map(Employee::getTeamId).orElse(null);

        // Use empty permissions map — permissions loaded from DB via JwtAuthenticationFilter (CRIT-001)
        Map<String, RoleScope> appPermissions = Collections.emptyMap();

        return tokenProvider.generateTokenWithAppPermissions(
                user, tenantId, HrmsPermissionInitializer.APP_CODE,
                appPermissions, appRoles, accessibleApps,
                employeeId, locationId, departmentId, teamId);
    }

    /**
     * Find an attribute value by trying multiple possible attribute names.
     */
    private String findAttribute(Map<String, String> attributes, String... possibleNames) {
        for (String name : possibleNames) {
            String value = attributes.get(name);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    // ==================== Private Helpers ====================

    /**
     * Get an attribute value using the configured mapping.
     */
    private String getAttributeByMapping(Map<String, String> attributes, JsonNode mapping, String field) {
        JsonNode node = mapping.get(field);
        if (node != null && node.isTextual()) {
            String mappedAttrName = node.asText();
            return attributes.get(mappedAttrName);
        }
        // Fallback: try the field name directly
        return attributes.get(field);
    }

    /**
     * DTO for SAML-extracted user attributes.
     */
    public record SamlUserAttributes(
            String email,
            String firstName,
            String lastName,
            String employeeId,
            String department
    ) {
    }
}
