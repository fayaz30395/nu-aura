# Skill Management

**Purpose**: Create, read, write, and manage skills for NU-AURA  
**Use When**: Need to create new skills or modify existing ones

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
