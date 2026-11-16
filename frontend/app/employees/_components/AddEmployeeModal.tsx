'use client';

import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Button, Tabs} from '@mantine/core';
import {useForm, type FieldErrors} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useCreateEmployee} from '@/lib/hooks/queries/useEmployees';
import {createLogger} from '@/lib/utils/logger';
import {
  type AddEmployeeTab,
  createEmployeeDefaults,
  type CreateEmployeeFormData,
  createEmployeeFormSchema,
  firstTabWithError,
  toCreateEmployeeRequest,
} from './create-employee-schema';
import {
  BankingFields,
  BasicInfoFields,
  type DepartmentOption,
  EmploymentFields,
  type ManagerOption,
  PersonalFields,
} from './AddEmployeeFields';

const log = createLogger('EmployeesPage');

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentOption[];
  managers: ManagerOption[];
}

export function AddEmployeeModal({isOpen, onClose, departments, managers}: AddEmployeeModalProps) {
  const [tab, setTab] = useState<AddEmployeeTab>('basic');
  const createEmployeeMutation = useCreateEmployee();
  const form = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeFormSchema),
    defaultValues: createEmployeeDefaults(),
  });
  const {handleSubmit, reset, formState: {isSubmitting}} = form;

  const close = () => {
    onClose();
    reset();
    setTab('basic');
  };

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      await createEmployeeMutation.mutateAsync(toCreateEmployeeRequest(data));
      close();
    } catch (err: unknown) {
      // The global mutation handler already shows the error toast.
      log.error('Error creating employee:', err);
    }
  };

  const onInvalid = (errors: FieldErrors<CreateEmployeeFormData>) => {
    const target = firstTabWithError(Object.keys(errors));
    if (target) setTab(target);
  };

  // Portal to <body>: the page wrapper is transformed, which would otherwise anchor the fixed overlay to the content area.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <Modal isOpen={isOpen} onClose={close} size="xl">
      <ModalHeader onClose={close}>Add New Employee</ModalHeader>
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
      >
        <ModalBody>
          {/* display-none keeps every registered input attached so values survive tab switches. */}
          <Tabs
            value={tab}
            onChange={(value) => value && setTab(value as AddEmployeeTab)}
            keepMountedMode="display-none"
          >
            <Tabs.List mb="md">
              <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
              <Tabs.Tab value="personal">Personal Details</Tabs.Tab>
              <Tabs.Tab value="employment">Employment</Tabs.Tab>
              <Tabs.Tab value="bank">Banking & Tax</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="basic"><BasicInfoFields form={form}/></Tabs.Panel>
            <Tabs.Panel value="personal"><PersonalFields form={form}/></Tabs.Panel>
            <Tabs.Panel value="employment">
              <EmploymentFields form={form} departments={departments} managers={managers}/>
            </Tabs.Panel>
            <Tabs.Panel value="bank"><BankingFields form={form}/></Tabs.Panel>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Add Employee
          </Button>
        </ModalFooter>
      </form>
    </Modal>,
    document.body,
  );
}
