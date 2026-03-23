'use client';

import { useState } from 'react';
import { Title, Text, Container, Tabs, Card, Table, Group, Badge, Button, Grid, ThemeIcon, Select, Loader, Alert } from '@mantine/core';
import { IconBuildingBank, IconFirstAidKit, IconReceiptTax, IconSettings, IconCalendar, IconDownload, IconInfoCircle } from '@tabler/icons-react';
import { AppLayout } from '@/components/layout';
import { Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useActivePFConfigs, useActiveESIConfigs, usePTSlabsByState, useMonthlyStatutoryContributions } from '@/lib/hooks/queries/useStatutory';

const MONTHS = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function fmt(n?: number | null): string {
    if (n == null || n === 0) return '—';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StatutoryPage() {
    const [activeTab, setActiveTab] = useState<string | null>('pf');

    // Monthly report state
    const now = new Date();
    const [reportMonth, setReportMonth] = useState<string>(String(now.getMonth() + 1));
    const [reportYear, setReportYear] = useState<string>(String(now.getFullYear()));
    const [reportFetched, setReportFetched] = useState(false);

    // React Query hooks
    const { data: pfConfigs = [], isLoading: _pfLoading } = useActivePFConfigs(activeTab === 'pf');
    const { data: esiConfigs = [], isLoading: _esiLoading } = useActiveESIConfigs(activeTab === 'esi');
    const { data: ptSlabs = [], isLoading: _ptLoading } = usePTSlabsByState('MH', activeTab === 'pt');
    const { data: contributions = [], isLoading: reportLoading, error: reportError, refetch } = useMonthlyStatutoryContributions(
        Number(reportMonth),
        Number(reportYear),
        activeTab === 'report' && reportFetched
    );


    const fetchMonthlyReport = async () => {
        setReportFetched(true);
        refetch();
    };

    const exportContributionsCSV = () => {
        const monthLabel = MONTHS.find(m => m.value === reportMonth)?.label ?? reportMonth;
        const headers = ['Employee ID', 'Gross Salary', 'PF Wage', 'PF Employee', 'PF Employer', 'EPS', 'VPF', 'ESI Wage', 'ESI Employee', 'ESI Employer', 'Prof Tax', 'TDS', 'Total Deduction'];
        const rows = contributions.map(c => {
            const totalDed = (c.pfEmployeeContribution || 0) + (c.esiEmployeeContribution || 0) + (c.professionalTax || 0) + (c.tdsDeducted || 0) + (c.vpfContribution || 0);
            return [
                c.employeeId,
                c.grossSalary,
                c.pfWage,
                c.pfEmployeeContribution,
                c.pfEmployerContribution,
                c.epsContribution,
                c.vpfContribution,
                c.esiWage,
                c.esiEmployeeContribution,
                c.esiEmployerContribution,
                c.professionalTax,
                c.tdsDeducted,
                totalDed.toFixed(2),
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statutory_contributions_${monthLabel}_${reportYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout>
        <Container size="xl" py="lg">
            <Title order={2} mb="sm" className="skeuo-emboss">Statutory Compliance</Title>
            <Text c="dimmed" mb="lg">Manage Provident Fund, ESI, and Professional Tax configurations.</Text>

            <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
                <Tabs.List>
                    <Tabs.Tab value="pf" leftSection={<IconBuildingBank size={16} />}>
                        Provident Fund (PF)
                    </Tabs.Tab>
                    <Tabs.Tab value="esi" leftSection={<IconFirstAidKit size={16} />}>
                        Employee State Insurance (ESI)
                    </Tabs.Tab>
                    <Tabs.Tab value="pt" leftSection={<IconReceiptTax size={16} />}>
                        Professional Tax (PT)
                    </Tabs.Tab>
                    <Tabs.Tab value="report" leftSection={<IconCalendar size={16} />}>
                        Monthly Report
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="pf" py="md">
                    <Grid>
                        <Grid.Col span={8}>
                            <Card withBorder className="skeuo-card" radius="md">
                                <Group justify="space-between" mb="md">
                                    <Title order={4}>Active PF Configurations</Title>
                                    <Button variant="light" size="xs">New Configuration</Button>
                                </Group>
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Effective Date</Table.Th>
                                            <Table.Th>Employee %</Table.Th>
                                            <Table.Th>Employer %</Table.Th>
                                            <Table.Th>Wage Ceiling</Table.Th>
                                            <Table.Th>Active</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {pfConfigs.length > 0 ? pfConfigs.map(config => (
                                            <Table.Tr key={config.id}>
                                                <Table.Td>{config.effectiveFrom}</Table.Td>
                                                <Table.Td>{config.employeeContributionPercentage}%</Table.Td>
                                                <Table.Td>{config.employerContributionPercentage}%</Table.Td>
                                                <Table.Td>{config.wageCeiling || 'No Limit'}</Table.Td>
                                                <Table.Td>
                                                    <Badge color={config.isActive ? 'green' : 'gray'}>{config.isActive ? 'Active' : 'Inactive'}</Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        )) : (
                                            <Table.Tr><Table.Td colSpan={5} align="center">No active PF configurations found</Table.Td></Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <Card withBorder className="skeuo-card" radius="md" bg="gray.0">
                                <Group mb="xs">
                                    <ThemeIcon color="blue" variant="light"><IconSettings size={18} /></ThemeIcon>
                                    <Text fw={500}>PF Rules</Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Provident Fund settings determine the contribution rates for employees and employer.
                                    Ensure effective dates do not overlap.
                                </Text>
                            </Card>
                        </Grid.Col>
                    </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="esi" py="md">
                    <Card withBorder className="skeuo-card" radius="md">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Active ESI Configurations</Title>
                            <Button variant="light" size="xs">New Configuration</Button>
                        </Group>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Effective Date</Table.Th>
                                    <Table.Th>Employee %</Table.Th>
                                    <Table.Th>Employer %</Table.Th>
                                    <Table.Th>Active</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {esiConfigs.length > 0 ? esiConfigs.map(config => (
                                    <Table.Tr key={config.id}>
                                        <Table.Td>{config.effectiveFrom}</Table.Td>
                                        <Table.Td>{config.employeeContributionPercentage}%</Table.Td>
                                        <Table.Td>{config.employerContributionPercentage}%</Table.Td>
                                        <Table.Td>
                                            <Badge color={config.isActive ? 'green' : 'gray'}>{config.isActive ? 'Active' : 'Inactive'}</Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                )) : (
                                    <Table.Tr><Table.Td colSpan={4} align="center">No active ESI configurations found</Table.Td></Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="pt" py="md">
                    <Card withBorder className="skeuo-card" radius="md">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Professional Tax Slabs (Maharashtra)</Title>
                            <Button variant="light" size="xs">Add Slab</Button>
                        </Group>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Salary Range</Table.Th>
                                    <Table.Th>Tax Amount</Table.Th>
                                    <Table.Th>Active</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {ptSlabs.length > 0 ? ptSlabs.map(slab => (
                                    <Table.Tr key={slab.id}>
                                        <Table.Td>{slab.minSalary} - {slab.maxSalary || 'Above'}</Table.Td>
                                        <Table.Td>{slab.taxAmount}</Table.Td>
                                        <Table.Td>
                                            <Badge color={slab.isActive ? 'green' : 'gray'}>{slab.isActive ? 'Active' : 'Inactive'}</Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                )) : (
                                    <Table.Tr><Table.Td colSpan={3} align="center">No PT slabs found</Table.Td></Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>
                <Tabs.Panel value="report" py="md">
                    <Card withBorder className="skeuo-card" radius="md">
                        <Group justify="space-between" mb="md" align="flex-end">
                            <Title order={4}>Monthly Statutory Contributions</Title>
                            {reportFetched && contributions.length > 0 && (
                                <PermissionGate permission={Permissions.STATUTORY_VIEW}>
                                    <Button
                                        variant="light"
                                        size="xs"
                                        leftSection={<IconDownload size={14} />}
                                        onClick={exportContributionsCSV}
                                    >
                                        Export CSV
                                    </Button>
                                </PermissionGate>
                            )}
                        </Group>

                        <Group mb="md" gap="sm">
                            <Select
                                label="Month"
                                data={MONTHS}
                                value={reportMonth}
                                onChange={v => setReportMonth(v ?? reportMonth)}
                                w={150}
                            />
                            <Select
                                label="Year"
                                data={Array.from({ length: 5 }, (_, i) => {
                                    const y = now.getFullYear() - i;
                                    return { value: String(y), label: String(y) };
                                })}
                                value={reportYear}
                                onChange={v => setReportYear(v ?? reportYear)}
                                w={110}
                            />
                            <PermissionGate permission={Permissions.STATUTORY_VIEW}>
                                <Button
                                    mt={24}
                                    onClick={fetchMonthlyReport}
                                    loading={reportLoading}
                                    leftSection={<IconCalendar size={14} />}
                                >
                                    Load Report
                                </Button>
                            </PermissionGate>
                        </Group>

                        {reportError && (
                            <Alert icon={<IconInfoCircle size={16} />} color="red" mb="md">
                                {typeof reportError === 'object' && reportError ? (reportError as Error).message : String(reportError)}
                            </Alert>
                        )}

                        {reportLoading && (
                            <Group justify="center" py="xl">
                                <Loader size="sm" />
                                <Text c="dimmed" size="sm">Loading contributions...</Text>
                            </Group>
                        )}

                        {!reportLoading && reportFetched && contributions.length === 0 && (
                            <Alert icon={<IconInfoCircle size={16} />} color="blue">
                                No statutory contributions found for {MONTHS.find(m => m.value === reportMonth)?.label} {reportYear}.
                                Contributions are generated when payslips are processed.
                            </Alert>
                        )}

                        {!reportLoading && contributions.length > 0 && (() => {
                            const totals = contributions.reduce((acc, c) => ({
                                gross: acc.gross + (c.grossSalary || 0),
                                pfEmp: acc.pfEmp + (c.pfEmployeeContribution || 0),
                                pfEr: acc.pfEr + (c.pfEmployerContribution || 0),
                                eps: acc.eps + (c.epsContribution || 0),
                                vpf: acc.vpf + (c.vpfContribution || 0),
                                esiEmp: acc.esiEmp + (c.esiEmployeeContribution || 0),
                                esiEr: acc.esiEr + (c.esiEmployerContribution || 0),
                                pt: acc.pt + (c.professionalTax || 0),
                                tds: acc.tds + (c.tdsDeducted || 0),
                            }), { gross: 0, pfEmp: 0, pfEr: 0, eps: 0, vpf: 0, esiEmp: 0, esiEr: 0, pt: 0, tds: 0 });

                            return (
                                <div style={{ overflowX: 'auto' }}>
                                    <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Employee</Table.Th>
                                                <Table.Th ta="right">Gross</Table.Th>
                                                <Table.Th ta="right">PF (Emp)</Table.Th>
                                                <Table.Th ta="right">PF (Er)</Table.Th>
                                                <Table.Th ta="right">EPS</Table.Th>
                                                <Table.Th ta="right">VPF</Table.Th>
                                                <Table.Th ta="right">ESI (Emp)</Table.Th>
                                                <Table.Th ta="right">ESI (Er)</Table.Th>
                                                <Table.Th ta="right">Prof Tax</Table.Th>
                                                <Table.Th ta="right">TDS</Table.Th>
                                                <Table.Th ta="right">Total Ded.</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {contributions.map(c => {
                                                const totalDed = (c.pfEmployeeContribution || 0) + (c.esiEmployeeContribution || 0) + (c.professionalTax || 0) + (c.tdsDeducted || 0) + (c.vpfContribution || 0);
                                                return (
                                                    <Table.Tr key={c.id}>
                                                        <Table.Td>
                                                            <Text size="xs" ff="monospace" c="dimmed">
                                                                {c.employeeId.slice(0, 8)}…
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td ta="right">{fmt(c.grossSalary)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.pfEmployeeContribution)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.pfEmployerContribution)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.epsContribution)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.vpfContribution)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.esiEmployeeContribution)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.esiEmployerContribution)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.professionalTax)}</Table.Td>
                                                        <Table.Td ta="right">{fmt(c.tdsDeducted)}</Table.Td>
                                                        <Table.Td ta="right" fw={500}>{fmt(totalDed)}</Table.Td>
                                                    </Table.Tr>
                                                );
                                            })}
                                        </Table.Tbody>
                                        <Table.Tfoot>
                                            <Table.Tr style={{ backgroundColor: 'var(--mantine-color-gray-1)' }}>
                                                <Table.Td fw={600}>Totals ({contributions.length})</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.gross)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.pfEmp)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.pfEr)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.eps)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.vpf)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.esiEmp)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.esiEr)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.pt)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{fmt(totals.tds)}</Table.Td>
                                                <Table.Td ta="right" fw={700}>{fmt(totals.pfEmp + totals.esiEmp + totals.pt + totals.tds + totals.vpf)}</Table.Td>
                                            </Table.Tr>
                                        </Table.Tfoot>
                                    </Table>
                                </div>
                            );
                        })()}
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Container>
        </AppLayout>
    );
}
