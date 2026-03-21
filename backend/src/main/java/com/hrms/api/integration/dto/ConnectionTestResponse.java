package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing the result of a connector connection test.
 *
 * <p>Provides information about whether the connector successfully
 * authenticated and connected to the external service, along with
 * performance metrics.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionTestResponse {

    /**
     * Whether the connection test was successful.
     */
    private boolean success;

    /**
     * A human-readable message describing the result.
     * Examples: "Connected successfully", "Authentication failed", "Service unavailable"
     */
    private String message;

    /**
     * The time taken to perform the connection test, in milliseconds.
     */
    private long latencyMs;
}
