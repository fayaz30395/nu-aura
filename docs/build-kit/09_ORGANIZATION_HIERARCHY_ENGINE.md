# Organization Hierarchy Engine Architecture

The Organization Hierarchy Engine models the structural reality of an enterprise. It manages
entities like Legal Companies, Business Units, Departments, and Teams. More importantly, it maps the
precise reporting relationships between employees.

## 1. Structural Entities

### Legal Entities (The Fiscal View)

Companies and Subsidiaries. Essential for Payroll and Compliance.

- **Company:** The overarching tenant (e.g., 'Acme Corp').
- **Legal Entity:** Subsidiary registrations (e.g., 'Acme India Pvt Ltd', 'Acme US Inc'). Payroll
  runs are strictly scoped at this level due to specific tax compliance rules.

### Operational Hierarchy

How the business organizes its work.

- **Business Unit (BU):** Highest operational division (e.g., 'Cloud Services', 'Consumer Devices').
- **Department:** Functional groups within a BU (e.g., 'Engineering', 'Marketing'). Uses a
  self-referencing hierarchy (`parent_department_id`) to support infinite nesting (e.g., '
  Engineering' -> 'Backend' -> 'Payments Team').
- **Location:** Physical or virtual work locations. Determines shift timings, timezone mappings, and
  location-specific holiday calendars.
- **Cost Center:** Financial buckets mapped to Departments or Projects, crucial for Expense tracking
  and Budgeting.

### Job Architecture

- **Designation (Job Title):** E.g., 'Software Engineer II', 'VP of Sales'.
- **Job Level (Band/Grade):** Grouping designations into compensation bands (e.g., 'L4', 'E2').
  Dictates default eligibility for benefits (e.g., L5 and above get Business Class travel).

## 2. Reporting Relationships

The system must support complex matrix reporting, as modern enterprises rarely operate on a strict
1-to-1 linear hierarchy.

### A. Line Manager (Direct Reporting)

- The primary manager responsible for the employee's day-to-day work, appraisals, and standard
  approvals (Leaves, Expenses).
- Modelled as a self-referencing `reporting_manager_id` foreign key on the `employee_job` table.

### B. Matrix / Project Manager (Dotted Line)

- Employees may report to a different manager for a specific project or functional alignment.
- A Software Engineer reports to an 'Engineering Manager' (Line) but works under a 'Product
  Manager' (Matrix) for a specific squad.
- Modelled via a junction table `employee_matrix_manager` capturing the `manager_id` and the
  `relationship_type` (e.g., 'Project Lead', 'Scrum Master').

### C. HR Business Partner (HRBP)

- Every employee is mapped to specific HR representatives based on their Department or Location.
- Used for escalated approvals or sensitive issues (e.g., Harassment complaints, Salary
  discussions).

## 3. Tree Generation & Traversal

Generating the classic "Organization Chart" is a computationally expensive operation if done
naively.

### The Problem

Fetching the entire org tree for a 10,000-employee company involves massive recursive queries.

### The Solution (Closure Table or Materialized Paths)

To optimize tree traversal for both rendering the visual Org Chart and executing RBAC queries (
e.g., "Can Manager A see Employee B's salary?"):

- **Closure Table Pattern:** Maintain a separate table `org_hierarchy_paths` storing all direct and
  indirect ancestor-descendant relationships along with their depth.
  - *Example Row:* `ancestor_id: 100` (CEO), `descendant_id: 500` (Jr Dev), `depth: 4`.
  - *Query Benefit:* Getting all subordinates (direct + indirect) for a VP is a single indexed
    SELECT rather than a recursive CTE.

## 4. Hierarchy-Driven Workflows

The Org Engine heavily feeds into other systems:

- **Approval Engine:** Uses the tree to dynamically resolve the `REPORTING_MANAGER` or escalate to a
  `DEPARTMENT_HEAD` for workflow steps.
- **Performance Service:** Automatically assigns appraisal review tasks based on the Line Manager
  mapping.
- **Data Scoping (RBAC):** Ensures users can only view data scoped to their subtree. A Director of
  Engineering can view salaries for the entire Engineering department, but not Marketing.
