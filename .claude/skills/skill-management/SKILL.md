---
name: skill-management
description: Use when asked to create, audit, list, rename, or delete a skill under .claude/skills/, or when asked to run an autonomous audit of all project skills. Enforces the 4-skill consolidation (nu-chrome-e2e, nu-migration, nu-permission, skill-management) and the autonomy contract.
---

# Skill Management

**Purpose**: Create, read, write, and manage skills for NU-AURA
**Use When**: Need to create new skills or modify existing ones, or audit the skill set for the
4-skill consolidation.

## Autonomy Contract

- **Runs without further prompts** once invoked. For audit mode, executes the full scan before
  reporting; for create/modify mode, asks at most ONE clarifying question only if the target skill
  name is ambiguous.
- **Halts autonomously** when: the requested skill operation completes AND
  `.claude/helpers/check-skills-autonomy.sh` (if present) exits 0.
- **Never invokes another skill.** Does not call `nu-chrome-e2e`, `nu-migration`, or
  `nu-permission`.
- **Single concern:** skill lifecycle only. Refuses to create a 5th top-level NU-AURA skill outside
  the approved 4 (`nu-chrome-e2e`, `nu-migration`, `nu-permission`, `skill-management`) unless the
  user explicitly overrides the consolidation.

## Autonomous Audit Mode

When asked to "audit skills" or "check skill autonomy":

1. List `.claude/skills/` — verify only the 4 approved skills remain.
2. Verify each has YAML frontmatter (`name:` + `description:`) and an `## Autonomy Contract` block.
3. Run `.claude/helpers/check-skills-autonomy.sh` if present; report its exit code.
4. Report gaps inline — do not spawn sub-agents.

## Core Operations

### 1. Read Skill

**Location**: `.claude/skills/<skill-name>/SKILL.md`

```bash
# List all skills
ls .claude/skills/

# Read specific skill
cat .claude/skills/nu-aura-team-roles/01-engineering-manager-tech-lead.md
```

### 2. Write New Skill

**Structure**:

```markdown
# Skill Name

**Purpose**: What this skill does  
**Use When**: When to invoke this skill

## Core Functionality

### 1. Main Feature
- Description
- Example

### 2. Secondary Feature
- Description
- Example

## Best Practices

- Guideline 1
- Guideline 2

## Success Criteria

- ✅ Criterion 1
- ✅ Criterion 2
```

**Create Skill**:

```bash
mkdir -p .claude/skills/<skill-name>
cat > .claude/skills/<skill-name>/SKILL.md << 'ENDSKILL'
# Content here
ENDSKILL
```

### 3. Modify Existing Skill

1. Read current skill
2. Identify section to modify
3. Update content
4. Verify format (markdown)

### 4. Delete Skill

```bash
rm -rf .claude/skills/<skill-name>
```

## Skill Categories

**NU-AURA Team Roles** (`nu-aura-team-roles/`):

- 01-engineering-manager-tech-lead.md
- 02-product-manager.md
- 03-senior-backend-core-platform.md
- 04-backend-hrms-payroll.md
- 05-backend-hire-grow.md
- 06-backend-fluence.md
- 07-senior-frontend-platform.md
- 08-frontend-hrms.md
- 09-frontend-hire-grow.md
- 10-devops-engineer.md
- 11-qa-engineer.md
- 12-uiux-designer.md
- 13-hr-domain-expert.md

**Essential Skills**:

- `ralphloop-manager/` - Loop task management
- `skill-management/` - This skill (meta-skill)
- `superpowers-essential/` - Critical superpowers

## Best Practices

**Creating Skills**:

- Keep focused (single responsibility)
- Use clear examples
- Define success criteria
- Keep under 200 lines if possible

**Organizing Skills**:

- Group related skills in subdirectories
- Use descriptive names
- Include SKILL.md in each directory

**Maintaining Skills**:

- Update when patterns change
- Remove obsolete skills
- Keep examples current

## Success Criteria

- ✅ Can create new skills in <5 minutes
- ✅ Skills are well-organized and findable
- ✅ Skills follow consistent format
- ✅ Obsolete skills removed promptly
