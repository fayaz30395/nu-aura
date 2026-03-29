'use client';

import { useState, useCallback } from 'react';
import {
  Title, Text, Container, Card, Group, Badge, Button, Select, Table,
  Grid, ThemeIcon, Loader, Alert, Modal, Textarea, Stack, Tooltip,
  ActionIcon, Pagination, Tabs, Paper, Divider,
} from '@mantine/core';
import {
  IconFileText, IconDownload, IconCheck, IconAlertTriangle,
  IconUpload, IconRefresh, IconEye, IconBuildingBank,
  IconFileSpreadsheet, IconFileCertificate, IconFileInvoice,
  IconShieldCheck, IconCalendar, IconExternalLink,
} from '@tabler/icons-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/layout';
import {
  useFilingTypes,
  useFilingHistory,
  useGenerateFiling,
  useValidateFiling,
  useSubmitFiling,
  useDownloadFiling,
} from '@/lib/hooks/queries/useStatutoryFiling';
import type {
  FilingType,
  FilingStatus,
  FilingRunResponse,
  FilingTypeInfo,
} from '@/lib/types/statutory-filing';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const YEARS = Array.from({ length: 7 }, (_, i) => {
  const y = new Date().getFullYear() - 3 + i;
  return { value: String(y), label: String(y) };
});

const FILING_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'PF_ECR', label: 'PF ECR' },
  { value: 'ESI_RETURN', label: 'ESI Return' },
  { value: 'PT_CHALLAN', label: 'PT Challan' },
  { value: 'FORM_16', label: 'Form 16' },
  { value: 'FORM_24Q', label: 'Form 24Q' },
  { value: 'LWF_RETURN', label: 'LWF Return' },
];

const STATUS_COLORS: Record<FilingStatus, string> = {
  DRAFT: 'gray',
  GENERATED: 'blue',
  VALIDATED: 'teal',
  SUBMITTED: 'green',
  REJECTED: 'red',
};

