/**
 * Tests for notificationRoutes utility
 * Run with: npx vitest run lib/utils/notificationRoutes.test.ts
 * Or setup Jest and run: npm test
 */

import {
  getNotificationRoute,
  isNotificationTypeSupported,
  getSupportedNotificationTypes,
  notificationRouteConfig,
} from './notificationRoutes';

describe('getNotificationRoute', () => {
  describe('actionUrl priority', () => {
    it('should use actionUrl when provided', () => {
      const notification = {
        type: 'LEAVE_APPROVED',
        actionUrl: '/custom/route',
      };
      expect(getNotificationRoute(notification)).toBe('/custom/route');
    });

    it('should prefer actionUrl over type mapping', () => {
      const notification = {
        type: 'ATTENDANCE_MARKED',
        relatedEntityId: '123',
        actionUrl: '/override/path',
      };
      expect(getNotificationRoute(notification)).toBe('/override/path');
    });
  });

  describe('leave notifications', () => {
    it('should route LEAVE_APPROVED with id to specific leave request', () => {
      expect(getNotificationRoute({ type: 'LEAVE_APPROVED', relatedEntityId: 'abc123' }))
        .toBe('/leave/requests/abc123');
    });

    it('should route LEAVE_APPROVED without id to leave requests list', () => {
      expect(getNotificationRoute({ type: 'LEAVE_APPROVED' }))
        .toBe('/leave/requests');
    });

    it('should route LEAVE_REJECTED with id', () => {
      expect(getNotificationRoute({ type: 'LEAVE_REJECTED', relatedEntityId: 'def456' }))
        .toBe('/leave/requests/def456');
    });

    it('should route LEAVE_PENDING', () => {
      expect(getNotificationRoute({ type: 'LEAVE_PENDING', relatedEntityId: 'ghi789' }))
        .toBe('/leave/requests/ghi789');
    });

    it('should route LEAVE_REQUEST', () => {
      expect(getNotificationRoute({ type: 'LEAVE_REQUEST' }))
        .toBe('/leave/requests');
    });

    it('should route LEAVE_CANCELLED', () => {
      expect(getNotificationRoute({ type: 'LEAVE_CANCELLED', relatedEntityId: 'xyz' }))
        .toBe('/leave/requests/xyz');
    });
  });

  describe('attendance notifications', () => {
    it('should route ATTENDANCE_MARKED to attendance page', () => {
      expect(getNotificationRoute({ type: 'ATTENDANCE_MARKED' }))
        .toBe('/me/attendance');
    });

    it('should route ATTENDANCE_ALERT to attendance page', () => {
      expect(getNotificationRoute({ type: 'ATTENDANCE_ALERT' }))
        .toBe('/me/attendance');
    });

    it('should route CHECK_IN_REMINDER to attendance page', () => {
      expect(getNotificationRoute({ type: 'CHECK_IN_REMINDER' }))
        .toBe('/me/attendance');
    });

    it('should route LATE_ARRIVAL to attendance page', () => {
      expect(getNotificationRoute({ type: 'LATE_ARRIVAL' }))
        .toBe('/me/attendance');
    });

    it('should route REGULARIZATION_REQUESTED to regularizations page', () => {
      expect(getNotificationRoute({ type: 'REGULARIZATION_REQUESTED' }))
        .toBe('/attendance/regularizations');
    });

    it('should route REGULARIZATION_APPROVED to attendance page', () => {
      expect(getNotificationRoute({ type: 'REGULARIZATION_APPROVED' }))
        .toBe('/me/attendance');
    });
  });

  describe('payroll notifications', () => {
    it('should route PAYROLL_GENERATED with id to specific payroll', () => {
      expect(getNotificationRoute({ type: 'PAYROLL_GENERATED', relatedEntityId: 'pay123' }))
        .toBe('/payroll/pay123');
    });

    it('should route PAYROLL_GENERATED without id to payroll list', () => {
      expect(getNotificationRoute({ type: 'PAYROLL_GENERATED' }))
        .toBe('/me/payroll');
    });

    it('should route SALARY_CREDITED to payroll page', () => {
      expect(getNotificationRoute({ type: 'SALARY_CREDITED' }))
        .toBe('/me/payroll');
    });

    it('should route PAYSLIP_AVAILABLE to payroll page', () => {
      expect(getNotificationRoute({ type: 'PAYSLIP_AVAILABLE' }))
        .toBe('/me/payroll');
    });
  });

  describe('document notifications', () => {
    it('should route DOCUMENT_UPLOADED to documents page', () => {
      expect(getNotificationRoute({ type: 'DOCUMENT_UPLOADED' }))
        .toBe('/me/documents');
    });

    it('should route DOCUMENT_REQUIRED to documents page', () => {
      expect(getNotificationRoute({ type: 'DOCUMENT_REQUIRED' }))
        .toBe('/me/documents');
    });

    it('should route DOCUMENT_EXPIRING to documents page', () => {
      expect(getNotificationRoute({ type: 'DOCUMENT_EXPIRING' }))
        .toBe('/me/documents');
    });
  });

  describe('performance notifications', () => {
    it('should route PERFORMANCE_REVIEW_DUE to reviews page', () => {
      expect(getNotificationRoute({ type: 'PERFORMANCE_REVIEW_DUE' }))
        .toBe('/performance/reviews');
    });

    it('should route PERFORMANCE_GOAL_ASSIGNED to goals page', () => {
      expect(getNotificationRoute({ type: 'PERFORMANCE_GOAL_ASSIGNED' }))
        .toBe('/performance/goals');
    });

    it('should route PERFORMANCE_FEEDBACK_RECEIVED to feedback page', () => {
      expect(getNotificationRoute({ type: 'PERFORMANCE_FEEDBACK_RECEIVED' }))
        .toBe('/performance/feedback');
    });
  });

  describe('expense notifications', () => {
    it('should route EXPENSE_APPROVED to expenses page', () => {
      expect(getNotificationRoute({ type: 'EXPENSE_APPROVED' }))
        .toBe('/expenses');
    });

    it('should route EXPENSE_PENDING_APPROVAL to approvals page', () => {
      expect(getNotificationRoute({ type: 'EXPENSE_PENDING_APPROVAL' }))
        .toBe('/expenses/approvals');
    });
  });

  describe('recruitment notifications', () => {
    it('should route APPLICATION_RECEIVED with id to specific application', () => {
      expect(getNotificationRoute({ type: 'APPLICATION_RECEIVED', relatedEntityId: 'app123' }))
        .toBe('/recruitment/applications/app123');
    });

    it('should route INTERVIEW_SCHEDULED with id to specific interview', () => {
      expect(getNotificationRoute({ type: 'INTERVIEW_SCHEDULED', relatedEntityId: 'int456' }))
        .toBe('/recruitment/interviews/int456');
    });
  });

  describe('training notifications', () => {
    it('should route TRAINING_ASSIGNED to training page', () => {
      expect(getNotificationRoute({ type: 'TRAINING_ASSIGNED' }))
        .toBe('/training');
    });

    it('should route CERTIFICATION_EXPIRING to certifications page', () => {
      expect(getNotificationRoute({ type: 'CERTIFICATION_EXPIRING' }))
        .toBe('/training/certifications');
    });
  });

  describe('celebration notifications', () => {
    it('should route BIRTHDAY to dashboard', () => {
      expect(getNotificationRoute({ type: 'BIRTHDAY' }))
        .toBe('/dashboard');
    });

    it('should route ANNIVERSARY to dashboard', () => {
      expect(getNotificationRoute({ type: 'ANNIVERSARY' }))
        .toBe('/dashboard');
    });

    it('should route WORK_ANNIVERSARY to dashboard', () => {
      expect(getNotificationRoute({ type: 'WORK_ANNIVERSARY' }))
        .toBe('/dashboard');
    });
  });

  describe('system notifications', () => {
    it('should route ANNOUNCEMENT to announcements page', () => {
      expect(getNotificationRoute({ type: 'ANNOUNCEMENT' }))
        .toBe('/announcements');
    });

    it('should route POLICY_UPDATE to policies page', () => {
      expect(getNotificationRoute({ type: 'POLICY_UPDATE' }))
        .toBe('/policies');
    });

    it('should route ONBOARDING_TASK to onboarding page', () => {
      expect(getNotificationRoute({ type: 'ONBOARDING_TASK' }))
        .toBe('/onboarding');
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase type', () => {
      expect(getNotificationRoute({ type: 'leave_approved', relatedEntityId: 'id1' }))
        .toBe('/leave/requests/id1');
    });

    it('should handle mixed case type', () => {
      expect(getNotificationRoute({ type: 'Attendance_Marked' }))
        .toBe('/me/attendance');
    });
  });

  describe('fuzzy matching', () => {
    it('should match CUSTOM_LEAVE_NOTIFICATION via fuzzy match', () => {
      expect(getNotificationRoute({ type: 'CUSTOM_LEAVE_NOTIFICATION' }))
        .toBe('/leave/requests');
    });

    it('should match MY_ATTENDANCE_ISSUE via fuzzy match', () => {
      expect(getNotificationRoute({ type: 'MY_ATTENDANCE_ISSUE' }))
        .toBe('/me/attendance');
    });

    it('should match NEW_PAYROLL_UPDATE via fuzzy match', () => {
      expect(getNotificationRoute({ type: 'NEW_PAYROLL_UPDATE' }))
        .toBe('/me/payroll');
    });

    it('should match TEAM_UPDATE via fuzzy match', () => {
      expect(getNotificationRoute({ type: 'TEAM_UPDATE' }))
        .toBe('/team');
    });
  });

  describe('default fallback', () => {
    it('should return dashboard for unknown notification type', () => {
      expect(getNotificationRoute({ type: 'COMPLETELY_UNKNOWN_TYPE' }))
        .toBe('/dashboard');
    });

    it('should return dashboard when type is undefined', () => {
      expect(getNotificationRoute({}))
        .toBe('/dashboard');
    });

    it('should return dashboard when type is empty string', () => {
      expect(getNotificationRoute({ type: '' }))
        .toBe('/dashboard');
    });
  });
});

