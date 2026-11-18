-- V350: Release-readiness fixes (G-005, G-014, G-015, H-005). Idempotent, all tenants.
--   G-005 MANAGER gets MEETING:VIEW + MEETING:CREATE (TEAM)
--   G-014 HR_MANAGER/HR_ADMIN get LMS:CERTIFICATE_VIEW (ALL)
--   G-015 MANAGER gets LMS:COURSE_VIEW (TEAM)
--   H-005 default OFFER_STANDARD letter template for every tenant lacking one (copied from V83)
-- Per-tenant loop sets app.current_tenant_id because of FORCE RLS (see V341).

DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, g.scope,
               NOW(), NOW(), 0, false
        FROM roles r
        JOIN (VALUES
                  ('MANAGER',    'MEETING:VIEW',         'TEAM'),
                  ('MANAGER',    'MEETING:CREATE',       'TEAM'),
                  ('MANAGER',    'LMS:COURSE_VIEW',      'TEAM'),
                  ('HR_MANAGER', 'LMS:CERTIFICATE_VIEW', 'ALL'),
                  ('HR_ADMIN',   'LMS:CERTIFICATE_VIEW', 'ALL')
             ) AS g(role_code, perm_code, scope) ON g.role_code = r.code
        JOIN permissions p ON p.code = g.perm_code
                          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        WHERE r.tenant_id = tt.id
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM role_permissions rp
              WHERE rp.role_id = r.id
                AND rp.permission_id = p.id
                AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          );
    END LOOP;
END $$;

DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);
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

        FROM (SELECT tt.id AS id) t
        WHERE NOT EXISTS (SELECT 1 FROM letter_templates lt
                          WHERE lt.code = 'OFFER_STANDARD' AND lt.tenant_id = t.id);
    END LOOP;
END $$;
