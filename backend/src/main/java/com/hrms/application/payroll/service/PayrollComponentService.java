package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.payroll.PayrollComponent;
import com.hrms.domain.payroll.PayrollComponent.ComponentType;
import com.hrms.infrastructure.payroll.repository.PayrollComponentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for managing payroll components with formula-based evaluation.
 * <p>
 * Components can reference each other via SpEL formulas (e.g., "basic * 0.4").
 * This service builds a dependency graph and uses Kahn's algorithm (BFS topological
 * sort) to determine evaluation order. Circular dependencies are detected before
 * any evaluation begins (fail-fast).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PayrollComponentService {

    private final PayrollComponentRepository payrollComponentRepository;
    private final AuditLogService auditLogService;

    private final ExpressionParser spelParser = new SpelExpressionParser();

    /**
     * Pattern to extract component code references from SpEL formulas.
     * Matches identifiers that could be component codes (lowercase letters, digits, underscores).
     * Excludes SpEL keywords and numeric literals.
     */
    private static final Pattern COMPONENT_REF_PATTERN = Pattern.compile("\\b([a-z][a-z0-9_]*)\\b");

    /**
     * SpEL keywords and built-in identifiers that should NOT be treated as component references.
     */
    private static final Set<String> SPEL_KEYWORDS = Set.of(
            "true", "false", "null", "and", "or", "not",
            "eq", "ne", "lt", "gt", "le", "ge",
            "div", "mod", "instanceof", "matches",
            "new", "T", "abs", "min", "max", "round", "ceil", "floor"
    );

    // ===== CRUD Operations =====

    @Transactional
    public PayrollComponent createComponent(PayrollComponent component) {
        UUID tenantId = TenantContext.getCurrentTenant();
        component.setTenantId(tenantId);

        if (payrollComponentRepository.existsByTenantIdAndCode(tenantId, component.getCode())) {
            throw new BusinessException(
                    "Payroll component with code '" + component.getCode() + "' already exists");
        }

        // Validate formula references and check for cycles BEFORE saving
        if (component.getFormula() != null && !component.getFormula().isBlank()) {
            List<PayrollComponent> existingComponents =
                    payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId);
            validateFormulaReferences(component, existingComponents);

            // Add the new component to the list and verify no cycles are introduced
            List<PayrollComponent> allComponents = new ArrayList<>(existingComponents);
            allComponents.add(component);
            List<PayrollComponent> sorted = topologicalSort(allComponents);

            // Update evaluation order for all components based on the sort
            updateEvaluationOrders(sorted);
        }

        PayrollComponent saved = payrollComponentRepository.save(component);

        auditLogService.logAction(
                "PAYROLL_COMPONENT",
                saved.getId(),
                AuditAction.CREATE,
                null,
                Map.of("code", saved.getCode(), "name", saved.getName(),
                        "formula", saved.getFormula() != null ? saved.getFormula() : "N/A"),
                "Payroll component created: " + saved.getCode()
        );

        log.info("Created payroll component '{}' (type={}) for tenant {}",
                saved.getCode(), saved.getComponentType(), tenantId);
        return saved;
    }

    @Transactional
    public PayrollComponent updateComponent(UUID id, PayrollComponent componentData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PayrollComponent component = payrollComponentRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Payroll component not found"));

        String previousFormula = component.getFormula();

        component.setName(componentData.getName());
        component.setComponentType(componentData.getComponentType());
        component.setFormula(componentData.getFormula());
        component.setDefaultValue(componentData.getDefaultValue());
        component.setIsActive(componentData.getIsActive());
        component.setIsTaxable(componentData.getIsTaxable());
        component.setDescription(componentData.getDescription());

        // Re-validate dependency graph with updated formula
        List<PayrollComponent> allComponents =
                payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId);

        // Replace the old version with the updated one in the list
        allComponents = allComponents.stream()
                .map(c -> c.getId().equals(id) ? component : c)
                .collect(Collectors.toList());

        List<PayrollComponent> sorted = topologicalSort(allComponents);
        updateEvaluationOrders(sorted);

        PayrollComponent saved = payrollComponentRepository.save(component);

        auditLogService.logAction(
                "PAYROLL_COMPONENT",
                id,
                AuditAction.UPDATE,
                Map.of("formula", previousFormula != null ? previousFormula : "N/A"),
                Map.of("formula", saved.getFormula() != null ? saved.getFormula() : "N/A"),
                "Payroll component updated: " + saved.getCode()
        );

        return saved;
    }

    @Transactional(readOnly = true)
    public PayrollComponent getComponentById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollComponentRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Payroll component not found"));
    }

    @Transactional(readOnly = true)
    public PayrollComponent getComponentByCode(String code) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollComponentRepository.findByTenantIdAndCode(tenantId, code)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payroll component not found with code: " + code));
    }

    @Transactional(readOnly = true)
    public Page<PayrollComponent> getAllComponents(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollComponentRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<PayrollComponent> getActiveComponentsInOrder() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollComponentRepository.findAllByTenantIdAndIsActiveTrueOrderByEvaluationOrderAsc(tenantId);
    }

    @Transactional(readOnly = true)
    public List<PayrollComponent> getActiveComponentsByType(ComponentType type) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollComponentRepository.findActiveByTenantIdAndType(tenantId, type);
    }

    @Transactional
    public void deleteComponent(UUID id) {
        PayrollComponent component = getComponentById(id);
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if any other component references this one in its formula
        List<PayrollComponent> allComponents =
                payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId);
        List<String> dependents = allComponents.stream()
                .filter(c -> !c.getId().equals(id))
                .filter(c -> c.getFormula() != null)
                .filter(c -> extractFormulaReferences(c.getFormula()).contains(component.getCode()))
                .map(PayrollComponent::getCode)
                .collect(Collectors.toList());

        if (!dependents.isEmpty()) {
            throw new BusinessException(
                    "Cannot delete component '" + component.getCode() +
                    "' because it is referenced by: " + String.join(", ", dependents));
        }

        auditLogService.logAction(
                "PAYROLL_COMPONENT",
                id,
                AuditAction.DELETE,
                Map.of("code", component.getCode()),
                null,
                "Payroll component deleted: " + component.getCode()
        );

        payrollComponentRepository.delete(component);
    }

    // ===== Formula Evaluation =====

    /**
     * Evaluates all active payroll components for a given set of input values.
     * Components are evaluated in topological order (dependency-safe).
     * <p>
     * The {@code inputValues} map should contain values for components that have
     * no formula (e.g., "basic" = 50000). Formula-based components are computed
     * automatically.
     *
     * @param inputValues map of component code to its direct value (for non-formula components)
     * @return map of all component codes to their computed values
     */
    @Transactional(readOnly = true)
    public Map<String, BigDecimal> evaluateComponents(Map<String, BigDecimal> inputValues) {
        List<PayrollComponent> components = getActiveComponentsInOrder();

        // Fail-fast: verify the ordering is still valid (in case data was modified outside this service)
        topologicalSort(components);

        Map<String, BigDecimal> evaluatedValues = new LinkedHashMap<>();

        // Seed with input values
        evaluatedValues.putAll(inputValues);

        for (PayrollComponent component : components) {
            if (component.getFormula() == null || component.getFormula().isBlank()) {
                // Non-formula component: use input value or default
                if (!evaluatedValues.containsKey(component.getCode())) {
                    evaluatedValues.put(component.getCode(),
                            component.getDefaultValue() != null ? component.getDefaultValue() : BigDecimal.ZERO);
                }
            } else {
                // Formula component: evaluate SpEL expression
                BigDecimal result = evaluateFormula(component.getFormula(), evaluatedValues);
                evaluatedValues.put(component.getCode(), result);
            }
        }

        return evaluatedValues;
    }

    /**
     * Evaluates a single SpEL formula using the already-computed component values as variables.
     */
    private BigDecimal evaluateFormula(String formula, Map<String, BigDecimal> componentValues) {
        StandardEvaluationContext context = new StandardEvaluationContext();

        // Set each component code as a variable in the SpEL context
        for (Map.Entry<String, BigDecimal> entry : componentValues.entrySet()) {
            context.setVariable(entry.getKey(), entry.getValue());
        }

        // Also set them as root properties by using a map-based root object
        context.setRootObject(componentValues);

        try {
            // SpEL can resolve map keys as properties, so "basic * 0.4" works
            // when the root object is a Map with key "basic"
            Object result = spelParser.parseExpression(formula).getValue(context);

            if (result instanceof BigDecimal) {
                return ((BigDecimal) result).setScale(2, RoundingMode.HALF_UP);
            } else if (result instanceof Number) {
                return BigDecimal.valueOf(((Number) result).doubleValue())
                        .setScale(2, RoundingMode.HALF_UP);
            } else {
                throw new BusinessException(
                        "Formula '" + formula + "' did not evaluate to a number. Got: " + result);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(
                    "Error evaluating formula '" + formula + "': " + e.getMessage());
        }
    }

    // ===== Cycle Detection & Topological Sort =====

    /**
     * Performs topological sort on payroll components using Kahn's algorithm (BFS).
     * <p>
     * Detects circular dependencies in salary component formulas. If a cycle is found,
     * throws a {@link BusinessException} with the cycle path so the user can fix the
     * offending formulas.
     *
     * @param components all payroll components for the tenant
     * @return components ordered by evaluation dependency (leaves first)
     * @throws BusinessException if a circular dependency is detected
     */
    List<PayrollComponent> topologicalSort(List<PayrollComponent> components) {
        if (components == null || components.isEmpty()) {
            return Collections.emptyList();
        }

        // Build code-to-component lookup
        Map<String, PayrollComponent> componentByCode = new LinkedHashMap<>();
        for (PayrollComponent component : components) {
            componentByCode.put(component.getCode(), component);
        }

        // Build adjacency list: for each component, which components depend on it
        // Edge direction: dependency -> dependent (if B's formula references A, edge A -> B)
        Map<String, Set<String>> dependents = new LinkedHashMap<>();
        Map<String, Integer> inDegree = new LinkedHashMap<>();

        for (PayrollComponent component : components) {
            dependents.putIfAbsent(component.getCode(), new LinkedHashSet<>());
            inDegree.putIfAbsent(component.getCode(), 0);
        }

        for (PayrollComponent component : components) {
            if (component.getFormula() != null && !component.getFormula().isBlank()) {
                Set<String> refs = extractFormulaReferences(component.getFormula());
                for (String ref : refs) {
                    if (componentByCode.containsKey(ref)) {
                        // ref -> component (component depends on ref)
                        dependents.get(ref).add(component.getCode());
                        inDegree.merge(component.getCode(), 1, Integer::sum);
                    }
                }
            }
        }

        // Kahn's algorithm: start with nodes that have no dependencies (in-degree = 0)
        Queue<String> queue = new LinkedList<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.add(entry.getKey());
            }
        }

        List<String> sortedCodes = new ArrayList<>();
        while (!queue.isEmpty()) {
            String current = queue.poll();
            sortedCodes.add(current);

            for (String dependent : dependents.getOrDefault(current, Collections.emptySet())) {
                int newDegree = inDegree.merge(dependent, -1, Integer::sum);
                if (newDegree == 0) {
                    queue.add(dependent);
                }
            }
        }

        // If we couldn't process all nodes, there is a cycle
        if (sortedCodes.size() < components.size()) {
            String cyclePath = detectCyclePath(componentByCode, dependents, inDegree);
            Set<String> processedSet = new HashSet<>(sortedCodes);
            List<String> involvedComponents = components.stream()
                    .map(PayrollComponent::getCode)
                    .filter(code -> !processedSet.contains(code))
                    .collect(Collectors.toList());

            throw new BusinessException(
                    "Circular dependency detected in salary components: " + cyclePath +
                    ". Please review the formulas for components: " + involvedComponents);
        }

        // Return components in topological order
        Map<String, Integer> orderMap = new HashMap<>();
        for (int i = 0; i < sortedCodes.size(); i++) {
            orderMap.put(sortedCodes.get(i), i);
        }

        return components.stream()
                .sorted(Comparator.comparingInt(c -> orderMap.getOrDefault(c.getCode(), Integer.MAX_VALUE)))
                .collect(Collectors.toList());
    }

    /**
     * Uses DFS to find and report the actual cycle path for a clear error message.
     * Called only when Kahn's algorithm detects that a cycle exists.
     */
    private String detectCyclePath(
            Map<String, PayrollComponent> componentByCode,
            Map<String, Set<String>> dependents,
            Map<String, Integer> inDegree) {

        // Build reverse adjacency: component -> its dependencies (what it references)
        Map<String, Set<String>> dependencies = new LinkedHashMap<>();
        for (PayrollComponent component : componentByCode.values()) {
            dependencies.put(component.getCode(), new LinkedHashSet<>());
        }
        for (Map.Entry<String, Set<String>> entry : dependents.entrySet()) {
            for (String dep : entry.getValue()) {
                dependencies.computeIfAbsent(dep, k -> new LinkedHashSet<>()).add(entry.getKey());
            }
        }

        // DFS from nodes still in the graph (in-degree > 0) to find the cycle
        Set<String> cycleNodes = componentByCode.keySet().stream()
                .filter(code -> inDegree.getOrDefault(code, 0) > 0)
                .collect(Collectors.toSet());

        if (cycleNodes.isEmpty()) {
            return "unknown cycle";
        }

        // Trace the cycle using DFS with recursion stack
        Set<String> visited = new HashSet<>();
        Set<String> recursionStack = new LinkedHashSet<>();
        List<String> cyclePath = new ArrayList<>();

        for (String node : cycleNodes) {
            if (dfsFindCycle(node, cycleNodes, componentByCode, visited, recursionStack, cyclePath)) {
                return String.join(" -> ", cyclePath);
            }
        }

        // Fallback: just list the involved nodes
        return String.join(" <-> ", cycleNodes);
    }

    /**
     * DFS helper that traces through the dependency graph to find and report
     * the exact cycle path.
     */
    private boolean dfsFindCycle(
            String current,
            Set<String> candidateNodes,
            Map<String, PayrollComponent> componentByCode,
            Set<String> visited,
            Set<String> recursionStack,
            List<String> cyclePath) {

        if (recursionStack.contains(current)) {
            // Found the cycle - build the path from the cycle start
            boolean recording = false;
            for (String node : recursionStack) {
                if (node.equals(current)) {
                    recording = true;
                }
                if (recording) {
                    cyclePath.add(node);
                }
            }
            cyclePath.add(current); // Close the cycle
            return true;
        }

        if (visited.contains(current)) {
            return false;
        }

        visited.add(current);
        recursionStack.add(current);

        PayrollComponent component = componentByCode.get(current);
        if (component != null && component.getFormula() != null) {
            Set<String> refs = extractFormulaReferences(component.getFormula());
            for (String ref : refs) {
                if (candidateNodes.contains(ref)) {
                    if (dfsFindCycle(ref, candidateNodes, componentByCode, visited, recursionStack, cyclePath)) {
                        return true;
                    }
                }
            }
        }

        recursionStack.remove(current);
        return false;
    }

    // ===== Formula Reference Extraction =====

    /**
     * Extracts component code references from a SpEL formula string.
     * <p>
     * For example, given "basic * 0.4 + hra * 0.1", this returns {"basic", "hra"}.
     * SpEL keywords (true, false, null, etc.) are excluded.
     *
     * @param formula the SpEL formula string
     * @return set of component codes referenced in the formula
     */
    Set<String> extractFormulaReferences(String formula) {
        if (formula == null || formula.isBlank()) {
            return Collections.emptySet();
        }

        Set<String> references = new LinkedHashSet<>();
        Matcher matcher = COMPONENT_REF_PATTERN.matcher(formula);

        while (matcher.find()) {
            String token = matcher.group(1);
            if (!SPEL_KEYWORDS.contains(token)) {
                references.add(token);
            }
        }

        return references;
    }

    // ===== Validation =====

    /**
     * Validates that all component codes referenced in a formula actually exist.
     */
    private void validateFormulaReferences(PayrollComponent component, List<PayrollComponent> existingComponents) {
        Set<String> refs = extractFormulaReferences(component.getFormula());
        Set<String> existingCodes = existingComponents.stream()
                .map(PayrollComponent::getCode)
                .collect(Collectors.toSet());
        // The component's own code is also valid (though self-reference would be a cycle)
        existingCodes.add(component.getCode());

        Set<String> unknownRefs = refs.stream()
                .filter(ref -> !existingCodes.contains(ref))
                .collect(Collectors.toSet());

        if (!unknownRefs.isEmpty()) {
            throw new BusinessException(
                    "Formula for component '" + component.getCode() +
                    "' references unknown components: " + unknownRefs +
                    ". Available components: " + existingCodes);
        }
    }

    /**
     * Updates the evaluationOrder field on each component based on topological position.
     */
    private void updateEvaluationOrders(List<PayrollComponent> sortedComponents) {
        for (int i = 0; i < sortedComponents.size(); i++) {
            sortedComponents.get(i).setEvaluationOrder(i);
        }
    }

    /**
     * Recomputes and persists the evaluation order for all components of the current tenant.
     * Useful as an admin operation to fix ordering after manual DB changes.
     *
     * @throws BusinessException if circular dependencies are detected
     */
    @Transactional
    public void recomputeEvaluationOrder() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<PayrollComponent> allComponents =
                payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId);

        List<PayrollComponent> sorted = topologicalSort(allComponents);
        updateEvaluationOrders(sorted);

        payrollComponentRepository.saveAll(sorted);
        log.info("Recomputed evaluation order for {} payroll components in tenant {}",
                sorted.size(), tenantId);
    }
}
