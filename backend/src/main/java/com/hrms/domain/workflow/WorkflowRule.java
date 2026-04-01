package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionException;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.SimpleEvaluationContext;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Workflow Rule - Defines conditions for workflow selection and step behavior.
 * Supports complex rule expressions for dynamic workflow routing.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "workflow_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Slf4j
public class WorkflowRule extends TenantAware {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RuleType ruleType;

    // Entity type this rule applies to
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private WorkflowDefinition.EntityType entityType;

    // The rule expression (e.g., "amount > 10000 && department == 'SALES'")
    @Column(columnDefinition = "TEXT", nullable = false)
    private String ruleExpression;

    // Priority (higher number = higher priority, evaluated first)
    @Column(nullable = false)
    private int priority;

    // What happens when rule matches
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RuleAction action;

    // For ROUTE_TO_WORKFLOW action
    private UUID targetWorkflowId;

    // For ADD_APPROVER action
    private UUID additionalApproverId;
    private UUID additionalApproverRoleId;

    // For SKIP_STEP action
    private int skipStepOrder;

    // For SET_PRIORITY action
    @Enumerated(EnumType.STRING)
    private WorkflowExecution.Priority targetPriority;

    // For ADD_NOTIFICATION action
    @Column(columnDefinition = "TEXT")
    private String notificationRecipients;
    private String notificationTemplate;

    // Is rule active?
    @Column(nullable = false)
    private boolean isActive;

    // Effective dates
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum RuleType {
        WORKFLOW_SELECTION,     // Determines which workflow to use
        STEP_CONDITION,         // Determines if a step should be executed
        APPROVER_ASSIGNMENT,    // Determines who the approver should be
        AUTO_ACTION,            // Auto-approve or auto-reject
        NOTIFICATION,           // Send additional notifications
        ESCALATION,             // Custom escalation rules
        PRIORITY,               // Set priority based on conditions
        VALIDATION              // Validate the request data
    }

    public enum RuleAction {
        ROUTE_TO_WORKFLOW,      // Route to specific workflow
        ADD_APPROVER,           // Add additional approver
        REMOVE_APPROVER,        // Remove an approver
        SKIP_STEP,              // Skip a step
        ADD_STEP,               // Add a step
        AUTO_APPROVE,           // Automatically approve
        AUTO_REJECT,            // Automatically reject
        SET_PRIORITY,           // Set priority level
        SEND_NOTIFICATION,      // Send notification
        ESCALATE,               // Escalate immediately
        HOLD,                   // Put on hold
        RETURN                  // Return for modification
    }

    @PrePersist
    protected void onCreate() {
        if (priority == 0) priority = 100;
    }

    public boolean isCurrentlyEffective() {
        if (!isActive) return false;
        LocalDateTime now = LocalDateTime.now();
        if (effectiveFrom != null && now.isBefore(effectiveFrom)) return false;
        if (effectiveTo != null && now.isAfter(effectiveTo)) return false;
        return true;
    }

    /**
     * BUG-011 FIX: Evaluate the rule expression against the supplied context using
     * Spring SpEL with {@link SimpleEvaluationContext} (read-only, restricted).
     *
     * <p>SimpleEvaluationContext is intentionally restricted: it allows property
     * access and comparison operators but blocks arbitrary Java method invocations,
     * preventing expression-injection attacks from user-supplied rule strings stored
     * in the database.</p>
     *
     * <p>Expression syntax depends on the type of {@code context}:
     * <ul>
     *   <li>{@code Map<String,Object>} — each entry is exposed as a SpEL variable
     *       prefixed with {@code #}, e.g. {@code #amount > 10000 && #department == 'SALES'}</li>
     *   <li>Any POJO — used as the SpEL root object; properties are accessed directly,
     *       e.g. {@code amount > 10000 && department == 'SALES'}</li>
     * </ul>
     *
     * <p>On any parse or evaluation error the method returns {@code false} (fail-closed)
     * so a broken rule expression never accidentally grants access.</p>
     *
     * @param context evaluation context — either a {@code Map<String,Object>} or a POJO
     * @return {@code true} if the expression evaluates to {@code true}; {@code false} otherwise
     */
    /**
     * SEC: Validate a SpEL expression to reject dangerous patterns that could lead to RCE.
     */
    private static void validateSpelExpression(String expr) {
        if (expr == null || expr.isBlank()) return;
        String[] dangerousPatterns = {"T(", "new ", ".class", "getClass", "forName", "Runtime", "Process", "exec(", "invoke("};
        String normalized = expr.toLowerCase();
        for (String pattern : dangerousPatterns) {
            if (normalized.contains(pattern.toLowerCase())) {
                log.error("SEC: Workflow rule expression contains forbidden pattern '{}': {}", pattern, expr);
                throw new IllegalArgumentException(
                        "SEC: Rule expression contains forbidden pattern '" + pattern + "'");
            }
        }
    }

    public boolean evaluate(Object context) {
        if (ruleExpression == null || ruleExpression.isBlank()) {
            // Empty expression — no condition to check, rule always matches
            return true;
        }

        // SEC: Validate expression before evaluation to block injection attacks
        validateSpelExpression(ruleExpression);

        try {
            ExpressionParser parser = new SpelExpressionParser();

            SimpleEvaluationContext evalContext;
            if (context instanceof Map<?, ?>) {
                // Build a read-only context and expose each map entry as a named variable
                // SEC: Removed withInstanceMethods() to restrict attack surface
                evalContext = SimpleEvaluationContext
                        .forReadOnlyDataBinding()
                        .build();
                @SuppressWarnings("unchecked")
                Map<String, Object> variables = (Map<String, Object>) context;
                variables.forEach(evalContext::setVariable);
            } else {
                // POJO root object: properties are accessed by name directly
                // SEC: Removed withInstanceMethods() to restrict attack surface
                evalContext = SimpleEvaluationContext
                        .forReadOnlyDataBinding()
                        .withRootObject(context)
                        .build();
            }

            Expression expression = parser.parseExpression(ruleExpression);
            Boolean result = expression.getValue(evalContext, Boolean.class);
            return Boolean.TRUE.equals(result);

        } catch (ExpressionException | IllegalArgumentException e) {
            // Fail-closed: a malformed or un-evaluable expression never passes
            log.warn("WorkflowRule [{}] expression evaluation failed for expression [{}]: {}",
                    name, ruleExpression, e.getMessage());
            return false;
        }
    }
}
