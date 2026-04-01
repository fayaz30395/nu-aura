package com.hrms.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for SAML IdP connection test results.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SamlTestConnectionResponse {

    private boolean success;
    private String message;
    private String idpEntityId;
    private String ssoUrl;
    private boolean metadataReachable;
    private boolean certificateValid;
    private String certificateExpiry;
}
