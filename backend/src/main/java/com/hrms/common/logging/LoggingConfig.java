package com.hrms.common.logging;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Configures structured JSON logging for production environments.
 * In development, uses standard console output.
 */
@Configuration
@Slf4j
public class LoggingConfig {

    @Value("${app.logging.json-enabled:false}")
    private boolean jsonLoggingEnabled;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @PostConstruct
    public void init() {
        log.info("Logging configuration initialized - JSON logging: {}, Profile: {}",
                jsonLoggingEnabled, activeProfile);
    }
}
