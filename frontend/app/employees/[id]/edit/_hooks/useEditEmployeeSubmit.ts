'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {customFieldsApi} from '@/lib/api/custom-fields';
import {employeeKeys} from '@/lib/hooks/queries/useEmployees';
import {employeeService} from '@/lib/services/hrms/employee.service';
import {employmentChangeRequestService} from '@/lib/services/hrms/employment-change-request.service';
import {type CustomFieldValueRequest, EntityType} from '@/lib/types/core/custom-fields';
import type {Employee} from '@/lib/types/hrms/employee';
import {createLogger} from '@/lib/utils/logger';
import {
  buildChangeRequest,
  buildUpdateRequest,
  hasEmploymentFieldChanges,
  type UpdateEmployeeFormData,
} from '../_components/edit-employee-schema';

const log = createLogger('EmployeeEditPage');

export function useEditEmployeeSubmit(employeeId: string, employee: Employee | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [changeRequestCreated, setChangeRequestCreated] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValueRequest>>({});

  const onSubmit = async (formData: UpdateEmployeeFormData) => {
    try {
      setSubmitError(null);
      setChangeRequestCreated(false);

      const employmentChanges = employee ? hasEmploymentFieldChanges(formData, employee) : false;
      if (employmentChanges && employee) {
        await employmentChangeRequestService.createChangeRequest(buildChangeRequest(employeeId, formData, employee));
        setChangeRequestCreated(true);
      }

      await employeeService.updateEmployee(employeeId, buildUpdateRequest(formData, employmentChanges));
      await Promise.all([
        queryClient.invalidateQueries({queryKey: employeeKeys.detail(employeeId)}),
        queryClient.invalidateQueries({queryKey: employeeKeys.lists()}),
      ]);

      const customFieldValueRequests = Object.values(customFieldValues).filter(
        (v) => v.value !== undefined && v.value !== null && v.value !== ''
      );
      if (customFieldValueRequests.length > 0) {
        await customFieldsApi.setFieldValues({
          entityType: EntityType.EMPLOYEE,
          entityId: employeeId,
          values: customFieldValueRequests,
        });
      }

      notifications.show({title: 'Success', message: 'Employee updated successfully', color: 'green'});

      if (!employmentChanges) {
        router.push(`/employees/${employeeId}`);
      }
    } catch (err: unknown) {
      const message = (err as {response?: {data?: {message?: string}}})?.response?.data?.message
        || 'Failed to update employee';
      setSubmitError(message);
      notifications.show({title: 'Error', message, color: 'red'});
      log.error('Error updating employee:', err);
    }
  };

  const onInvalid = () => {
    setSubmitError('Please review the highlighted fields and try again.');
    notifications.show({
      title: 'Check the form',
      message: 'Some fields need attention before saving.',
      color: 'red',
    });
  };

  return {onSubmit, onInvalid, submitError, changeRequestCreated, setCustomFieldValues};
}
