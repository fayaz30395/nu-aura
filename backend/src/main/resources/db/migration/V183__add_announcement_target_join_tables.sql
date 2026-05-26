-- ============================================================================
-- V183: Add Announcement element-collection join tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcement_target_departments
(
  announcement_id UUID NOT NULL,
  department_id UUID NOT NULL,
  PRIMARY KEY (announcement_id, department_id),
  CONSTRAINT fk_announcement_target_departments_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcement_target_employees
(
  announcement_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  PRIMARY KEY (announcement_id, employee_id),
  CONSTRAINT fk_announcement_target_employees_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcement_target_departments_department
  ON announcement_target_departments(department_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_employees_employee
  ON announcement_target_employees(employee_id);
