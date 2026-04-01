package com.hrms.common.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * Provides a real SimpleMeterRegistry for controller tests that include
 * GlobalExceptionHandler. The GEH uses Counter.builder().register(meterRegistry),
 * which requires a real MeterRegistry (Mockito mocks return null from register()).
 */
@TestConfiguration
public class TestMeterRegistryConfig {

    @Bean
    public MeterRegistry meterRegistry() {
        return new SimpleMeterRegistry();
    }
}
