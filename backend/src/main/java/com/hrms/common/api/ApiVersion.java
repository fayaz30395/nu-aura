package com.hrms.common.api;

/**
 * API versioning constants and utilities.
 *
 * <p>Defines supported API versions and provides utilities for version comparison.</p>
 *
 * <h3>Version Strategy:</h3>
 * <ul>
 *   <li>Major versions in URL path: /api/v1/, /api/v2/</li>
 *   <li>Minor versions via Accept header: application/vnd.hrms.v1.1+json</li>
 *   <li>Deprecation communicated via response headers</li>
 * </ul>
 */
public final class ApiVersion {

    // Current stable version
    public static final String CURRENT = "1.0";
    public static final int CURRENT_MAJOR = 1;
    public static final int CURRENT_MINOR = 0;
    // Supported versions
    public static final String V1 = "1.0";
    public static final String V1_1 = "1.1";
    // URL path prefixes
    public static final String V1_PATH = "/api/v1";
    public static final String V2_PATH = "/api/v2";
    // Media type patterns
    public static final String MEDIA_TYPE_PREFIX = "application/vnd.hrms.v";
    public static final String MEDIA_TYPE_SUFFIX = "+json";
    public static final String MEDIA_TYPE_V1 = MEDIA_TYPE_PREFIX + "1" + MEDIA_TYPE_SUFFIX;
    public static final String MEDIA_TYPE_V1_1 = MEDIA_TYPE_PREFIX + "1.1" + MEDIA_TYPE_SUFFIX;
    // Response headers
    public static final String HEADER_API_VERSION = "X-API-Version";
    public static final String HEADER_API_DEPRECATED = "X-API-Deprecated";
    public static final String HEADER_API_SUNSET = "Sunset";
    public static final String HEADER_API_DEPRECATION_NOTICE = "X-API-Deprecation-Notice";
    public static final String HEADER_API_LATEST_VERSION = "X-API-Latest-Version";

    private ApiVersion() {
        // Utility class
    }

    /**
     * Parse version string into major and minor components.
     *
     * @param version Version string (e.g., "1.0", "1.1", "2.0")
     * @return Array of [major, minor]
     */
    public static int[] parseVersion(String version) {
        if (version == null || version.isBlank()) {
            return new int[]{CURRENT_MAJOR, CURRENT_MINOR};
        }

        String[] parts = version.split("\\.");
        int major = Integer.parseInt(parts[0]);
        int minor = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;

        return new int[]{major, minor};
    }

    /**
     * Compare two versions.
     *
     * @return negative if v1 &lt; v2, 0 if equal, positive if v1 &gt; v2
     */
    public static int compareVersions(String v1, String v2) {
        int[] parsed1 = parseVersion(v1);
        int[] parsed2 = parseVersion(v2);

        if (parsed1[0] != parsed2[0]) {
            return parsed1[0] - parsed2[0];
        }
        return parsed1[1] - parsed2[1];
    }

    /**
     * Check if a version is supported.
     */
    public static boolean isSupported(String version) {
        int[] parsed = parseVersion(version);
        // Support v1.x only for now
        return parsed[0] == 1 && parsed[1] <= 1;
    }

    /**
     * Get the minimum supported version.
     */
    public static String getMinimumSupported() {
        return V1;
    }
}
