G-005 | FIXED | V350 migration | MANAGER gets MEETING:VIEW, MEETING:CREATE (TEAM)
G-014 | FIXED | V350 migration | HR_MANAGER, HR_ADMIN get LMS:CERTIFICATE_VIEW (ALL)
G-015 | FIXED | V350 migration | MANAGER gets LMS:COURSE_VIEW (TEAM)
H-005 | FIXED | V350 migration | OFFER_STANDARD template inserted for every tenant lacking one (V83 body, per-tenant GUC loop)
G-011 | FIXED (backend) | EnrollmentResponse, CourseEnrollmentService, CourseEnrollmentController | courseTitle added to /my-courses via one findAllById; frontend my-learning/page.tsx:165 still prints courseId and must show enrollment.courseTitle (+ add field to CourseEnrollment type in lms.service.ts). The "Completed at 30%" part is data, not touched.
G-004 | SKIPPED | none | needs new endpoint plus frontend search switch (cross-area); not trivial
