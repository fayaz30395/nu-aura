package com.hrms.api.attendance.dto;

import com.hrms.domain.attendance.BiometricPunchLog;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Request payload sent by biometric devices when a punch is recorded.
 * The device authenticates via API key in the X-Biometric-Api-Key header.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricPunchRequest {

    /**
     * Serial number of the device sending the punch.
     */
    @NotBlank(message = "Device serial number is required")
    private String deviceSerialNumber;

    /**
     * Employee identifier from the device (badge number, employee code, etc.).
     */
    @NotBlank(message = "Employee identifier is required")
    private String employeeIdentifier;

    /**
     * Time of the punch as recorded by the device.
     */
    @NotNull(message = "Punch time is required")
    private LocalDateTime punchTime;

    /**
     * IN or OUT punch.
     */
    @NotNull(message = "Punch type is required")
    private BiometricPunchLog.PunchType punchType;

    /**
     * Optional raw JSON data from the device for troubleshooting.
     */
    private String rawData;
}
