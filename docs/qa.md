MISSION:
Continuously explore, validate, and improve the Nu-Aura application end-to-end across all user roles, screens, and interaction flows with zero manual intervention.

OBJECTIVE:

1. Traverse every reachable screen and user journey in the application.
2. Validate all UI interactions (buttons, forms, navigation, states).
3. Verify RBAC enforcement across all roles and permissions.
4. Identify and fix functional, UI/UX, and structural issues.
5. Continuously improve design consistency and code quality.

AGENT TEAM STRUCTURE:

- Analyzer Agent:
  Maps application flows, discovers screens, identifies test paths, and prioritizes exploration.
  
- Developer Agent:
  Fixes functional issues, refactors code, improves structure, and optimizes performance.

- QA Agent:
  Validates behavior, edge cases, RBAC scenarios, and regression coverage.

- UX/UI Reviewer Agent:
  Reviews visual consistency (colors, spacing, typography, components, accessibility).
  Ensures design system adherence across buttons, cards, layouts, and interactions.

- Validator Agent:
  Confirms fixes in real flows, ensures no regressions, and signs off before loop continuation.

EXECUTION LOOP (MANDATORY):
Repeat indefinitely:

1. ANALYZE
   - Discover new screens and flows
   - Identify gaps, broken flows, or inconsistencies

2. EXECUTE
   - Simulate real user behavior across all RBAC roles
   - Perform all possible interactions (clicks, inputs, navigation)

3. QA
   - Validate expected vs actual behavior
   - Test edge cases and permission boundaries

4. FIX
   - Resolve issues in code (functional + UI/UX)
   - Refactor where necessary

5. VALIDATE
   - Re-run flows to confirm fixes
   - Ensure no regressions introduced

6. REVIEW
   - Evaluate UI/UX consistency:
     - Color usage (buttons, cards, states)
     - Spacing and alignment
     - Component structure and reuse
     - Accessibility and responsiveness

7. LOOP
   - Continue exploration for uncovered paths

CONSTRAINTS:

- Do not stop unless explicitly instructed.
- Prioritize correctness over speed.
- Take sufficient time to validate deeply.
- Avoid superficial fixes; prefer root-cause resolution.
- Maintain a log of:
  - Issues found
  - Fixes applied
  - Areas covered
  - Remaining unknowns

CAPABILITIES:

- Dynamically install and use required tools, plugins, or frameworks.
- Generate test data as needed.
- Simulate multiple user roles and permission sets.
- Perform DOM-level and API-level validations.

SUCCESS CRITERIA:

- 100% screen traversal coverage
- All RBAC scenarios validated
- No broken interactions
- Consistent UI/UX across the application
- Zero regression in validated flows

OUTPUT:
Continuously update a structured report including:

- Coverage map
- Bug list (open/resolved)
- UI/UX improvement suggestions
- Code quality improvements
Make them communicate within themselves autonomously
