-- V82: Seed 5 default letter templates with professional HTML content
-- These are system templates (is_system_template = true) seeded for all tenants
-- Note: tenant_id will need to be set per-tenant via application bootstrap or initial setup

-- Since this is a shared-schema multi-tenant system, we insert templates
-- that will be cloned per-tenant during tenant onboarding.
-- For existing tenants, these serve as reference templates.

-- Using a fixed UUID namespace for system templates
-- These can be copied by any tenant using the clone endpoint

-- 1. Offer Letter Template
INSERT INTO letter_templates (id, tenant_id, name, code, description, category, template_content, header_html,
                              footer_html, css_styles, include_company_logo, include_signature, signature_title,
                              signatory_name, signatory_designation, requires_approval, is_active, is_system_template,
                              template_version, available_placeholders, created_at, updated_at, is_deleted)
SELECT gen_random_uuid(),
       t.id,
       'Standard Offer Letter',
       'OFFER_STANDARD',
       'Professional offer letter template for new hires with CTC details and joining date.',
       'OFFER',
       '<p style="text-align: right;">Date: {{currentDate}}</p>
   <p style="text-align: right;">Ref: {{letter.referenceNumber}}</p>

   <p><strong>To,</strong><br/>
   {{candidate.name}}<br/>
   {{candidate.email}}</p>

   <p><strong>Subject: Offer of Employment</strong></p>

   <p>Dear {{candidate.firstName}},</p>

   <p>We are pleased to extend an offer of employment for the position of <strong>{{offer.designation}}</strong> at <strong>{{company.name}}</strong>. After careful evaluation of your skills, experience, and cultural fit, we believe you will be a valuable addition to our team.</p>

   <p><strong>Position Details:</strong></p>
   <ul>
   <li><strong>Designation:</strong> {{offer.designation}}</li>
   <li><strong>Location:</strong> {{job.location}}</li>
   <li><strong>Annual CTC:</strong> {{offer.ctc}}</li>
   <li><strong>Proposed Joining Date:</strong> {{offer.joiningDate}}</li>
   </ul>

   <p>This offer is contingent upon successful completion of background verification and submission of all required documents.</p>

   <p>Please confirm your acceptance of this offer by signing and returning this letter within 7 business days. If you have any questions, please do not hesitate to reach out to our HR team.</p>

   <p>We look forward to welcoming you to {{company.name}}!</p>',
       NULL,
       NULL,
       NULL,
       true,
       true,
       'For and on behalf of',
       NULL,
       'Head of Human Resources',
       true,
       true,
       true,
       1,
       'candidate.name,candidate.firstName,candidate.email,offer.designation,offer.ctc,offer.joiningDate,job.location,company.name,currentDate,letter.referenceNumber',
       NOW(),
       NOW(),
       false
FROM (SELECT DISTINCT tenant_id AS id FROM employees LIMIT 50) t
WHERE NOT EXISTS (SELECT 1 FROM letter_templates lt WHERE lt.code = 'OFFER_STANDARD' AND lt.tenant_id = t.id);

-- 2. Appointment Letter Template
INSERT INTO letter_templates (id, tenant_id, name, code, description, category, template_content, header_html,
                              footer_html, css_styles, include_company_logo, include_signature, signature_title,
                              signatory_name, signatory_designation, requires_approval, is_active, is_system_template,
                              template_version, available_placeholders, created_at, updated_at, is_deleted)
