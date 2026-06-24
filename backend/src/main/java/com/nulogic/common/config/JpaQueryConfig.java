package com.nulogic.common.config;

import com.nulogic.common.logging.SlowQueryInterceptor;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JpaQueryConfig {

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(SlowQueryInterceptor slowQueryInterceptor) {
        return hibernateProperties -> hibernateProperties.put(AvailableSettings.STATEMENT_INSPECTOR, slowQueryInterceptor);
    }
}
