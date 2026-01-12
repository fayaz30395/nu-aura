--liquibase formatted sql

--changeset hrms:087-01
--comment: Add missing columns to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS accepted_count INTEGER DEFAULT 0;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS requires_acceptance BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_by_name VARCHAR(200);

--changeset hrms:087-02
--comment: Add acceptance columns to announcement_reads table
ALTER TABLE announcement_reads ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE announcement_reads ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN DEFAULT FALSE;

--changeset hrms:087-03
--comment: Create announcement_target_departments table if not exists
CREATE TABLE IF NOT EXISTS announcement_target_departments (
    announcement_id UUID NOT NULL,
    department_id UUID NOT NULL,
    PRIMARY KEY (announcement_id, department_id),
    CONSTRAINT fk_atd_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);

--changeset hrms:087-04
--comment: Create announcement_target_employees table if not exists
CREATE TABLE IF NOT EXISTS announcement_target_employees (
    announcement_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    PRIMARY KEY (announcement_id, employee_id),
    CONSTRAINT fk_ate_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);

--changeset hrms:087-05
--comment: Insert sample announcements for demo tenant
INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Welcome announcement (pinned, requires acceptance)
('a0000001-0001-0001-0001-000000000001', '550e8400-e29b-41d4-a716-446655440000',
 'Welcome to NuLogic HRMS!',
 'We are excited to have you on board! NuLogic HRMS is your one-stop platform for all HR-related activities. Here you can manage your attendance, apply for leaves, view payslips, and much more. Please take a moment to explore the platform and familiarize yourself with its features.

Key Features:
- Self-service portal for personal information updates
- Leave management system
- Attendance tracking
- Performance reviews
- Learning & Development modules

If you have any questions, please reach out to the HR team.',
 'GENERAL', 'HIGH', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days',
 TRUE, TRUE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Policy update announcement (requires acceptance)
('a0000001-0001-0001-0001-000000000002', '550e8400-e29b-41d4-a716-446655440000',
 'Updated Remote Work Policy - Please Review',
 'Dear Team,

We have updated our remote work policy effective from this month. Key changes include:

1. Employees can work from home up to 3 days per week
2. Core hours are 10 AM to 4 PM for all remote workers
3. Team meetings should be scheduled during core hours
4. All remote workers must ensure reliable internet connectivity
5. Security guidelines must be followed when accessing company resources remotely

Please review the full policy document in the company portal and acknowledge your understanding by accepting this announcement.',
 'POLICY_UPDATE', 'HIGH', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days',
 FALSE, TRUE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Holiday announcement
('a0000001-0001-0001-0001-000000000003', '550e8400-e29b-41d4-a716-446655440000',
 'Upcoming Holiday: Republic Day',
 'Dear All,

Please note that the office will remain closed on January 26th (Sunday) for Republic Day.

Since this holiday falls on a Sunday, a compensatory off will be provided on Monday, January 27th.

Enjoy the long weekend!

Best regards,
HR Team',
 'HOLIDAY', 'MEDIUM', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days',
 FALSE, FALSE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Training announcement
('a0000001-0001-0001-0001-000000000004', '550e8400-e29b-41d4-a716-446655440000',
 'Mandatory Security Training - Due by Month End',
 'All employees are required to complete the annual Cybersecurity Awareness Training by the end of this month.

Training Details:
- Duration: 45 minutes
- Platform: Learning Management System (LMS)
- Deadline: Last day of current month

Topics Covered:
1. Password Security
2. Phishing Awareness
3. Data Protection
4. Safe Browsing Practices
5. Incident Reporting

To access the training:
1. Go to Learning & Development section
2. Click on "My Courses"
3. Find "Cybersecurity Awareness 2024"

Non-completion may affect your quarterly performance review.',
 'TRAINING', 'HIGH', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days',
 FALSE, TRUE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Event announcement
('a0000001-0001-0001-0001-000000000005', '550e8400-e29b-41d4-a716-446655440000',
 'Annual Town Hall Meeting - Save the Date!',
 'Join us for our Annual Town Hall Meeting!

Date: Second Friday of next month
Time: 3:00 PM - 5:00 PM
Venue: Main Conference Hall / Virtual (Zoom link will be shared)

Agenda:
- Company Performance Review
- Strategic Goals for Next Year
- Department Highlights
- Employee Recognition Awards
- Open Q&A Session with Leadership

All employees are encouraged to attend. If you have any questions you would like addressed, please submit them through the HR portal by next week.

Refreshments will be served for in-person attendees!',
 'EVENT', 'MEDIUM', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '45 days',
 TRUE, FALSE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Health & Safety announcement
('a0000001-0001-0001-0001-000000000006', '550e8400-e29b-41d4-a716-446655440000',
 'Health & Wellness Program Launch',
 'We are thrilled to announce the launch of our comprehensive Health & Wellness Program!

Benefits Include:
- Free gym membership (partner gyms)
- Mental health counseling sessions
- Yoga and meditation classes (every Wednesday)
- Health checkup camps (quarterly)
- Nutritionist consultation

How to Enroll:
1. Visit the Benefits section in your profile
2. Select "Health & Wellness Program"
3. Choose your preferred benefits
4. Submit enrollment form

The program is available to all full-time employees at no additional cost. Family members can also enroll at a subsidized rate.

Stay healthy, stay productive!',
 'BENEFIT', 'MEDIUM', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days',
 FALSE, FALSE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- IT Maintenance
('a0000001-0001-0001-0001-000000000007', '550e8400-e29b-41d4-a716-446655440000',
 'Scheduled System Maintenance - This Weekend',
 'Please be informed that scheduled maintenance will be performed on our systems this weekend.

Maintenance Window:
- Start: Saturday 11:00 PM
- End: Sunday 5:00 AM

Affected Systems:
- HRMS Portal
- Email Services (brief interruption)
- VPN Access

What to Expect:
- Systems may be intermittently unavailable
- Any unsaved work may be lost
- VPN connections will be terminated

Recommendations:
- Save all work before Saturday evening
- Plan any urgent tasks accordingly
- Contact IT Support for critical issues: support@nulogic.com

We apologize for any inconvenience and thank you for your patience.',
 'IT_MAINTENANCE', 'HIGH', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days',
 FALSE, FALSE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, expires_at, is_pinned, requires_acceptance, read_count, published_by, published_by_name, created_at, updated_at, version)
VALUES
-- Achievement announcement
('a0000001-0001-0001-0001-000000000008', '550e8400-e29b-41d4-a716-446655440000',
 'Congratulations to Our Star Performers!',
 'We are proud to recognize our outstanding employees who have gone above and beyond!

Employee of the Month:
- Engineering: Priya Sharma
- Sales: Rahul Verma
- Customer Success: Anita Desai

Special Recognition:
- Best Team Player: Amit Kumar
- Innovation Award: Sneha Patel
- Customer Hero: Vikram Singh

These individuals have demonstrated exceptional dedication, creativity, and teamwork. Please join us in congratulating them!

Awards ceremony will be held during the next Town Hall meeting.',
 'ACHIEVEMENT', 'MEDIUM', 'PUBLISHED', 'ALL_EMPLOYEES',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days',
 FALSE, FALSE, 0,
 '660e8400-e29b-41d4-a716-446655440000', 'System Administrator',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

--changeset hrms:087-06
--comment: Add announcement permissions if not exist
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'ANNOUNCEMENT_VIEW',
    'View Announcements',
    'View company announcements',
    'ANNOUNCEMENT',
    'VIEW',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ANNOUNCEMENT_VIEW');

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'ANNOUNCEMENT_MANAGE',
    'Manage Announcements',
    'Create and manage company announcements',
    'ANNOUNCEMENT',
    'MANAGE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ANNOUNCEMENT_MANAGE');