SELECT gen_random_uuid(),
       t.id,
       'Standard Appointment Letter',
       'APPOINTMENT_STANDARD',
       'Formal appointment letter issued upon joining with terms and conditions.',
       'APPOINTMENT',
       '<p style="text-align: right;">Date: {{currentDate}}</p>
   <p style="text-align: right;">Ref: {{letter.referenceNumber}}</p>

   <p><strong>To,</strong><br/>
   {{employee.name}}<br/>
   Employee ID: {{employee.id}}</p>

   <p><strong>Subject: Letter of Appointment</strong></p>

   <p>Dear {{employee.name}},</p>

   <p>With reference to your application and subsequent discussions, we are pleased to appoint you as <strong>{{employee.designation}}</strong> in the <strong>{{employee.department}}</strong> department at <strong>{{company.name}}</strong>, effective from <strong>{{employee.dateOfJoining}}</strong>.</p>

   <p><strong>Terms of Employment:</strong></p>
   <ol>
   <li>You will be on probation for a period of 6 months from the date of joining.</li>
   <li>During the probation period, either party may terminate the employment with 30 days written notice.</li>
   <li>Post confirmation, the notice period will be 60 days from either side.</li>
   <li>Your compensation and benefits are as per the annexure attached herewith.</li>
   <li>You shall abide by the company policies, rules, and regulations as amended from time to time.</li>
   </ol>

   <p>Please sign and return a copy of this letter as acceptance of the terms and conditions mentioned above.</p>

   <p>We wish you a successful and rewarding career with {{company.name}}.</p>',
       NULL,
       NULL,
       NULL,
       true,
       true,
       'For and on behalf of',
       NULL,
       'Head of Human Resources',
       true,
       true,
       true,
       1,
       'employee.name,employee.id,employee.designation,employee.department,employee.dateOfJoining,company.name,currentDate,letter.referenceNumber',
       NOW(),
       NOW(),
       false
FROM (SELECT DISTINCT tenant_id AS id FROM employees LIMIT 50) t
WHERE NOT EXISTS (SELECT 1 FROM letter_templates lt WHERE lt.code = 'APPOINTMENT_STANDARD' AND lt.tenant_id = t.id);

-- 3. Experience Letter Template
INSERT INTO letter_templates (id, tenant_id, name, code, description, category, template_content, header_html,
                              footer_html, css_styles, include_company_logo, include_signature, signature_title,
                              signatory_name, signatory_designation, requires_approval, is_active, is_system_template,
                              template_version, available_placeholders, created_at, updated_at, is_deleted)
SELECT gen_random_uuid(),
       t.id,
       'Standard Experience Letter',
       'EXPERIENCE_STANDARD',
       'Experience certificate issued to employees upon separation.',
       'EXPERIENCE',
       '<p style="text-align: right;">Date: {{currentDate}}</p>
   <p style="text-align: right;">Ref: {{letter.referenceNumber}}</p>

   <p style="text-align: center;"><strong><u>EXPERIENCE CERTIFICATE</u></strong></p>

   <p><strong>To Whom It May Concern,</strong></p>

   <p>This is to certify that <strong>{{employee.name}}</strong> (Employee ID: {{employee.id}}) was employed with <strong>{{company.name}}</strong> from <strong>{{employee.dateOfJoining}}</strong> to <strong>{{employee.lastWorkingDay}}</strong> as <strong>{{employee.designation}}</strong> in the <strong>{{employee.department}}</strong> department.</p>

   <p>During the tenure with us, we found {{employee.firstName}} to be sincere, hardworking, and dedicated. {{employee.firstName}} has made significant contributions to the team and the organization.</p>

   <p>{{employee.firstName}} has been relieved from duties on {{employee.lastWorkingDay}} after completing all formalities and handing over responsibilities.</p>

   <p>We wish {{employee.firstName}} all the very best in future endeavors.</p>',
       NULL,
       NULL,
       NULL,
       true,
       true,
       'For and on behalf of',
       NULL,
       'Head of Human Resources',
       true,
       true,
       true,
       1,
       'employee.name,employee.firstName,employee.id,employee.designation,employee.department,employee.dateOfJoining,employee.lastWorkingDay,company.name,currentDate,letter.referenceNumber',
       NOW(),
       NOW(),
       false
FROM (SELECT DISTINCT tenant_id AS id FROM employees LIMIT 50) t
WHERE NOT EXISTS (SELECT 1 FROM letter_templates lt WHERE lt.code = 'EXPERIENCE_STANDARD' AND lt.tenant_id = t.id);

-- 4. Relieving Letter Template
INSERT INTO letter_templates (id, tenant_id, name, code, description, category, template_content, header_html,
                              footer_html, css_styles, include_company_logo, include_signature, signature_title,
                              signatory_name, signatory_designation, requires_approval, is_active, is_system_template,
                              template_version, available_placeholders, created_at, updated_at, is_deleted)
