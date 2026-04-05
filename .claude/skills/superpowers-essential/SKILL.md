# Essential Superpowers for NU-AURA

**Purpose**: Core superpowers needed for NU-AURA development  
**Use When**: Development tasks requiring systematic approaches

## 1. Systematic Debugging

**Use**: When fixing bugs or investigating issues

**Process**:

1. **Reproduce**: Confirm bug exists
2. **Isolate**: Identify exact failing component
3. **Diagnose**: Find root cause (not symptoms)
4. **Fix**: Apply minimal fix
5. **Verify**: Confirm fixed + no new bugs
6. **Prevent**: Add test to prevent regression

**Example**:

```
Bug: Payroll calculation wrong for overtime
1. Reproduce: Run payroll with overtime data
2. Isolate: PayrollCalculationService.calculateOvertimePay()
3. Diagnose: Overtime multiplier hardcoded (1.5x) instead of reading from config
4. Fix: Read multiplier from tenant config
5. Verify: Test with various overtime scenarios
6. Prevent: Add unit test for config-driven multiplier
```

## 2. Test-Driven Development

**Use**: When adding new features or fixing bugs

**Red-Green-Refactor**:

1. **Red**: Write failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Clean up code

**Example**:

```java
// 1. RED: Write test first
@Test
void shouldCalculateGratuity() {
    BigDecimal gratuity = payrollService.calculateGratuity(
        employee, yearsOfService = 5
    );
    assertEquals(new BigDecimal("50000"), gratuity);
}

// 2. GREEN: Make it pass
public BigDecimal calculateGratuity(Employee emp, int years) {
    BigDecimal lastSalary = emp.getBasicSalary();
    return lastSalary.multiply(BigDecimal.valueOf(15))
        .multiply(BigDecimal.valueOf(years))
        .divide(BigDecimal.valueOf(26));
}

// 3. REFACTOR: Extract formula constant
private static final BigDecimal GRATUITY_MULTIPLIER = new BigDecimal("15");
private static final BigDecimal WORKING_DAYS = new BigDecimal("26");
```

## 3. Brainstorming

**Use**: When planning complex features or solving difficult problems

**Steps**:

1. **Define Problem**: Clear problem statement
2. **Generate Options**: List all possible approaches
3. **Evaluate**: Pros/cons of each
4. **Decide**: Pick best option with reasoning
5. **Plan**: Break into tasks

**Example**:

```
Problem: Multi-tenant payroll processing is slow (>5min for 1000 employees)

Options:
A. Parallel processing (Spring Batch)
B. Async with Kafka
C. Database optimization (indexes, batch inserts)
D. Cache frequent calculations

Evaluation:
A: ✅ Fast, ❌ Complex, ❌ Resource-heavy
B: ✅ Scales well, ❌ Adds complexity, ❌ Eventual consistency
C: ✅ Simple, ✅ Low risk, ⚠️ Limited improvement
D: ✅ Fast, ✅ Simple, ❌ Cache invalidation complexity

Decision: C (DB optimization) + D (selective caching)
Reason: 80% improvement with low complexity

Plan:
1. Add indexes on tenant_id, payroll_month
2. Batch insert payslips (100 at a time)
3. Cache component formulas (TTL = 1 hour)
4. Measure: Target <1min for 1000 employees
```

## 4. Verification Before Completion

**Use**: Before marking any task complete

**Checklist**:

- [ ] Requirements met (all acceptance criteria)
- [ ] Tests pass (unit, integration, E2E)
- [ ] Code reviewed (2 approvals)
- [ ] No regressions (existing tests still pass)
- [ ] Documentation updated (if needed)
- [ ] Deployed to staging (if applicable)

**Example**:

```
Task: Add leave encashment feature

Verification:
✅ Calculation formula correct (tested)
✅ Approval workflow integrated
✅ Audit logging enabled
✅ Multi-tenant isolated (tested)
✅ All tests pass (95% coverage)
✅ Code reviewed and approved
✅ API docs updated
✅ Deployed to staging

Status: COMPLETE
```

## 5. Dispatching Parallel Agents

**Use**: When task can be split into independent subtasks

**Pattern**:

```
Large Task: Implement NU-Hire Recruitment Module

Split into:
- Agent A: Job postings API + UI
- Agent B: Candidate pipeline + drag-drop
- Agent C: Interview scheduling + calendar
- Agent D: Offer letter generation

Each works independently in own directory:
- app/recruitment/jobs/
- app/recruitment/candidates/
- app/recruitment/interviews/
- app/recruitment/offers/

Merge when all complete
```

**Best For**:

- Independent modules
- Non-overlapping file changes
- Parallel UI development

## 6. Using Git Worktrees

**Use**: When working on multiple features simultaneously

**Commands**:

```bash
# Create worktree for feature
git worktree add ../nu-aura-feature-recruitment feature/recruitment

# Work in separate directory
cd ../nu-aura-feature-recruitment
# Make changes, commit

# Return to main worktree
cd ../nu-aura

# Remove worktree when done
git worktree remove ../nu-aura-feature-recruitment
```

**Benefits**:

- Work on multiple branches simultaneously
- No need to stash changes
- Isolated testing environments

## Success Criteria

- ✅ Bugs fixed systematically (not randomly)
- ✅ All new code has tests (TDD)
- ✅ Complex features planned before coding
- ✅ All tasks verified before completion
- ✅ Large tasks split efficiently
- ✅ Git worktrees used for parallel work