describe('isNotificationTypeSupported', () => {
  it('should return true for supported types', () => {
    expect(isNotificationTypeSupported('LEAVE_APPROVED')).toBe(true);
    expect(isNotificationTypeSupported('ATTENDANCE_MARKED')).toBe(true);
    expect(isNotificationTypeSupported('PAYROLL_GENERATED')).toBe(true);
  });

  it('should return true for fuzzy matched types', () => {
    expect(isNotificationTypeSupported('CUSTOM_LEAVE_TYPE')).toBe(true);
    expect(isNotificationTypeSupported('NEW_ATTENDANCE_ALERT')).toBe(true);
  });

  it('should return false for unknown types', () => {
    expect(isNotificationTypeSupported('COMPLETELY_RANDOM')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isNotificationTypeSupported('leave_approved')).toBe(true);
    expect(isNotificationTypeSupported('Attendance_Marked')).toBe(true);
  });
});

describe('getSupportedNotificationTypes', () => {
  it('should return an array of all supported types', () => {
    const types = getSupportedNotificationTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });

  it('should include common notification types', () => {
    const types = getSupportedNotificationTypes();
    expect(types).toContain('LEAVE_APPROVED');
    expect(types).toContain('ATTENDANCE_MARKED');
    expect(types).toContain('PAYROLL_GENERATED');
    expect(types).toContain('DOCUMENT_UPLOADED');
    expect(types).toContain('ANNOUNCEMENT');
  });

  it('should match the keys in notificationRouteConfig', () => {
    const types = getSupportedNotificationTypes();
    const configKeys = Object.keys(notificationRouteConfig);
    expect(types).toEqual(configKeys);
  });
});

describe('notificationRouteConfig', () => {
  it('should have string or function values for all entries', () => {
    for (const [_key, value] of Object.entries(notificationRouteConfig)) {
      expect(['string', 'function']).toContain(typeof value);
    }
  });

  it('should have all function routes return strings', () => {
    for (const [_key, value] of Object.entries(notificationRouteConfig)) {
      if (typeof value === 'function') {
        expect(typeof value('test-id')).toBe('string');
        expect(typeof value(undefined)).toBe('string');
      }
    }
  });
});