SELECT gen_random_uuid(),
       t.id,
       'Standard Relieving Letter',
       'RELIEVING_STANDARD',
       'Official relieving letter issued upon completion of notice period and full & final settlement.',
       'RELIEVING',
       '<p style="text-align: right;">Date: {{currentDate}}</p>
   <p style="text-align: right;">Ref: {{letter.referenceNumber}}</p>

   <p><strong>To,</strong><br/>
   {{employee.name}}<br/>
   Employee ID: {{employee.id}}</p>

   <p><strong>Subject: Relieving Letter</strong></p>

   <p>Dear {{employee.name}},</p>

   <p>This is to inform you that your resignation has been accepted and you are hereby relieved from your duties at <strong>{{company.name}}</strong> effective <strong>{{employee.lastWorkingDay}}</strong>.</p>

   <p>You were associated with {{company.name}} from <strong>{{employee.dateOfJoining}}</strong> to <strong>{{employee.lastWorkingDay}}</strong> as <strong>{{employee.designation}}</strong> in the <strong>{{employee.department}}</strong> department.</p>

   <p>We confirm that you have completed all handover formalities and returned all company property. Your full and final settlement will be processed as per company policy.</p>

   <p>We thank you for your contributions during your tenure with us and wish you success in your future career.</p>',
       NULL,
       NULL,
       NULL,
       true,
       true,
       'For and on behalf of',
       NULL,
       'Head of Human Resources',
       true,
       true,
       true,
       1,
       'employee.name,employee.id,employee.designation,employee.department,employee.dateOfJoining,employee.lastWorkingDay,company.name,currentDate,letter.referenceNumber',
       NOW(),
       NOW(),
       false
FROM (SELECT DISTINCT tenant_id AS id FROM employees LIMIT 50) t
WHERE NOT EXISTS (SELECT 1 FROM letter_templates lt WHERE lt.code = 'RELIEVING_STANDARD' AND lt.tenant_id = t.id);

-- 5. Salary Revision Letter Template
INSERT INTO letter_templates (id, tenant_id, name, code, description, category, template_content, header_html,
                              footer_html, css_styles, include_company_logo, include_signature, signature_title,
                              signatory_name, signatory_designation, requires_approval, is_active, is_system_template,
                              template_version, available_placeholders, created_at, updated_at, is_deleted)
SELECT gen_random_uuid(),
       t.id,
       'Standard Salary Revision Letter',
       'SALARY_REVISION_STANDARD',
       'Annual salary revision letter with revised compensation details.',
       'SALARY_REVISION',
       '<p style="text-align: right;">Date: {{currentDate}}</p>
   <p style="text-align: right;">Ref: {{letter.referenceNumber}}</p>

   <p><strong>CONFIDENTIAL</strong></p>

   <p><strong>To,</strong><br/>
   {{employee.name}}<br/>
   Employee ID: {{employee.id}}<br/>
   {{employee.designation}}, {{employee.department}}</p>

   <p><strong>Subject: Salary Revision</strong></p>

   <p>Dear {{employee.name}},</p>

   <p>In recognition of your valuable contributions and consistent performance, we are pleased to inform you of a revision in your compensation effective <strong>{{letter.effectiveDate}}</strong>.</p>

   <p>Your revised annual CTC will be <strong>{{employee.salary}}</strong>. A detailed breakup of your revised salary structure is attached as an annexure to this letter.</p>

   <p>We appreciate your dedication and hard work and look forward to your continued contributions to the success of {{company.name}}.</p>

   <p>This letter is strictly confidential and intended solely for the addressee. Please do not share the contents with colleagues.</p>

   <p>Congratulations on this well-deserved recognition!</p>',
       NULL,
       NULL,
       NULL,
       true,
       true,
       'For and on behalf of',
       NULL,
       'Head of Human Resources',
       true,
       true,
       true,
       1,
       'employee.name,employee.id,employee.designation,employee.department,employee.salary,company.name,currentDate,letter.referenceNumber,letter.effectiveDate',
       NOW(),
       NOW(),
       false
FROM (SELECT DISTINCT tenant_id AS id FROM employees LIMIT 50) t
WHERE NOT EXISTS (SELECT 1 FROM letter_templates lt WHERE lt.code = 'SALARY_REVISION_STANDARD' AND lt.tenant_id = t.id);
