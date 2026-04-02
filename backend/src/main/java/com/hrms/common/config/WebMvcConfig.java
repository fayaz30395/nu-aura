package com.hrms.common.config;

import com.hrms.common.api.ApiVersionInterceptor;
import com.hrms.common.security.PermissionHandlerInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration for API versioning and cross-cutting concerns.
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final ApiVersionInterceptor apiVersionInterceptor;
    // F-05: Intercepts @RequiresPermission before @Valid argument resolution
    private final PermissionHandlerInterceptor permissionHandlerInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // F-05: Permission check runs BEFORE HandlerAdapter argument resolution (@Valid).
        // Must be registered FIRST so preHandle fires before the API version interceptor.
        registry.addInterceptor(permissionHandlerInterceptor)
                .addPathPatterns("/api/**");

        // API version check (added after permission check)
        registry.addInterceptor(apiVersionInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/v*/auth/login",
                        "/api/v*/auth/register",
                        "/api/v*/public/**",
                        "/actuator/**"
                );
    }
}
