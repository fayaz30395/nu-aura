package com.hrms.api.attendance.dto;

import com.hrms.domain.attendance.BiometricDevice;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricDeviceRequest {

    @NotBlank(message = "Device name is required")
    @Size(max = 200)
    private String deviceName;

    @NotNull(message = "Device type is required")
    private BiometricDevice.DeviceType deviceType;

    @NotBlank(message = "Serial number is required")
    @Size(max = 100)
    private String serialNumber;

    private UUID locationId;

    @Size(max = 200)
    private String locationName;

    @Size(max = 50)
    private String ipAddress;

    @Size(max = 100)
    private String manufacturer;

    @Size(max = 100)
    private String model;

    @Size(max = 50)
    private String firmwareVersion;

    private String notes;
}
