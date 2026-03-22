# Ralph Loop Manager

**Purpose**: Manage continuous loop tasks for NU-AURA  
**Use When**: Recurring tasks, build monitoring, bug fixing loops

## Core Functionality

### 1. Loop File Format

```yaml
---
active: true
iteration: 1
max_iterations: 50
completion_promise: "All bugs fixed"
started_at: "2026-03-23T01:00:00Z"
---

Task description
```

**File**: `.claude/ralph-loop.local.md`

### 2. Common Loops

**Bug Fixing**:
- Fix bugs from report
- Test each fix
- Continue until all resolved

**Build Monitoring**:
- Check tests every 10min
- Report failures
- Auto-fix if possible

**Code Quality**:
- Run linter
- Fix style issues
- Report critical only

### 3. Control

- **Start**: Create ralph-loop.local.md
- **Stop**: Set `active: false`
- **Status**: Check iteration count

### 4. Best Practices

- Set `max_iterations` (prevent infinite)
- Define clear completion criteria
- Track progress (iteration count)
- Log results

## Example

```yaml
---
active: true
iteration: 1
max_iterations: 50
completion_promise: "All validation errors fixed"
started_at: "2026-03-23T00:00:00Z"
---

Fix Nu Aura revalidation report bugs
Test and confirm each fix works 100%
```
