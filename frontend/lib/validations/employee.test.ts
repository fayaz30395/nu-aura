import {describe, expect, it} from 'vitest';
import {createEmployeeSchema, employeeSearchSchema, updateEmployeeSchema} from './employee';

describe('Employee Validation Schemas', () => {
  describe('createEmployeeSchema', () => {
    const validEmployee = {
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      workEmail: 'john.doe@company.com',
      password: 'Password123',
      joiningDate: '2024-01-15',
      employmentType: 'FULL_TIME',
    };

    it('accepts valid employee data', () => {
      const result = createEmployeeSchema.safeParse(validEmployee);
      expect(result.success).toBe(true);
    });

    it('requires employeeCode', () => {
      const {employeeCode: _employeeCode, ...data} = validEmployee;
      const result = createEmployeeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('employeeCode');
      }
    });

    it('validates employeeCode format', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        employeeCode: 'invalid code!',
      });
      expect(result.success).toBe(false);
    });

    it('requires firstName', () => {
      const {firstName: _firstName, ...data} = validEmployee;
      const result = createEmployeeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('requires workEmail', () => {
      const {workEmail: _workEmail, ...data} = validEmployee;
      const result = createEmployeeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('validates email format', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        workEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('requires password with minimum 8 characters', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('requires password to have uppercase, lowercase, and number', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        password: 'alllowercase',
      });
      expect(result.success).toBe(false);
    });

    it('requires joiningDate', () => {
      const {joiningDate: _joiningDate, ...data} = validEmployee;
      const result = createEmployeeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('validates joiningDate format', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        joiningDate: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });

    it('requires employmentType', () => {
      const {employmentType: _employmentType, ...data} = validEmployee;
      const result = createEmployeeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('validates employmentType enum values', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        employmentType: 'INVALID_TYPE',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        middleName: 'William',
        personalEmail: 'john.personal@email.com',
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-05-15',
        gender: 'MALE',
        address: '123 Main St',
        city: 'New York',
      });
      expect(result.success).toBe(true);
    });

    it('validates optional email format', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        personalEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('validates phone number format', () => {
      const result = createEmployeeSchema.safeParse({
        ...validEmployee,
        phoneNumber: '+1234567890',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateEmployeeSchema', () => {
    it('accepts all optional fields', () => {
      const result = updateEmployeeSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts partial updates', () => {
      const result = updateEmployeeSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
      });
      expect(result.success).toBe(true);
    });

    it('validates firstName if provided', () => {
      const result = updateEmployeeSchema.safeParse({
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('validates employeeCode format if provided', () => {
      const result = updateEmployeeSchema.safeParse({
        employeeCode: 'invalid code!',
      });
      expect(result.success).toBe(false);
    });

    it('validates gender enum if provided', () => {
      const result = updateEmployeeSchema.safeParse({
        gender: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid status updates', () => {
      const result = updateEmployeeSchema.safeParse({
        status: 'ON_LEAVE',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid level updates', () => {
      const result = updateEmployeeSchema.safeParse({
        level: 'SENIOR',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('employeeSearchSchema', () => {
    it('accepts valid search query', () => {
      const result = employeeSearchSchema.safeParse({
        query: 'john',
      });
      expect(result.success).toBe(true);
    });

    it('requires query to be non-empty', () => {
      const result = employeeSearchSchema.safeParse({
        query: '',
      });
      expect(result.success).toBe(false);
    });

    it('enforces maximum query length', () => {
      const result = employeeSearchSchema.safeParse({
        query: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
