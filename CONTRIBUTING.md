# Contributing to Nu-Aura HRMS

Thank you for your interest in contributing to Nu-Aura! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Guidelines](#commit-guidelines)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Ask questions if something is unclear

---

## Getting Started

1. **Fork the repository** (if external contributor)
2. **Clone your fork**: `git clone <your-fork-url>`
3. **Set up the development environment**: See [SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
4. **Create a feature branch**: `git checkout -b feature/AURA-123-your-feature`

---

## Development Workflow

### Branch Strategy

| Branch Type | Pattern | Base Branch | Merge Target |
|-------------|---------|-------------|--------------|
| Feature | `feature/AURA-XXX-description` | `develop` | `develop` |
| Bugfix | `bugfix/AURA-XXX-description` | `develop` | `develop` |
| Hotfix | `hotfix/AURA-XXX-description` | `main` | `main` + `develop` |
| Release | `release/vX.Y.Z` | `develop` | `main` + `develop` |

### Workflow Steps

1. **Create branch** from latest `develop`
2. **Make changes** following code standards
3. **Write tests** for new functionality
4. **Run local tests** before pushing
5. **Push branch** and create Pull Request
6. **Address review feedback**
7. **Squash and merge** after approval

---

## Code Standards

### Backend (Java/Spring Boot)

#### Style Guide
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use 4 spaces for indentation (not tabs)
- Maximum line length: 120 characters

#### Naming Conventions
```java
// Classes: PascalCase
public class EmployeeService { }

// Methods/Variables: camelCase
public Employee findById(UUID id) { }

// Constants: SCREAMING_SNAKE_CASE
public static final int MAX_RETRIES = 3;

// Packages: lowercase
package com.hrms.application.employee;
```

#### Lombok Usage
```java
@Data                    // For DTOs
@Builder                 // For complex objects
@RequiredArgsConstructor // For dependency injection
@Slf4j                   // For logging
```

#### Service Layer Pattern
```java
@Service
@Transactional
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public Employee findById(UUID id) {
        return employeeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee", id));
    }
}
```

### Frontend (TypeScript/React)

#### Style Guide
- ESLint + Prettier configuration provided
- Use TypeScript strict mode
- Prefer functional components with hooks

#### Naming Conventions
```typescript
// Components: PascalCase
export function EmployeeCard({ employee }: EmployeeCardProps) { }

// Hooks: camelCase with use prefix
export function useEmployees() { }

// Types/Interfaces: PascalCase
interface EmployeeCardProps { }

// Files: kebab-case for components, camelCase for utilities
// employee-card.tsx, useEmployees.ts
```

#### Component Structure
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Employee } from '@/lib/types/employee';

interface EmployeeCardProps {
  employee: Employee;
  onEdit?: (id: string) => void;
}

export function EmployeeCard({ employee, onEdit }: EmployeeCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="p-4 border rounded-lg">
      <h3>{employee.firstName} {employee.lastName}</h3>
      {onEdit && (
        <Button onClick={() => onEdit(employee.id)}>Edit</Button>
      )}
    </div>
  );
}
```

#### React Query Patterns
```typescript
// Query keys should be hierarchical
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};
```

---

## Testing Requirements

### Backend Tests

#### Unit Tests
- Test business logic in isolation
- Mock external dependencies
- Aim for 80% service layer coverage

```java
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeService employeeService;

    @Test
    void findById_WhenExists_ReturnsEmployee() {
        // Given
        UUID id = UUID.randomUUID();
        Employee expected = createEmployee(id);
        when(employeeRepository.findById(id)).thenReturn(Optional.of(expected));

        // When
        Employee result = employeeService.findById(id);

        // Then
        assertThat(result).isEqualTo(expected);
    }
}
```

#### Integration Tests
- Test API endpoints with MockMvc
- Use `@SpringBootTest` for full context
- Test database operations with test containers

### Frontend Tests

#### Component Tests
```typescript
import { render, screen } from '@/lib/test-utils';
import { EmployeeCard } from './EmployeeCard';
import { createMockEmployee } from '@/lib/test-utils/fixtures';

describe('EmployeeCard', () => {
  it('renders employee name', () => {
    const employee = createMockEmployee({ firstName: 'John', lastName: 'Doe' });
    render(<EmployeeCard employee={employee} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

#### Hook Tests
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useEmployees } from './useEmployees';
import { createWrapper } from '@/lib/test-utils';

describe('useEmployees', () => {
  it('fetches employees successfully', async () => {
    const { result } = renderHook(() => useEmployees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### Running Tests

```bash
# Backend
cd backend
mvn test                           # All tests
mvn test -Dtest=EmployeeServiceTest # Specific test

# Frontend
cd frontend
npm test                           # All tests
npm test -- --watch               # Watch mode
npm run test:coverage             # With coverage
```

---

## Pull Request Process

### Before Submitting

1. **Update your branch**: `git pull origin develop`
2. **Run all tests**: Ensure they pass locally
3. **Run linters**: Fix any style violations
4. **Update documentation**: If needed

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added for new functionality
- [ ] All tests pass locally
- [ ] Documentation updated if needed
- [ ] No console.log or debug statements
- [ ] No hardcoded secrets or credentials

### PR Title Format

```
[AURA-123] feat: Add webhook delivery system

[AURA-456] fix: Resolve leave balance calculation error

[AURA-789] refactor: Simplify employee search logic
```

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- Added webhook delivery service
- Implemented circuit breaker pattern
- Added retry mechanism with exponential backoff

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Screenshots (if UI changes)
<!-- Add screenshots here -->

## Related Issues
Closes #123
```

---

## Commit Guidelines

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |

### Examples

```bash
feat(webhook): add HMAC signature verification

fix(leave): correct balance calculation for half-day leaves

docs(api): add webhook API documentation

refactor(employee): extract validation logic to separate service

test(attendance): add integration tests for check-in endpoint
```

### Guidelines

- Use present tense: "Add feature" not "Added feature"
- Keep subject line under 72 characters
- Reference issue numbers in footer: `Closes #123`
- Separate subject from body with blank line

---

## Questions?

If you have questions about contributing:
1. Check existing documentation
2. Search closed issues/PRs
3. Ask in the team channel
4. Create an issue with the `question` label
