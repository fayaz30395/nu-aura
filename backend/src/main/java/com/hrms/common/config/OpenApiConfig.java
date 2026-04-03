package com.hrms.common.config;

import com.hrms.common.api.ApiVersion;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI/Swagger configuration for HRMS API documentation.
 * Access at: /swagger-ui.html or /api-docs
 */
@Configuration
public class OpenApiConfig {

    @Value("${spring.application.name:HRMS Platform}")
    private String applicationName;

    @Bean
    public OpenAPI hrmsOpenAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .servers(servers())
                .components(securityComponents())
                .security(List.of(new SecurityRequirement().addList("Bearer Authentication")))
                .tags(apiTags());
    }

    private Info apiInfo() {
        return new Info()
                .title("HRMS Platform API")
                .description("""
                        ## Human Resource Management System API

                        This API provides comprehensive HR management capabilities including:

                        ### Core Modules
                        - **Authentication** - JWT-based authentication with refresh tokens
                        - **Employee Management** - Employee CRUD, profiles, and organizational structure
                        - **Leave Management** - Leave requests, approvals, balances, and types
                        - **Attendance** - Check-in/out, time tracking, and regularization
                        - **Payroll** - Payroll runs, payslips, and salary management
                        - **Department** - Organizational structure management

                        ### Additional Features
                        - **Analytics** - Dashboard metrics and reporting
                        - **Notifications** - Real-time WebSocket notifications
                        - **Document Management** - File uploads and storage

                        ### Multi-tenancy
                        All endpoints require `X-Tenant-ID` header for tenant isolation.

                        ### Authentication
                        Use the `/api/v1/auth/login` endpoint to obtain JWT tokens.
                        Include the access token in the `Authorization` header as `Bearer {token}`.

                        ### API Versioning
                        - **Current Version:** %s
                        - **URL Pattern:** `/api/v1/...` (major version in path)
                        - **Response Headers:**
                          - `X-API-Version` - Current API version
                          - `X-API-Deprecated` - Present if endpoint is deprecated
                          - `Sunset` - Date when deprecated endpoint will be removed
                        """.formatted(ApiVersion.CURRENT))
                .version(ApiVersion.CURRENT)
                .contact(new Contact()
                        .name("NuLogic Support")
                        .email("support@nulogic.io")
                        .url("https://nulogic.io"))
                .license(new License()
                        .name("Proprietary")
                        .url("https://nulogic.io/license"));
    }

    private List<Server> servers() {
        return List.of(
                new Server()
                        .url("http://localhost:8080")
                        .description("Local Development Server"),
                new Server()
                        .url("https://api.hrms.nulogic.io")
                        .description("Production Server")
        );
    }

    private Components securityComponents() {
        return new Components()
                .addSecuritySchemes("Bearer Authentication",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter JWT token obtained from /api/v1/auth/login"))
                .addSecuritySchemes("Tenant ID",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-Tenant-ID")
                                .description("Tenant identifier for multi-tenancy"))
                // API versioning response headers
                .addHeaders(ApiVersion.HEADER_API_VERSION,
                        new Header()
                                .description("Current API version")
                                .schema(new StringSchema().example(ApiVersion.CURRENT)))
                .addHeaders(ApiVersion.HEADER_API_DEPRECATED,
                        new Header()
                                .description("Indicates if endpoint is deprecated")
                                .schema(new StringSchema().example("true")))
                .addHeaders(ApiVersion.HEADER_API_SUNSET,
                        new Header()
                                .description("Date when deprecated endpoint will be removed (RFC 7231)")
                                .schema(new StringSchema().example("Sat, 01 Jun 2025 00:00:00 GMT")))
                .addHeaders(ApiVersion.HEADER_API_DEPRECATION_NOTICE,
                        new Header()
                                .description("Human-readable deprecation message with migration instructions")
                                .schema(new StringSchema()));
    }

    private List<Tag> apiTags() {
        return List.of(
                new Tag().name("Authentication").description("User authentication and authorization"),
                new Tag().name("Employees").description("Employee management operations"),
                new Tag().name("Leave Management").description("Leave requests and balances"),
                new Tag().name("Attendance").description("Time and attendance tracking"),
                new Tag().name("Payroll").description("Payroll processing and payslips"),
                new Tag().name("Departments").description("Organizational structure"),
                new Tag().name("Analytics").description("Dashboard and reporting"),
                new Tag().name("Notifications").description("WebSocket notifications"),
                new Tag().name("Users").description("User account management"),
                new Tag().name("Roles").description("Role and permission management")
        );
    }
}
