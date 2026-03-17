import { describe, it, expect } from 'vitest';
import {
  toBadgeVariant,
  isValidGender,
  isValidEmploymentType,
  isValidEmployeeLevel,
  isValidEmployeeStatus,
  isValidJobRole,
  toGender,
  toEmploymentType,
  toEmployeeLevel,
  toEmployeeStatus,
  toJobRole,
  isPageResponse,
  extractContent,
  extractPaginationMeta,
  isValidPriority,
  toPriority,
  isValidTaskStatus,
  toTaskStatus,
  assertDefined,
  narrowResponse,
  isAxiosError,
  is401Error,
  is403Error,
  isNetworkError,
  createSelectHandler,
  type PageResponse,
} from '../type-guards';

describe('type-guards', () => {
  describe('toBadgeVariant', () => {
    it('returns success for completed states', () => {
      expect(toBadgeVariant('COMPLETED')).toBe('success');
      expect(toBadgeVariant('APPROVED')).toBe('success');
      expect(toBadgeVariant('ACTIVE')).toBe('success');
    });

    it('returns warning for pending states', () => {
      expect(toBadgeVariant('PENDING')).toBe('warning');
      expect(toBadgeVariant('IN_PROGRESS')).toBe('warning');
      expect(toBadgeVariant('DRAFT')).toBe('warning');
    });

    it('returns destructive for rejected states', () => {
      expect(toBadgeVariant('REJECTED')).toBe('destructive');
      expect(toBadgeVariant('CANCELLED')).toBe('destructive');
      expect(toBadgeVariant('FAILED')).toBe('destructive');
    });

    it('returns secondary for inactive states', () => {
      expect(toBadgeVariant('INACTIVE')).toBe('secondary');
      expect(toBadgeVariant('ARCHIVED')).toBe('secondary');
      expect(toBadgeVariant('CLOSED')).toBe('secondary');
    });

    it('returns primary for new states', () => {
      expect(toBadgeVariant('NEW')).toBe('primary');
      expect(toBadgeVariant('OPEN')).toBe('primary');
    });

    it('returns default for unknown or null/undefined', () => {
      expect(toBadgeVariant('UNKNOWN')).toBe('default');
      expect(toBadgeVariant(null)).toBe('default');
      expect(toBadgeVariant(undefined)).toBe('default');
      expect(toBadgeVariant('')).toBe('default');
    });

    it('handles case insensitivity and special characters', () => {
      expect(toBadgeVariant('completed')).toBe('success');
      expect(toBadgeVariant('PENDING-NEW')).toBe('warning');
      expect(toBadgeVariant('in-progress')).toBe('warning');
    });
  });

  describe('Gender type guards', () => {
    it('isValidGender accepts valid genders', () => {
      expect(isValidGender('MALE')).toBe(true);
      expect(isValidGender('FEMALE')).toBe(true);
      expect(isValidGender('OTHER')).toBe(true);
      expect(isValidGender('PREFER_NOT_TO_SAY')).toBe(true);
    });

    it('isValidGender rejects invalid genders', () => {
      expect(isValidGender('UNKNOWN')).toBe(false);
      expect(isValidGender('')).toBe(false);
      expect(isValidGender('male')).toBe(false);
    });

    it('toGender converts valid gender or returns undefined', () => {
      expect(toGender('MALE')).toBe('MALE');
      expect(toGender('FEMALE')).toBe('FEMALE');
      expect(toGender('INVALID')).toBeUndefined();
      expect(toGender(null)).toBeUndefined();
      expect(toGender(undefined)).toBeUndefined();
    });
  });

  describe('EmploymentType type guards', () => {
    it('isValidEmploymentType accepts valid types', () => {
      expect(isValidEmploymentType('FULL_TIME')).toBe(true);
      expect(isValidEmploymentType('PART_TIME')).toBe(true);
      expect(isValidEmploymentType('CONTRACT')).toBe(true);
    });

    it('isValidEmploymentType rejects invalid types', () => {
      expect(isValidEmploymentType('INVALID')).toBe(false);
      expect(isValidEmploymentType('Full Time')).toBe(false);
    });

    it('toEmploymentType converts or returns default', () => {
      expect(toEmploymentType('FULL_TIME')).toBe('FULL_TIME');
      expect(toEmploymentType('PART_TIME')).toBe('PART_TIME');
      expect(toEmploymentType('INVALID')).toBe('FULL_TIME');
      expect(toEmploymentType(null)).toBe('FULL_TIME');
      expect(toEmploymentType(undefined, 'CONTRACT')).toBe('CONTRACT');
    });
  });

  describe('EmployeeLevel type guards', () => {
    it('isValidEmployeeLevel accepts valid levels', () => {
      expect(isValidEmployeeLevel('ENTRY')).toBe(true);
      expect(isValidEmployeeLevel('SENIOR')).toBe(true);
      expect(isValidEmployeeLevel('CXO')).toBe(true);
    });

    it('toEmployeeLevel converts or returns undefined', () => {
      expect(toEmployeeLevel('ENTRY')).toBe('ENTRY');
      expect(toEmployeeLevel('INVALID')).toBeUndefined();
      expect(toEmployeeLevel(null)).toBeUndefined();
    });
  });

  describe('EmployeeStatus type guards', () => {
    it('isValidEmployeeStatus accepts valid statuses', () => {
      expect(isValidEmployeeStatus('ACTIVE')).toBe(true);
      expect(isValidEmployeeStatus('ON_LEAVE')).toBe(true);
      expect(isValidEmployeeStatus('TERMINATED')).toBe(true);
    });

    it('toEmployeeStatus converts or returns default', () => {
      expect(toEmployeeStatus('ACTIVE')).toBe('ACTIVE');
      expect(toEmployeeStatus('INVALID')).toBe('ACTIVE');
      expect(toEmployeeStatus(null, 'TERMINATED')).toBe('TERMINATED');
    });
  });

  describe('JobRole type guards', () => {
    it('isValidJobRole accepts valid job roles', () => {
      expect(isValidJobRole('SOFTWARE_ENGINEER')).toBe(true);
      expect(isValidJobRole('HR_MANAGER')).toBe(true);
      expect(isValidJobRole('CONSULTANT')).toBe(true);
    });

    it('isValidJobRole rejects invalid roles', () => {
      expect(isValidJobRole('INVALID_ROLE')).toBe(false);
      expect(isValidJobRole('Software Engineer')).toBe(false);
    });

    it('toJobRole converts or returns undefined', () => {
      expect(toJobRole('SOFTWARE_ENGINEER')).toBe('SOFTWARE_ENGINEER');
      expect(toJobRole('INVALID')).toBeUndefined();
      expect(toJobRole(null)).toBeUndefined();
    });
  });

  describe('Pagination type guards', () => {
    it('isPageResponse detects valid page responses', () => {
      const validResponse: PageResponse<string> = {
        content: ['a', 'b'],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0,
      };
      expect(isPageResponse(validResponse)).toBe(true);
    });

    it('isPageResponse rejects invalid responses', () => {
      expect(isPageResponse(['a', 'b'])).toBe(false);
      expect(isPageResponse({ content: 'not-array' })).toBe(false);
      expect(isPageResponse(null)).toBe(false);
      expect(isPageResponse(undefined)).toBe(false);
    });

    it('extractContent returns content from PageResponse', () => {
      const response: PageResponse<number> = {
        content: [1, 2, 3],
        totalElements: 3,
        totalPages: 1,
        size: 10,
        number: 0,
      };
      expect(extractContent(response)).toEqual([1, 2, 3]);
    });

    it('extractContent returns array as-is', () => {
      const array = [1, 2, 3];
      expect(extractContent(array)).toEqual(array);
    });

    it('extractContent returns empty array for non-array/non-PageResponse', () => {
      expect(extractContent(null)).toEqual([]);
      expect(extractContent(undefined)).toEqual([]);
      expect(extractContent({})).toEqual([]);
    });

    it('extractPaginationMeta returns totals from PageResponse', () => {
      const response: PageResponse<string> = {
        content: ['a'],
        totalElements: 100,
        totalPages: 10,
        size: 10,
        number: 0,
      };
      expect(extractPaginationMeta(response)).toEqual({
        totalElements: 100,
        totalPages: 10,
      });
    });

    it('extractPaginationMeta infers totals from array', () => {
      const array = [1, 2, 3];
      expect(extractPaginationMeta(array)).toEqual({
        totalElements: 3,
        totalPages: 1,
      });
    });

    it('extractPaginationMeta returns defaults for invalid input', () => {
      expect(extractPaginationMeta(null)).toEqual({
        totalElements: 0,
        totalPages: 1,
      });
      expect(extractPaginationMeta({})).toEqual({
        totalElements: 0,
        totalPages: 1,
      });
    });
  });

  describe('Priority type guards', () => {
    it('isValidPriority accepts valid priorities', () => {
      expect(isValidPriority('LOW')).toBe(true);
      expect(isValidPriority('MEDIUM')).toBe(true);
      expect(isValidPriority('HIGH')).toBe(true);
      expect(isValidPriority('URGENT')).toBe(true);
      expect(isValidPriority('CRITICAL')).toBe(true);
    });

    it('isValidPriority is case insensitive', () => {
      expect(isValidPriority('low')).toBe(true);
      expect(isValidPriority('critical')).toBe(true);
    });

    it('isValidPriority rejects invalid priorities', () => {
      expect(isValidPriority('SUPER_URGENT')).toBe(false);
      expect(isValidPriority('')).toBe(false);
    });

    it('toPriority converts or returns default', () => {
      expect(toPriority('HIGH')).toBe('HIGH');
      expect(toPriority('low')).toBe('LOW');
      expect(toPriority('INVALID')).toBe('MEDIUM');
      expect(toPriority(null)).toBe('MEDIUM');
      expect(toPriority(undefined, 'URGENT')).toBe('URGENT');
    });
  });

  describe('TaskStatus type guards', () => {
    it('isValidTaskStatus accepts valid statuses', () => {
      expect(isValidTaskStatus('TODO')).toBe(true);
      expect(isValidTaskStatus('IN_PROGRESS')).toBe(true);
      expect(isValidTaskStatus('DONE')).toBe(true);
    });

    it('isValidTaskStatus handles space to underscore conversion', () => {
      expect(isValidTaskStatus('IN PROGRESS')).toBe(true);
      expect(isValidTaskStatus('IN_REVIEW')).toBe(true);
    });

    it('isValidTaskStatus rejects invalid statuses', () => {
      expect(isValidTaskStatus('INVALID')).toBe(false);
    });

    it('toTaskStatus converts or returns default', () => {
      expect(toTaskStatus('TODO')).toBe('TODO');
      expect(toTaskStatus('IN PROGRESS')).toBe('IN_PROGRESS');
      expect(toTaskStatus('INVALID')).toBe('TODO');
      expect(toTaskStatus(null, 'DONE')).toBe('DONE');
    });
  });

  describe('Utility functions', () => {
    it('assertDefined throws on null/undefined', () => {
      expect(() => assertDefined(null)).toThrow('Value is null or undefined');
      expect(() => assertDefined(undefined)).toThrow('Value is null or undefined');
    });

    it('assertDefined returns value when defined', () => {
      expect(assertDefined(42)).toBe(42);
      expect(assertDefined('test')).toBe('test');
      expect(assertDefined({})).toEqual({});
    });

    it('assertDefined allows custom error message', () => {
      expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error');
    });

    it('narrowResponse validates and narrows type', () => {
      const isString = (v: unknown): v is string => typeof v === 'string';
      expect(narrowResponse('test', isString)).toBe('test');
      expect(narrowResponse(42, isString)).toBe(null);
    });
  });

  describe('Axios error type guards', () => {
    it('isAxiosError detects axios-like errors', () => {
      const axiosError = { response: { status: 400 } };
      expect(isAxiosError(axiosError)).toBe(true);
    });

    it('isAxiosError detects errors with message', () => {
      const error = { message: 'Network error' };
      expect(isAxiosError(error)).toBe(true);
    });

    it('isAxiosError rejects non-error objects', () => {
      expect(isAxiosError(null)).toBe(false);
      expect(isAxiosError(undefined)).toBe(false);
      expect(isAxiosError('string')).toBe(false);
      expect(isAxiosError({})).toBe(false);
    });

    it('is401Error detects 401 errors', () => {
      const error = { response: { status: 401 } };
      expect(is401Error(error)).toBe(true);
    });

    it('is401Error rejects non-401 errors', () => {
      expect(is401Error({ response: { status: 403 } })).toBe(false);
      expect(is401Error({ message: 'error' })).toBe(false);
    });

    it('is403Error detects 403 errors', () => {
      const error = { response: { status: 403 } };
      expect(is403Error(error)).toBe(true);
    });

    it('isNetworkError detects missing response', () => {
      const error = { message: 'Network failed' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('isNetworkError rejects errors with response', () => {
      expect(isNetworkError({ response: { status: 500 } })).toBe(false);
    });
  });

  describe('createSelectHandler', () => {
    it('calls setter with valid value', () => {
      const setter = vi.fn();
      const handler = createSelectHandler(['A', 'B', 'C'], setter);
      const event = { target: { value: 'B' } } as unknown as React.ChangeEvent<HTMLSelectElement>;
      handler(event);
      expect(setter).toHaveBeenCalledWith('B');
    });

    it('calls setter with undefined for empty value', () => {
      const setter = vi.fn();
      const handler = createSelectHandler(['A', 'B'], setter);
      const event = { target: { value: '' } } as unknown as React.ChangeEvent<HTMLSelectElement>;
      handler(event);
      expect(setter).toHaveBeenCalledWith(undefined);
    });

    it('uses default value for invalid input', () => {
      const setter = vi.fn();
      const handler = createSelectHandler(['A', 'B'], setter, 'A');
      const event = { target: { value: 'INVALID' } } as unknown as React.ChangeEvent<HTMLSelectElement>;
      handler(event);
      expect(setter).toHaveBeenCalledWith('A');
    });

    it('handles empty string with default value', () => {
      const setter = vi.fn();
      const handler = createSelectHandler(['A', 'B'], setter, 'B');
      const event = { target: { value: '' } } as unknown as React.ChangeEvent<HTMLSelectElement>;
      handler(event);
      expect(setter).toHaveBeenCalledWith('B');
    });
  });
});

// Import vi for mocking
import { vi } from 'vitest';
