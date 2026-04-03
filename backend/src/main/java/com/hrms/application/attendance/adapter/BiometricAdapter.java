package com.hrms.application.attendance.adapter;

import com.hrms.api.attendance.dto.BiometricPunchRequest;

import java.util.List;

/**
 * Adapter interface for biometric device communication protocols.
 * Each manufacturer/protocol implements this interface to normalize
 * device-specific punch data into the standard BiometricPunchRequest format.
 */
public interface BiometricAdapter {

    /**
     * Unique protocol identifier (e.g., "ZKTECO", "ESSL").
     */
    String getProtocol();

    /**
     * Whether this adapter supports the given manufacturer string.
     */
    boolean supports(String manufacturer);

    /**
     * Parse device-specific raw payload into standard punch requests.
     *
     * @param rawPayload the raw data from the device
     * @return list of normalized punch requests
     */
    List<BiometricPunchRequest> parsePunchData(String rawPayload);

    /**
     * Send a sync/poll command to the device and retrieve new punches.
     * Returns empty list if the device does not support pull-based sync.
     *
     * @param deviceIp the IP address of the device
     * @param port     the port for communication
     * @return list of punch requests retrieved from the device
     */
    List<BiometricPunchRequest> pullPunches(String deviceIp, int port);
}
