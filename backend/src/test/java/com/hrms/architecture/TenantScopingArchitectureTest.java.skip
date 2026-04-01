package com.hrms.architecture;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import jakarta.persistence.Entity;

import java.util.Set;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Architecture Tests for Tenant Scoping and Additional CI Guardrails.
 *
 * These tests enforce multi-tenant data isolation patterns:
 * - All JPA entities in critical modules must have a tenantId field
 * - Domain layer must not leak into infrastructure concerns
 * - Repository interfaces must reside in infrastructure package
 *
 * Added as part of Phase 0 stabilization (2026-03-19).
 */
@DisplayName("Tenant Scoping & CI Guardrail Architecture Tests")
class TenantScopingArchitectureTest {

    private static JavaClasses importedClasses;

    /**
     * Known entities that are legitimately exempt from tenantId requirement.
     * These are either:
     * - Global/system-level entities (Tenant itself, enums, events)
     * - Embedded or value-type objects
     * - Junction/child entities that inherit tenant scope from parent
     */
    private static final Set<String> TENANT_ID_EXEMPT_ENTITIES = Set.of(
        // The Tenant entity itself doesn't need a tenantId
        "Tenant",
        // Note: Java enums are not @Entity-annotated so they are excluded by the rule predicate.
        // Only JPA @Entity classes need to be listed here.
        "Currency",
        // Platform-level entities
        "NuApplication",
        "AppPermission",
        // Domain events (not persisted as tenant-scoped entities)
        "DomainEvent",
        "EmployeeEvent",
        "LeaveApprovedEvent",
        "LeaveRejectedEvent",
        "LeaveRequestedEvent",
        "ApprovalDecisionEvent",
        "ApprovalTaskAssignedEvent",
        "ExpenseSubmittedEvent",
        // Child entities that inherit scope from parent
        "LearningPathCourse",
        "AttendanceTimeEntry",
        "ContractVersion",
        "ContractReminder",
        "ContractSignature",
        "ModuleContent",
        "ContentProgress",
        "QuizAttempt",
        "NotificationMessage",
        "MultiChannelNotification",
        "NotificationTemplate",
        "PollOption",
        "PollVote",
        "PostComment",
        "PostReaction",
        "LoanRepayment",
        "SurveyAnswer",
        "SurveyQuestion",
        "SurveyResponse",
        "SurveyInsight",
        "EngagementScore",
        "PIPCheckIn",
        "OkrCheckIn",
        "SuccessionCandidate",
        "TalentPoolMember",
        "Position",
        "OrganizationUnit",
        "WikiPageVersion",
        "WikiPageComment",
        "WikiPageWatch",
        "WikiPageApprovalTask",
        "KnowledgeAttachment",
        "KnowledgeSearch",
        "KnowledgeView",
        "TemplateInstantiation",
        "BlogComment",
        "BlogLike",
        "DocumentAccess",
        "DocumentApproval",
        "DocumentApprovalTask",
        "DocumentApprovalWorkflow",
        "DocumentCategory",
        "DocumentVersion",
        "DocumentExpiryTracking",
        "GeneratedDocument",
        "TicketComment",
        "TicketEscalation",
        "TicketMetrics",
        "ChallengeParticipant",
        "WellnessPoints",
        "PointsTransaction",
        "HealthLog",
        "ProbationEvaluation",
        "TaxProof",
        "TaxRegimeComparison",
        "TDSSlab",
        "ProfessionalTaxSlab",
        "ShiftAssignment",
        "ExitClearance",
        "UserNotificationPreferences",
        "UserNotificationPreference",
        "TrainingEnrollment",
        "SignatureApproval",
        "ProjectMember",
        "ProjectEmployee"
    );

    @BeforeAll
    static void setup() {
        importedClasses = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.hrms");
    }

    @Nested
    @DisplayName("Tenant Scoping Rules")
    class TenantScopingTests {

        @Test
        @DisplayName("Critical module entities should have tenantId field")
        void criticalModuleEntitiesShouldHaveTenantId() {
            ArchRule rule = classes()
                .that().areAnnotatedWith(Entity.class)
                .and().resideInAnyPackage(
                    "..domain.payroll..",
                    "..domain.leave..",
                    "..domain.attendance..",
                    "..domain.employee..",
                    "..domain.recruitment..",
                    "..domain.contract..",
                    "..domain.asset..",
                    "..domain.expense..",
                    "..domain.payment.."
                )
                .should(haveTenantIdFieldOrBeExempt())
                .because("All entities in critical HR modules must have a tenantId field for multi-tenant isolation");

            rule.check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Repository Location Rules")
    class RepositoryLocationTests {

        @Test
        @DisplayName("Repository interfaces in domain package should be flagged")
        void domainRepositoriesShouldBeInInfrastructure() {
            // This test documents the known violation: payment repositories in domain/
            // When these are moved to infrastructure, this test ensures they stay there
            ArchRule rule = noClasses()
                .that().haveSimpleNameEndingWith("Repository")
                .and().areInterfaces()
                .and().doNotHaveFullyQualifiedName("com.hrms.common.security.ApiKeyRepository")
                // Known violations to track -- remove exclusions as they are fixed
                .and().doNotResideInAPackage("..domain.payment..")
                .and().doNotResideInAPackage("..domain.document..")
                .should().resideInAPackage("..infrastructure..")
                .because("Repository interfaces must be in the infrastructure package, not domain");

            rule.check(importedClasses);
        }
    }

    // Note: Service layer integrity tests (services must not import controllers,
    // domain must not import infrastructure) are already covered by the broader
    // rules in LayerArchitectureTest.java — no need to duplicate them here.

    /**
     * Custom ArchUnit condition that checks whether a JPA entity class has a
     * field named "tenantId" (either directly or inherited), or is in the
     * exemption list.
     */
    private static ArchCondition<JavaClass> haveTenantIdFieldOrBeExempt() {
        return new ArchCondition<>("have a tenantId field or be exempt") {
            @Override
            public void check(JavaClass javaClass, ConditionEvents events) {
                String simpleName = javaClass.getSimpleName();

                // Skip exempt entities
                if (TENANT_ID_EXEMPT_ENTITIES.contains(simpleName)) {
                    return;
                }

                // Check for tenantId field in class hierarchy
                boolean hasTenantId = false;
                JavaClass current = javaClass;
                while (current != null && !current.getName().equals("java.lang.Object")) {
                    for (JavaField field : current.getFields()) {
                        if ("tenantId".equals(field.getName())) {
                            hasTenantId = true;
                            break;
                        }
                    }
                    if (hasTenantId) break;

                    try {
                        current = current.getSuperclass()
                            .map(superclass -> superclass.toErasure())
                            .orElse(null);
                    } catch (Exception e) {
                        break;
                    }
                }

                if (!hasTenantId) {
                    events.add(SimpleConditionEvent.violated(
                        javaClass,
                        String.format(
                            "Entity %s in package %s does not have a tenantId field. " +
                            "All tenant-scoped entities must include tenantId for multi-tenant isolation. " +
                            "If this entity is legitimately exempt, add it to TENANT_ID_EXEMPT_ENTITIES.",
                            simpleName,
                            javaClass.getPackageName()
                        )
                    ));
                }
            }
        };
    }
}
