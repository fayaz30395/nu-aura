package com.hrms.domain.user;

/**
 * Authentication provider for a user account.
 * Determines how the user authenticates with the system.
 */
public enum AuthProvider {
    /** User authenticates with email + password */
    LOCAL,
    /** User authenticates via Google SSO */
    GOOGLE,
    /** User authenticates via SAML 2.0 SSO (Okta, Azure AD, OneLogin, etc.) */
    SAML
}
