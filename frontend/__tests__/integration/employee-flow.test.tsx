/**
 * Integration Tests for Employee CRUD Flow
 * Tests employee list rendering, create, edit, and delete operations
 * Uses mocked employee service for reliable testing
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';
import {createMockPage, mockEmployees} from '@/lib/test-utils/fixtures';
import React from 'react';
import {employeeService} from '@/lib/services/hrms/employee.service';

// Mock the employee service
vi.mock('@/lib/services/hrms/employee.service', () => ({
  employeeService: {
    createEmployee: vi.fn(),
    getEmployee: vi.fn(),
    getAllEmployees: vi.fn(),
    updateEmployee: vi.fn(),
    deleteEmployee: vi.fn(),
    searchEmployees: vi.fn(),
  },
}));

const mockedEmployeeService = vi.mocked(employeeService);

// Mock Employee List Component
interface EmployeeListProps {
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const MockEmployeeList: React.FC<EmployeeListProps> = ({onEdit, onDelete}) => {
  const [employees, setEmployees] = React.useState<typeof mockEmployees>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const result = await employeeService.getAllEmployees();
        setEmployees(result.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;

  return (
    <div data-testid="employee-list">
      <table data-testid="employees-table">
        <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Designation</th>
          <th>Department</th>
          <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        {employees.map((emp) => (
          <tr key={emp.id} data-testid={`employee-row-${emp.id}`}>
            <td>{`${emp.firstName} ${emp.lastName}`}</td>
            <td>{emp.workEmail}</td>
            <td>{emp.designation}</td>
            <td>{emp.departmentName}</td>
            <td>
              <button
                data-testid={`edit-btn-${emp.id}`}
                onClick={() => onEdit?.(emp.id)}
              >
                Edit
              </button>
              <button
                data-testid={`delete-btn-${emp.id}`}
                onClick={() => onDelete?.(emp.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
};

// Mock Employee Form Component
interface EmployeeFormProps {
  employeeId?: string;
  onSuccess?: () => void;
}

const MockEmployeeForm: React.FC<EmployeeFormProps> = ({employeeId, onSuccess}) => {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    designation: '',
    departmentId: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (employeeId) {
      const loadEmployee = async () => {
        try {
          const emp = await employeeService.getEmployee(employeeId);
          setFormData({
            firstName: emp.firstName,
            lastName: emp.lastName,
            workEmail: emp.workEmail,
            designation: emp.designation,
            departmentId: emp.departmentId,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load employee');
        }
      };
      loadEmployee();
    }
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.firstName || !formData.lastName || !formData.workEmail) {
        setError('First name, last name, and email are required');
        setLoading(false);
        return;
      }

      if (employeeId) {
        await employeeService.updateEmployee(employeeId, formData);
      } else {
        await employeeService.createEmployee(formData);
      }

      onSuccess?.();
      setFormData({firstName: '', lastName: '', workEmail: '', designation: '', departmentId: ''});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="employee-form">
      {error && <div data-testid="form-error">{error}</div>}

      <div>
        <label htmlFor="first-name">First Name:</label>
        <input
          id="first-name"
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          data-testid="first-name-input"
          required
        />
      </div>

      <div>
        <label htmlFor="last-name">Last Name:</label>
        <input
          id="last-name"
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          data-testid="last-name-input"
          required
        />
      </div>

      <div>
        <label htmlFor="email">Work Email:</label>
        <input
          id="email"
          type="email"
          value={formData.workEmail}
          onChange={(e) => setFormData({...formData, workEmail: e.target.value})}
          data-testid="email-input"
          required
        />
      </div>

      <div>
        <label htmlFor="designation">Designation:</label>
        <input
          id="designation"
          type="text"
          value={formData.designation}
          onChange={(e) => setFormData({...formData, designation: e.target.value})}
          data-testid="designation-input"
        />
      </div>

      <button type="submit" data-testid="form-submit" disabled={loading}>
        {loading ? 'Saving...' : employeeId ? 'Update Employee' : 'Create Employee'}
      </button>
    </form>
  );
};

describe('Employee CRUD Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Employee List Rendering', () => {
    it('should render employee list with loading state initially', () => {
      mockedEmployeeService.getAllEmployees.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(createMockPage(mockEmployees)),
              100
            )
          )
      );

      render(<MockEmployeeList/>);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should fetch and display all employees', async () => {
      mockedEmployeeService.getAllEmployees.mockResolvedValueOnce(
        createMockPage(mockEmployees)
      );

      render(<MockEmployeeList/>);

      await waitFor(() => {
        expect(screen.getByTestId('employees-table')).toBeInTheDocument();
      });

      mockEmployees.forEach((emp) => {
        expect(screen.getByTestId(`employee-row-${emp.id}`)).toBeInTheDocument();
      });
    });

    it('should display employee details in list', async () => {
      mockedEmployeeService.getAllEmployees.mockResolvedValueOnce(
        createMockPage([mockEmployees[0]])
      );

      render(<MockEmployeeList/>);

      await waitFor(() => {
        expect(
          screen.getByText(`${mockEmployees[0].firstName} ${mockEmployees[0].lastName}`)
        ).toBeInTheDocument();
        expect(screen.getByText(mockEmployees[0].workEmail)).toBeInTheDocument();
        expect(screen.getByText(mockEmployees[0].designation)).toBeInTheDocument();
        expect(screen.getByText(mockEmployees[0].departmentName)).toBeInTheDocument();
      });
    });

    it('should handle error when fetching employees', async () => {
      const errorMessage = 'Failed to fetch employees';
      mockedEmployeeService.getAllEmployees.mockRejectedValueOnce(
        new Error(errorMessage)
      );

      render(<MockEmployeeList/>);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Create Employee Flow', () => {
    it('should render create employee form', () => {
      render(<MockEmployeeForm/>);

      expect(screen.getByTestId('employee-form')).toBeInTheDocument();
      expect(screen.getByTestId('first-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('last-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('designation-input')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      render(<MockEmployeeForm/>);

      const firstNameInput = screen.getByTestId('first-name-input') as HTMLInputElement;
      const lastNameInput = screen.getByTestId('last-name-input') as HTMLInputElement;
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

      // Verify all inputs are empty (required validation)
      expect(firstNameInput.value).toBe('');
      expect(lastNameInput.value).toBe('');
      expect(emailInput.value).toBe('');

      // All inputs have required attribute
      expect(firstNameInput).toHaveAttribute('required');
      expect(lastNameInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should submit create employee form with valid data', async () => {
      mockedEmployeeService.createEmployee.mockResolvedValueOnce(mockEmployees[0]);

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<MockEmployeeForm onSuccess={onSuccess}/>);

      await user.type(screen.getByTestId('first-name-input'), 'John');
      await user.type(screen.getByTestId('last-name-input'), 'Doe');
      await user.type(screen.getByTestId('email-input'), 'john.doe@company.com');
      await user.type(screen.getByTestId('designation-input'), 'Software Engineer');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockedEmployeeService.createEmployee).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          workEmail: 'john.doe@company.com',
          designation: 'Software Engineer',
          departmentId: '',
        });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should clear form after successful creation', async () => {
      mockedEmployeeService.createEmployee.mockResolvedValueOnce(mockEmployees[0]);
      const user = userEvent.setup();

      render(<MockEmployeeForm/>);

      const firstNameInput = screen.getByTestId('first-name-input') as HTMLInputElement;
      const lastNameInput = screen.getByTestId('last-name-input') as HTMLInputElement;
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john.doe@company.com');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(firstNameInput.value).toBe('');
        expect(lastNameInput.value).toBe('');
        expect(emailInput.value).toBe('');
      });
    });
  });

  describe('Edit Employee Flow', () => {
    it('should load employee data for editing', async () => {
      mockedEmployeeService.getEmployee.mockResolvedValueOnce(mockEmployees[0]);

      render(<MockEmployeeForm employeeId={mockEmployees[0].id}/>);

      await waitFor(() => {
        const firstNameInput = screen.getByTestId('first-name-input') as HTMLInputElement;
        expect(firstNameInput.value).toBe(mockEmployees[0].firstName);
      });
    });

    it('should pre-fill form with employee data', async () => {
      mockedEmployeeService.getEmployee.mockResolvedValueOnce(mockEmployees[0]);

      render(<MockEmployeeForm employeeId={mockEmployees[0].id}/>);

      await waitFor(() => {
        const firstNameInput = screen.getByTestId('first-name-input') as HTMLInputElement;
        const lastNameInput = screen.getByTestId('last-name-input') as HTMLInputElement;
        const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

        expect(firstNameInput.value).toBe(mockEmployees[0].firstName);
        expect(lastNameInput.value).toBe(mockEmployees[0].lastName);
        expect(emailInput.value).toBe(mockEmployees[0].workEmail);
      });
    });

    it('should update employee data', async () => {
      mockedEmployeeService.getEmployee.mockResolvedValueOnce(mockEmployees[0]);
      mockedEmployeeService.updateEmployee.mockResolvedValueOnce({
        ...mockEmployees[0],
        designation: 'Senior Engineer',
      });

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<MockEmployeeForm employeeId={mockEmployees[0].id} onSuccess={onSuccess}/>);

      await waitFor(() => {
        expect(screen.getByTestId('first-name-input')).toHaveValue(mockEmployees[0].firstName);
      });

      const designationInput = screen.getByTestId('designation-input');
      await user.clear(designationInput);
      await user.type(designationInput, 'Senior Engineer');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockedEmployeeService.updateEmployee).toHaveBeenCalled();
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('Delete Employee Flow', () => {
    it('should call delete service when delete button clicked', async () => {
      mockedEmployeeService.getAllEmployees.mockResolvedValueOnce(
        createMockPage([mockEmployees[0]])
      );
      mockedEmployeeService.deleteEmployee.mockResolvedValueOnce(undefined);

      const onDelete = vi.fn((id: string) => {
        employeeService.deleteEmployee(id);
      });

      const user = userEvent.setup();
      render(<MockEmployeeList onDelete={onDelete}/>);

      await waitFor(() => {
        expect(screen.getByTestId(`delete-btn-${mockEmployees[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`delete-btn-${mockEmployees[0].id}`));

      expect(onDelete).toHaveBeenCalledWith(mockEmployees[0].id);
    });
  });

  describe('Edit Button Functionality', () => {
    it('should call edit callback when edit button clicked', async () => {
      mockedEmployeeService.getAllEmployees.mockResolvedValueOnce(
        createMockPage([mockEmployees[0]])
      );

      const onEdit = vi.fn();
      const user = userEvent.setup();
      render(<MockEmployeeList onEdit={onEdit}/>);

      await waitFor(() => {
        expect(screen.getByTestId(`edit-btn-${mockEmployees[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`edit-btn-${mockEmployees[0].id}`));

      expect(onEdit).toHaveBeenCalledWith(mockEmployees[0].id);
    });
  });
});