const FILING_ICONS: Record<FilingType, React.ReactNode> = {
  PF_ECR: <IconBuildingBank size={20} />,
  ESI_RETURN: <IconShieldCheck size={20} />,
  PT_CHALLAN: <IconFileInvoice size={20} />,
  FORM_16: <IconFileCertificate size={20} />,
  FORM_24Q: <IconFileSpreadsheet size={20} />,
  LWF_RETURN: <IconFileText size={20} />,
};

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const generateSchema = z.object({
  filingType: z.string().min(1, 'Filing type is required'),
  month: z.string().min(1, 'Month is required'),
  year: z.string().min(1, 'Year is required'),
  remarks: z.string().optional(),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function StatutoryFilingsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('dashboard');
  const [filterType, setFilterType] = useState<string>('');
  const [page, setPage] = useState(0);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [validationDetail, setValidationDetail] = useState<string | null>(null);

  // Queries
  const { data: filingTypes = [], isLoading: typesLoading } = useFilingTypes();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useFilingHistory(
    page, 20, filterType || undefined
  );

  // Mutations
  const generateMutation = useGenerateFiling();
  const validateMutation = useValidateFiling();
  const submitMutation = useSubmitFiling();
  const downloadMutation = useDownloadFiling();

  // Form
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      filingType: '',
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      remarks: '',
    },
  });

  const handleGenerate = useCallback((values: GenerateFormValues) => {
    generateMutation.mutate({
      filingType: values.filingType as FilingType,
      month: Number(values.month),
      year: Number(values.year),
      remarks: values.remarks,
    }, {
      onSuccess: () => {
        setGenerateModalOpen(false);
        form.reset();
      },
    });
  }, [generateMutation, form]);

  const handleValidate = useCallback((id: string) => {
    validateMutation.mutate(id, {
      onSuccess: (result) => {
        setValidationDetail(result.validationErrors);
      },
    });
  }, [validateMutation]);

  const handleSubmit = useCallback(() => {
    if (!selectedRunId) return;
    submitMutation.mutate({ id: selectedRunId, data: { remarks: submitRemarks } }, {
      onSuccess: () => {
        setSubmitModalOpen(false);
        setSelectedRunId(null);
        setSubmitRemarks('');
      },
    });
  }, [submitMutation, selectedRunId, submitRemarks]);

  const handleDownload = useCallback((id: string, fileName: string) => {
    downloadMutation.mutate({ id, fileName: fileName || 'filing.dat' });
  }, [downloadMutation]);

  const openSubmitModal = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setSubmitModalOpen(true);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <Container size="xl" py="md">
        <Group justify="space-between" mb="lg">
          <div>
            <Title order={2} className="text-slate-900 dark:text-white">
              Statutory Filing Reports
            </Title>
            <Text c="dimmed" size="sm">
              Generate, validate, and track statutory filings for government portal submissions
            </Text>
          </div>
          <Button
            leftSection={<IconFileText size={16} />}
            className="bg-accent-700 hover:bg-accent-800"
            onClick={() => setGenerateModalOpen(true)}
          >
            Generate Filing
          </Button>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconCalendar size={16} />}>
              Filing Types
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconFileText size={16} />}>
              Filing History
            </Tabs.Tab>
          </Tabs.List>

          {/* ─── Filing Types Dashboard ─────────────────────────────────── */}
          <Tabs.Panel value="dashboard" pt="md">
            {typesLoading ? (
              <Group justify="center" py="xl"><Loader /></Group>
            ) : (
              <Grid>
                {filingTypes.map((ft: FilingTypeInfo) => (
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={ft.filingType}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder className="h-full">
                      <Group mb="sm">
                        <ThemeIcon
                          size="lg"
                          radius="md"
                          className="bg-accent-700"
                        >
                          {FILING_ICONS[ft.filingType]}
                        </ThemeIcon>
                        <div>
                          <Text fw={600} size="sm">{ft.name}</Text>
                          <Badge size="xs" variant="light" color="sky">
                            {ft.format}
                          </Badge>
                        </div>
                      </Group>
                      <Text size="xs" c="dimmed" mb="sm">{ft.description}</Text>
                      <Divider my="xs" />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                          <IconCalendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {ft.frequency}
                        </Text>
                        {ft.portalUrl && (
                          <Tooltip label={`Open ${ft.portalName}`}>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              component="a"
                              href={ft.portalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IconExternalLink size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Tabs.Panel>

          {/* ─── Filing History ──────────────────────────────────────────── */}
          <Tabs.Panel value="history" pt="md">
            <Group mb="md" justify="space-between">
              <Select
                placeholder="Filter by type"
                data={FILING_TYPE_OPTIONS}
                value={filterType}
                onChange={(val) => { setFilterType(val || ''); setPage(0); }}
                clearable
                w={200}
              />
              <Button
                variant="subtle"
                leftSection={<IconRefresh size={16} />}
                onClick={() => refetchHistory()}
              >
                Refresh
              </Button>
            </Group>

            {historyLoading ? (
              <Group justify="center" py="xl"><Loader /></Group>
            ) : historyData && historyData.content.length > 0 ? (
              <>
                <Paper shadow="xs" radius="md" withBorder>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Period</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Records</Table.Th>
                        <Table.Th>Generated</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {historyData.content.map((run: FilingRunResponse) => (
                        <Table.Tr key={run.id}>
                          <Table.Td>
                            <Group gap="xs">
                              {FILING_ICONS[run.filingType]}
                              <Text size="sm" fw={500}>{run.filingTypeName}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{run.periodLabel}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={STATUS_COLORS[run.status]}
                              variant="light"
                              size="sm"
                            >
                              {run.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{run.totalRecords ?? '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {run.generatedAt
                                ? new Date(run.generatedAt).toLocaleDateString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })
                                : '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              {run.fileName && (
                                <Tooltip label="Download">
                                  <ActionIcon
                                    variant="subtle"
                                    color="sky"
                                    onClick={() => handleDownload(run.id, run.fileName ?? 'filing')}
                                    loading={downloadMutation.isPending}
                                  >
                                    <IconDownload size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {(run.status === 'GENERATED' || run.status === 'DRAFT') && (
                                <Tooltip label="Validate">
                                  <ActionIcon
                                    variant="subtle"
                                    color="teal"
                                    onClick={() => handleValidate(run.id)}
                                    loading={validateMutation.isPending}
                                  >
                                    <IconShieldCheck size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {(run.status === 'VALIDATED' || run.status === 'GENERATED') && (
                                <Tooltip label="Mark as Submitted">
                                  <ActionIcon
                                    variant="subtle"
                                    color="green"
                                    onClick={() => openSubmitModal(run.id)}
                                  >
                                    <IconUpload size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {run.validationErrors && run.validationErrors !== '[]' && (
                                <Tooltip label="View Validation">
                                  <ActionIcon
                                    variant="subtle"
                                    color="orange"
                                    onClick={() => setValidationDetail(run.validationErrors)}
                                  >
                                    <IconEye size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>

                {historyData.totalPages > 1 && (
                  <Group justify="center" mt="md">
                    <Pagination
                      total={historyData.totalPages}
                      value={page + 1}
                      onChange={(p) => setPage(p - 1)}
                    />
                  </Group>
                )}
              </>
            ) : (
              <Alert icon={<IconFileText size={16} />} color="gray">
                No filing runs found. Generate your first statutory filing using the button above.
              </Alert>
            )}
          </Tabs.Panel>
        </Tabs>

        {/* ─── Generate Filing Modal ──────────────────────────────────────── */}
        <Modal
          opened={generateModalOpen}
          onClose={() => setGenerateModalOpen(false)}
          title="Generate Statutory Filing"
          size="md"
        >
          <form onSubmit={form.handleSubmit(handleGenerate)}>
            <Stack gap="md">
              <Controller
                name="filingType"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Select
                    label="Filing Type"
                    placeholder="Select filing type"
                    data={FILING_TYPE_OPTIONS.filter(o => o.value !== '')}
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    required
                  />
                )}
              />

              <Group grow>
                <Controller
                  name="month"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Select
                      label="Month"
                      data={MONTHS}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      required
                    />
                  )}
                />
                <Controller
                  name="year"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Select
                      label="Year"
                      data={YEARS}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      required
                    />
                  )}
                />
              </Group>

              <Controller
                name="remarks"
                control={form.control}
                render={({ field }) => (
                  <Textarea
                    label="Remarks (optional)"
                    placeholder="Add any notes..."
                    value={field.value}
                    onChange={field.onChange}
                    rows={3}
                  />
                )}
              />

              {generateMutation.isError && (
                <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                  {generateMutation.error?.message || 'Failed to generate filing'}
                </Alert>
              )}

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setGenerateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent-700 hover:bg-accent-800"
                  loading={generateMutation.isPending}
                  leftSection={<IconFileText size={16} />}
                >
                  Generate
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* ─── Submit Filing Modal ────────────────────────────────────────── */}
        <Modal
          opened={submitModalOpen}
          onClose={() => { setSubmitModalOpen(false); setSelectedRunId(null); }}
          title="Mark Filing as Submitted"
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Confirm that this filing has been submitted to the government portal.
            </Text>
            <Textarea
              label="Submission Remarks"
              placeholder="e.g., Submitted via EPFO portal, acknowledgment #12345"
              value={submitRemarks}
              onChange={(e) => setSubmitRemarks(e.target.value)}
              rows={3}
            />
            {submitMutation.isError && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {submitMutation.error?.message || 'Failed to submit filing'}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="green"
                onClick={handleSubmit}
                loading={submitMutation.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Mark as Submitted
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* ─── Validation Detail Modal ────────────────────────────────────── */}
        <Modal
          opened={!!validationDetail}
          onClose={() => setValidationDetail(null)}
          title="Validation Results"
          size="lg"
        >
          {validationDetail && <ValidationDetailPanel errorsJson={validationDetail} />}
        </Modal>
      </Container>
    </AppLayout>
  );
}

// ─── Validation Detail Sub-component ─────────────────────────────────────────

interface ValidationError {
  type: 'ERROR' | 'WARNING';
  message: string;
  row?: number;
  field?: string;
  employeeId?: string;
}

function ValidationDetailPanel({ errorsJson }: { errorsJson: string }) {
  let errors: ValidationError[] = [];
  try {
    errors = JSON.parse(errorsJson);
  } catch {
    return <Text c="red">Failed to parse validation results</Text>;
  }

  if (errors.length === 0) {
    return (
      <Alert icon={<IconCheck size={16} />} color="green">
        No validation issues found. This filing is ready for submission.
      </Alert>
    );
  }

  const errorItems = errors.filter((e) => e.type === 'ERROR');
  const warningItems = errors.filter((e) => e.type === 'WARNING');

  return (
    <Stack gap="md">
      {errorItems.length > 0 && (
        <div>
          <Text fw={600} c="red" size="sm" mb="xs">
            Errors ({errorItems.length})
          </Text>
          {errorItems.map((err, idx) => (
            <Alert key={`err-${idx}`} color="red" icon={<IconAlertTriangle size={14} />} mb="xs">
              <Text size="xs">
                {err.row != null && <Badge size="xs" mr="xs">Row {err.row}</Badge>}
                {err.field && <Badge size="xs" variant="outline" mr="xs">{err.field}</Badge>}
                {err.message}
              </Text>
            </Alert>
          ))}
        </div>
      )}
      {warningItems.length > 0 && (
        <div>
          <Text fw={600} c="orange" size="sm" mb="xs">
            Warnings ({warningItems.length})
          </Text>
          {warningItems.map((warn, idx) => (
            <Alert key={`warn-${idx}`} color="orange" icon={<IconAlertTriangle size={14} />} mb="xs">
              <Text size="xs">
                {warn.row != null && <Badge size="xs" mr="xs">Row {warn.row}</Badge>}
                {warn.field && <Badge size="xs" variant="outline" mr="xs">{warn.field}</Badge>}
                {warn.message}
              </Text>
            </Alert>
          ))}
        </div>
      )}
    </Stack>
  );
}
