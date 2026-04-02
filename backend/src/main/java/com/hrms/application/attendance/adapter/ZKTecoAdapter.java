package com.hrms.application.attendance.adapter;

import com.hrms.api.attendance.dto.BiometricPunchRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Adapter for ZKTeco biometric devices.
 * FUTURE: NUAURA-BIOMETRIC-002 — Implement ZKTeco SDK push/pull protocol integration.
 * ZKTeco devices communicate via their proprietary PUSH protocol or the ZK Web API.
 *
 * <p>This bean is only registered when {@code app.biometric.zkteco.enabled=true} is set
 * in application properties. This prevents the unimplemented stub from being loaded
 * (and polluting BiometricAdapter discovery) in environments where ZKTeco is not in use.
 */
@Component
@ConditionalOnProperty(name = "app.biometric.zkteco.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
public class ZKTecoAdapter implements BiometricAdapter {

    @Override
    public String getProtocol() {
        return "ZKTECO";
    }

    @Override
    public boolean supports(String manufacturer) {
        return manufacturer != null &&
               (manufacturer.toUpperCase().contains("ZKTECO") ||
                manufacturer.toUpperCase().contains("ZK"));
    }

    @Override
    public List<BiometricPunchRequest> parsePunchData(String rawPayload) {
        // FUTURE: NUAURA-BIOMETRIC-002 — Parse ZKTeco PUSH protocol payload (binary/text format) into punch records.
        log.warn("ZKTeco parsePunchData not yet implemented. Raw payload length: {}",
                rawPayload != null ? rawPayload.length() : 0);
        return Collections.emptyList();
    }

    @Override
    public List<BiometricPunchRequest> pullPunches(String deviceIp, int port) {
        // FUTURE: NUAURA-BIOMETRIC-002 — Implement ZKTeco TCP pull via ZK protocol commands to retrieve attendance logs.
        log.warn("ZKTeco pullPunches not yet implemented for device at {}:{}", deviceIp, port);
        return Collections.emptyList();
    }
}
