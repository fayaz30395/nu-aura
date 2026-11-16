import type {JobRole} from '@/lib/types/hrms/employee';

export interface JobRoleOption {
  value: JobRole;
  label: string;
}

export interface JobRoleGroup {
  group: string;
  items: JobRoleOption[];
}

const role = (value: JobRole, label: string): JobRoleOption => ({value, label});

/** Selectable job roles; values must be members of the backend `Employee.JobRole` enum. */
export const JOB_ROLE_GROUPS: JobRoleGroup[] = [
  {group: 'Engineering', items: [
    role('SOFTWARE_ENGINEER', 'Software Engineer'), role('FRONTEND_DEVELOPER', 'Frontend Developer'),
    role('BACKEND_DEVELOPER', 'Backend Developer'), role('FULLSTACK_DEVELOPER', 'Fullstack Developer'),
    role('DEVOPS_ENGINEER', 'DevOps Engineer'), role('QA_ENGINEER', 'QA Engineer'),
    role('DATA_ENGINEER', 'Data Engineer'), role('MOBILE_DEVELOPER', 'Mobile Developer'),
    role('SYSTEM_ARCHITECT', 'System Architect'), role('TECH_LEAD', 'Tech Lead'),
    role('ENGINEERING_MANAGER', 'Engineering Manager'),
  ]},
  {group: 'Product', items: [
    role('PRODUCT_MANAGER', 'Product Manager'), role('PRODUCT_OWNER', 'Product Owner'),
    role('PRODUCT_ANALYST', 'Product Analyst'),
  ]},
  {group: 'Design', items: [
    role('UI_DESIGNER', 'UI Designer'), role('UX_DESIGNER', 'UX Designer'),
    role('GRAPHIC_DESIGNER', 'Graphic Designer'), role('PRODUCT_DESIGNER', 'Product Designer'),
  ]},
  {group: 'Data & Analytics', items: [
    role('DATA_ANALYST', 'Data Analyst'), role('DATA_SCIENTIST', 'Data Scientist'),
    role('BUSINESS_ANALYST', 'Business Analyst'),
  ]},
  {group: 'Marketing', items: [
    role('MARKETING_MANAGER', 'Marketing Manager'), role('CONTENT_WRITER', 'Content Writer'),
    role('SEO_SPECIALIST', 'SEO Specialist'), role('SOCIAL_MEDIA_MANAGER', 'Social Media Manager'),
    role('DIGITAL_MARKETER', 'Digital Marketer'),
  ]},
  {group: 'Sales', items: [
    role('SALES_REPRESENTATIVE', 'Sales Representative'), role('SALES_MANAGER', 'Sales Manager'),
    role('ACCOUNT_MANAGER', 'Account Manager'), role('BUSINESS_DEVELOPMENT', 'Business Development'),
  ]},
  {group: 'Operations', items: [
    role('OPERATIONS_MANAGER', 'Operations Manager'), role('PROJECT_MANAGER', 'Project Manager'),
    role('SCRUM_MASTER', 'Scrum Master'), role('PROGRAM_MANAGER', 'Program Manager'),
  ]},
  {group: 'HR', items: [
    role('HR_MANAGER', 'HR Manager'), role('HR_GENERALIST', 'HR Generalist'),
    role('RECRUITER', 'Recruiter'), role('TALENT_ACQUISITION', 'Talent Acquisition'),
  ]},
  {group: 'Finance', items: [
    role('ACCOUNTANT', 'Accountant'), role('FINANCIAL_ANALYST', 'Financial Analyst'),
    role('FINANCE_MANAGER', 'Finance Manager'),
  ]},
  {group: 'Admin & Support', items: [
    role('ADMIN_ASSISTANT', 'Admin Assistant'), role('OFFICE_MANAGER', 'Office Manager'),
    role('CUSTOMER_SUPPORT', 'Customer Support'), role('TECH_SUPPORT', 'Tech Support'),
  ]},
  {group: 'Legal', items: [
    role('LEGAL_COUNSEL', 'Legal Counsel'), role('COMPLIANCE_OFFICER', 'Compliance Officer'),
  ]},
  {group: 'Other', items: [
    role('CONSULTANT', 'Consultant'), role('INTERN', 'Intern'), role('OTHER', 'Other'),
  ]},
];

export const JOB_ROLE_VALUES: JobRole[] = JOB_ROLE_GROUPS.flatMap((g) => g.items.map((i) => i.value));
