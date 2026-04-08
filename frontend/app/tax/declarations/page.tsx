'use client';

import {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {IconCheck, IconDotsVertical, IconEye, IconPlus} from '@tabler/icons-react';
import {useRouter} from 'next/navigation';
import {DeclarationStatus, TaxDeclarationResponse, TaxRegimeType} from '@/lib/types/hrms/tax';
import {useCreateTaxDeclaration, useTaxDeclarations} from '@/lib/hooks/queries/useTax';
import {useAuth} from '@/lib/hooks/useAuth';
import {notifications} from '@mantine/notifications';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('DeclarationsPage');

// Zod schema for tax declaration form
const taxDeclarationSchema = z.object({
  financialYear: z.string().min(1, 'Financial year is required'),
  taxRegime: z.enum(['OLD_REGIME', 'NEW_REGIME'], {
    errorMap: () => ({message: 'Tax regime is required'}),
  }),
  section80C: z.number().min(0, 'Section 80C must be >= 0').default(0),
  section80D: z.number().min(0, 'Section 80D must be >= 0').default(0),
  hraExemption: z.number().min(0, 'HRA exemption must be >= 0').default(0),
  otherDeductions: z.number().min(0, 'Other deductions must be >= 0').default(0),
  notes: z.string().optional(),
});

type TaxDeclarationFormData = z.infer<typeof taxDeclarationSchema>;

export default function TaxDeclarationsPage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);

  // BUG-L6-004: Page-level permission gate for tax declarations
  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!hasPermission(Permissions.TDS_DECLARE) && !hasPermission(Permissions.STATUTORY_VIEW)) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

  // Fetch declarations using React Query
  const {data, isLoading} = useTaxDeclarations(0, 20);
  const createMutation = useCreateTaxDeclaration();

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: {errors, isSubmitting},
  } = useForm<TaxDeclarationFormData>({
    resolver: zodResolver(taxDeclarationSchema),
    defaultValues: {
      financialYear: '2025-2026',
      taxRegime: 'NEW_REGIME',
      section80C: 0,
      section80D: 0,
      hraExemption: 0,
      otherDeductions: 0,
      notes: '',
    },
  });

  const onSubmit = async (formData: TaxDeclarationFormData) => {
    if (!user?.employeeId) {
      notifications.show({
        title: 'Error',
        message: 'Employee ID not found',
        color: 'red',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeId: user.employeeId,
        financialYear: formData.financialYear,
        taxRegime: formData.taxRegime as TaxRegimeType,
        sec80cPpf: formData.section80C,
        sec80dSelfFamily: formData.section80D,
        hraRentPaid: formData.hraExemption,
        sec80eEducationLoan: formData.otherDeductions,
        notes: formData.notes || undefined,
      });

      // Close modal and reset form on success
      setModalOpen(false);
      reset();
    } catch (error) {
      log.error('Error creating tax declaration:', error);
    }
  };

  const declarations = Array.isArray(data) ? data : [];

  const statusColor = (status: DeclarationStatus) => {
    switch (status) {
      case DeclarationStatus.APPROVED:
        return 'green';
      case DeclarationStatus.REJECTED:
        return 'red';
      case DeclarationStatus.SUBMITTED:
        return 'blue';
      case DeclarationStatus.DRAFT:
        return 'gray';
      default:
        return 'gray';
    }
  };

  const rows = declarations.map((declaration: TaxDeclarationResponse) => (
    <Table.Tr key={declaration.id}>
      <Table.Td>{declaration.financialYear}</Table.Td>
      <Table.Td>{declaration.employeeName}</Table.Td>
      <Table.Td>{declaration.taxRegime.replace('_', ' ')}</Table.Td>
      <Table.Td>
        {new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR'}).format(declaration.taxableIncome)}
      </Table.Td>
      <Table.Td>
        <Badge color={statusColor(declaration.status)} className="badge-status">{declaration.status}</Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <Menu transitionProps={{transition: 'pop'}} withArrow position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} stroke={1.5}/>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEye size={16} stroke={1.5}/>}
                         onClick={() => router.push(`/tax/declarations/${declaration.id}`)}>
                View Details
              </Menu.Item>
              {declaration.status === DeclarationStatus.DRAFT && (
                <Menu.Item leftSection={<IconCheck size={16} stroke={1.5}/>} onClick={() => { /* Submit logic */
                }}>
                  Submit
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  // Permission guard
  if (!hasHydrated || !permissionsReady || (!hasPermission(Permissions.TDS_DECLARE) && !hasPermission(Permissions.STATUTORY_VIEW))) {
    return null;
  }

  return (
    <AppLayout>
      <Container size="xl" py="lg">
        <Group justify="space-between" mb="lg">
          <div>
            <Title order={2} className="skeuo-emboss">Tax Declarations</Title>
            <Text c="dimmed">Manage employee tax declarations and proofs</Text>
          </div>
          <Button leftSection={<IconPlus size={20}/>} onClick={() => setModalOpen(true)} className="btn-primary">
            New Declaration
          </Button>
        </Group>

        <Card withBorder radius="md" p="md" className="skeuo-card">
          <Table verticalSpacing="sm" className="table-aura">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Financial Year</Table.Th>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Regime</Table.Th>
                <Table.Th>Taxable Income</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th/>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <>
                  {Array.from({length: 4}).map((_, i) => (
                    <Table.Tr key={i}>
                      {Array.from({length: 6}).map((_, j) => (
                        <Table.Td key={j}><div className="skeleton-aura h-4 rounded w-full" /></Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </>
              ) : rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6} align="center">
                    <Text c="dimmed">No tax declarations found</Text>
                    <Button variant="light" mt="xs" onClick={() => setModalOpen(true)}>
                      Create your first declaration
                    </Button>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Create Tax Declaration Modal */}
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create Tax Declaration"
          size="md"
          centered
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <Controller
                name="financialYear"
                control={control}
                render={({field}) => (
                  <Select
                    label="Financial Year"
                    placeholder="Select financial year"
                    data={[
                      {value: '2024-2025', label: '2024-2025'},
                      {value: '2025-2026', label: '2025-2026'},
                      {value: '2026-2027', label: '2026-2027'},
                    ]}
                    {...field}
                    error={errors.financialYear?.message}
                    required
                  />
                )}
              />

              <Controller
                name="taxRegime"
                control={control}
                render={({field}) => (
                  <Select
                    label="Tax Regime"
                    placeholder="Select tax regime"
                    data={[
                      {value: 'OLD_REGIME', label: 'Old Regime'},
                      {value: 'NEW_REGIME', label: 'New Regime'},
                    ]}
                    {...field}
                    error={errors.taxRegime?.message}
                    required
                  />
                )}
              />

              <Controller
                name="section80C"
                control={control}
                render={({field}) => (
                  <NumberInput
                    label="Section 80C Deductions (₹)"
                    placeholder="Enter 80C deductions"
                    min={0}
                    {...field}
                    value={field.value ?? 0}
                    onChange={(val) => field.onChange(val)}
                    error={errors.section80C?.message}
                  />
                )}
              />

              <Controller
                name="section80D"
                control={control}
                render={({field}) => (
                  <NumberInput
                    label="Section 80D Deductions (₹)"
                    placeholder="Enter 80D deductions"
                    min={0}
                    {...field}
                    value={field.value ?? 0}
                    onChange={(val) => field.onChange(val)}
                    error={errors.section80D?.message}
                  />
                )}
              />

              <Controller
                name="hraExemption"
                control={control}
                render={({field}) => (
                  <NumberInput
                    label="HRA Exemption (₹)"
                    placeholder="Enter HRA exemption"
                    min={0}
                    {...field}
                    value={field.value ?? 0}
                    onChange={(val) => field.onChange(val)}
                    error={errors.hraExemption?.message}
                  />
                )}
              />

              <Controller
                name="otherDeductions"
                control={control}
                render={({field}) => (
                  <NumberInput
                    label="Other Deductions (₹)"
                    placeholder="Enter other deductions"
                    min={0}
                    {...field}
                    value={field.value ?? 0}
                    onChange={(val) => field.onChange(val)}
                    error={errors.otherDeductions?.message}
                  />
                )}
              />

              <Controller
                name="notes"
                control={control}
                render={({field}) => (
                  <Textarea
                    label="Notes (Optional)"
                    placeholder="Add any additional notes"
                    {...field}
                    minRows={3}
                  />
                )}
              />

              <Group justify="flex-end" mt="xl">
                <Button variant="light" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting || createMutation.isPending}
                >
                  Create Declaration
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Container>
    </AppLayout>
  );
}
