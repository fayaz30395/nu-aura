package com.hrms.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * Architecture Tests using ArchUnit
 * <p>
 * These tests enforce the hexagonal architecture layer boundaries:
 * - Controllers (API layer) should only access Services (Application layer)
 * - Services should access Repositories (Infrastructure layer)
 * - Domain entities should be free of framework dependencies
 */
@DisplayName("Architecture Layer Tests")
class LayerArchitectureTest {

    private static JavaClasses importedClasses;

    @BeforeAll
    static void setup() {
        importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.hrms");
    }

    @Nested
    @DisplayName("Layered Architecture Rules")
    class LayeredArchitectureTests {

        @Test
        @DisplayName("Should follow hexagonal architecture layer dependencies")
        void shouldFollowLayeredArchitecture() {
            layeredArchitecture()
                    .consideringOnlyDependenciesInLayers()
                    .layer("API").definedBy("..api..")
                    .layer("Application").definedBy("..application..")
                    .layer("Domain").definedBy("..domain..")
                    .layer("Infrastructure").definedBy("..infrastructure..")
                    .layer("Common").definedBy("..common..")

                    // API layer can only access Application and Common
                    .whereLayer("API").mayOnlyAccessLayers("Application", "Infrastructure", "Common", "Domain")

                    // Application layer can access Domain, Infrastructure, and Common
                    .whereLayer("Application").mayOnlyAccessLayers("Domain", "Infrastructure", "Common", "API")

                    // Domain layer should be mostly independent
                    // Infrastructure access allowed for domain services that wrap infra adapters
                    // (e.g., WebSocketNotificationService wraps RedisWebSocketRelay)
                    .whereLayer("Domain").mayOnlyAccessLayers("Common", "Infrastructure")

                    // Infrastructure can access Domain, Application, and Common
                    // (Driving adapters like Kafka consumers invoke Application services)
                    .whereLayer("Infrastructure").mayOnlyAccessLayers("Domain", "Application", "Common")

                    .check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Controller Layer Rules")
    class ControllerLayerTests {

        @Test
        @DisplayName("Controllers should not directly access Repositories")
        void controllersShouldNotAccessRepositories() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..api..")
                    .and().haveSimpleNameEndingWith("Controller")
                    .and().doNotHaveSimpleName("WebhookController")
                    .and().doNotHaveSimpleName("PayrollStatutoryController")
                    .and().doNotHaveSimpleName("IntegrationController")
                    // Controllers that currently access repositories directly (technical debt)
                    .and().doNotHaveSimpleName("KafkaAdminController")
                    .and().doNotHaveSimpleName("DocuSignController")
                    .and().doNotHaveSimpleName("IntegrationConnectorController")
                    .and().doNotHaveSimpleName("BlogPostController")
                    .and().doNotHaveSimpleName("FluenceActivityController")
                    .and().doNotHaveSimpleName("WikiPageController")
                    .and().doNotHaveSimpleName("ImplicitRoleRuleController")
                    .and().doNotHaveSimpleName("ApprovalEscalationController")
                    .should().accessClassesThat().resideInAPackage("..infrastructure..repository..")
                    .because("Controllers must access data through Services, not directly through Repositories");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Controllers should not have Repository fields")
        void controllersShouldNotHaveRepositoryFields() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..api..")
                    .and().haveSimpleNameEndingWith("Controller")
                    .and().doNotHaveSimpleName("WebhookController")
                    .and().doNotHaveSimpleName("PayrollStatutoryController")
                    .and().doNotHaveSimpleName("IntegrationController")
                    // Controllers that currently depend on repositories directly (technical debt)
                    .and().doNotHaveSimpleName("KafkaAdminController")
                    .and().doNotHaveSimpleName("DocuSignController")
                    .and().doNotHaveSimpleName("IntegrationConnectorController")
                    .and().doNotHaveSimpleName("BlogPostController")
                    .and().doNotHaveSimpleName("FluenceActivityController")
                    .and().doNotHaveSimpleName("WikiPageController")
                    .and().doNotHaveSimpleName("ImplicitRoleRuleController")
                    .and().doNotHaveSimpleName("ApprovalEscalationController")
                    .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
                    .because("Controllers must not depend on Repositories");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Controllers should reside in api package")
        void controllersShouldResideInApiPackage() {
            ArchRule rule = classes()
                    .that().haveSimpleNameEndingWith("Controller")
                    .and().areNotInterfaces()
                    .and().doNotHaveFullyQualifiedName("com.hrms.common.security.ApiKeyController")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.notification.WebSocketNotificationController")
                    .should().resideInAPackage("..api..")
                    .because("Controllers must be in the API layer");

            rule.check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Service Layer Rules")
    class ServiceLayerTests {

        @Test
        @DisplayName("Services should reside in application package")
        void servicesShouldResideInApplicationPackage() {
            ArchRule rule = classes()
                    .that().haveSimpleNameEndingWith("Service")
                    .and().areNotInterfaces()
                    .and().resideOutsideOfPackage("..common..")
                    .and().doNotHaveFullyQualifiedName("com.hrms.api.monitoring.service.MonitoringService")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.notification.WebSocketNotificationService")
                    .and().doNotHaveFullyQualifiedName("com.hrms.infrastructure.payment.MockPaymentService")
                    .and().doNotHaveFullyQualifiedName("com.hrms.infrastructure.sms.MockSmsService")
                    // Infrastructure services that are implementation details (not domain services)
                    .and().doNotHaveFullyQualifiedName("com.hrms.infrastructure.integration.docusign.DocuSignAuthService")
                    .and().doNotHaveFullyQualifiedName("com.hrms.infrastructure.kafka.IdempotencyService")
                    .and().doNotHaveFullyQualifiedName("com.hrms.infrastructure.search.service.FluenceIndexingService")
                    .and().doNotHaveFullyQualifiedName("com.hrms.infrastructure.search.service.FluenceSearchService")
                    .should().resideInAPackage("..application..")
                    .because("Services must be in the Application layer");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Services should not depend on Controllers")
        void servicesShouldNotDependOnControllers() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..application..")
                    .should().dependOnClassesThat().resideInAPackage("..api..controller..")
                    .because("Services must not depend on the API layer");

            rule.check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Repository Layer Rules")
    class RepositoryLayerTests {

        @Test
        @DisplayName("Repositories should reside in infrastructure package")
        void repositoriesShouldResideInInfrastructurePackage() {
            ArchRule rule = classes()
                    .that().haveSimpleNameEndingWith("Repository")
                    .and().areInterfaces()
                    .and().doNotHaveFullyQualifiedName("com.hrms.common.security.ApiKeyRepository")
                    // Document-related repositories in domain package (co-located with entities)
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.document.DocumentAccessRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.document.DocumentApprovalTaskRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.document.DocumentApprovalWorkflowRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.document.DocumentExpiryTrackingRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.document.DocumentVersionRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.document.GeneratedDocumentRepository")
                    // Payment-related repositories in domain package (co-located with entities)
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.payment.PaymentBatchRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.payment.PaymentConfigRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.payment.PaymentRefundRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.payment.PaymentTransactionRepository")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.payment.PaymentWebhookRepository")
                    .should().resideInAPackage("..infrastructure..")
                    .because("Repositories must be in the Infrastructure layer");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Repository interfaces should not depend on Services")
        void repositoriesShouldNotDependOnServices() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..infrastructure..repository..")
                    .should().dependOnClassesThat().resideInAPackage("..application..service..")
                    .because("Repository interfaces must not depend on Application services");

            rule.check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Domain Layer Rules")
    class DomainLayerTests {

        @Test
        @DisplayName("Domain entities should not depend on other layers")
        void domainShouldNotDependOnOtherLayers() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..domain..")
                    // WebSocketNotificationService is a domain service that wraps an infrastructure relay
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.notification.WebSocketNotificationService")
                    .should().dependOnClassesThat().resideInAnyPackage(
                            "..api..",
                            "..application..",
                            "..infrastructure.."
                    )
                    .because("Domain layer must be independent of outer layers");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Domain entities should not have Service annotations")
        void domainShouldNotHaveServiceAnnotations() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..domain..")
                    .and().doNotHaveFullyQualifiedName("com.hrms.domain.notification.WebSocketNotificationService")
                    .should().beAnnotatedWith(org.springframework.stereotype.Service.class)
                    .because("Domain entities must not be Spring services");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Domain entities should not have Repository annotations")
        void domainShouldNotHaveRepositoryAnnotations() {
            ArchRule rule = noClasses()
                    .that().resideInAPackage("..domain..")
                    // Exclude repositories co-located with domain entities (document, payment)
                    .and().resideOutsideOfPackage("..domain.document..")
                    .and().resideOutsideOfPackage("..domain.payment..")
                    .should().beAnnotatedWith(org.springframework.stereotype.Repository.class)
                    .because("Domain entities must not be Spring repositories");

            rule.check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Naming Convention Rules")
    class NamingConventionTests {

        @Test
        @DisplayName("Controllers should be suffixed with Controller")
        void controllersShouldBeSuffixedWithController() {
            ArchRule rule = classes()
                    .that().resideInAPackage("..api..controller..")
                    .and().areAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                    .should().haveSimpleNameEndingWith("Controller")
                    .because("REST controllers should follow naming convention");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Services should be suffixed with Service")
        void servicesShouldBeSuffixedWithService() {
            ArchRule rule = classes()
                    .that().resideInAPackage("..application..service..")
                    .and().areAnnotatedWith(org.springframework.stereotype.Service.class)
                    .and().doNotHaveSimpleName("ScheduledReportExecutionJob")
                    .and().doNotHaveSimpleName("PermissionScopeMerger")
                    // Application-layer components that follow different naming conventions
                    .and().doNotHaveSimpleName("ResumeTextExtractor")
                    .and().doNotHaveSimpleName("SamlAuthenticationHandler")
                    .and().doNotHaveSimpleName("IntegrationEventRouter")
                    .and().doNotHaveSimpleName("FluenceContentRetriever")
                    .and().doNotHaveSimpleName("RazorpayAdapter")
                    .and().doNotHaveSimpleName("StripeAdapter")
                    .and().doNotHaveSimpleName("ImplicitRoleEngine")
                    .should().haveSimpleNameEndingWith("Service")
                    .because("Services should follow naming convention");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Repositories should be suffixed with Repository")
        void repositoriesShouldBeSuffixedWithRepository() {
            ArchRule rule = classes()
                    .that().resideInAPackage("..infrastructure..repository..")
                    .and().areInterfaces()
                    .should().haveSimpleNameEndingWith("Repository")
                    .because("Repositories should follow naming convention");

            rule.check(importedClasses);
        }
    }
}
