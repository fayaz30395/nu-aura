'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Container, Tabs, Card, Table, Group, Badge, Button, Grid, ThemeIcon } from '@mantine/core';
import { IconBuildingBank, IconFirstAidKit, IconReceiptTax, IconSettings } from '@tabler/icons-react';
import { statutoryService } from '@/lib/services/statutory.service';
import { ProvidentFundConfig, ESIConfig, ProfessionalTaxSlab } from '@/lib/types/statutory';
import { notifications } from '@mantine/notifications';

export default function StatutoryPage() {
    const [activeTab, setActiveTab] = useState<string | null>('pf');
    const [pfConfigs, setPfConfigs] = useState<ProvidentFundConfig[]>([]);
    const [esiConfigs, setEsiConfigs] = useState<ESIConfig[]>([]);
    const [ptSlabs, setPtSlabs] = useState<ProfessionalTaxSlab[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'pf') fetchPfConfigs();
        if (activeTab === 'esi') fetchEsiConfigs();
        if (activeTab === 'pt') fetchPtSlabs('MH'); // Defaulting to Maharashtra for demo
    }, [activeTab]);

    const fetchPfConfigs = async () => {
        try {
            setLoading(true);
            const data = await statutoryService.getActivePFConfigs();
            setPfConfigs(data);
        } catch (error) {
            console.error('Error fetching PF configs:', error);
            // Fallback for demo
            setPfConfigs([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEsiConfigs = async () => {
        try {
            setLoading(true);
            const data = await statutoryService.getActiveESIConfigs();
            setEsiConfigs(data);
        } catch (error) {
            console.error('Error fetching ESI configs:', error);
            setEsiConfigs([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPtSlabs = async (stateCode: string) => {
        try {
            setLoading(true);
            const data = await statutoryService.getPTSlabsByState(stateCode);
            setPtSlabs(data);
        } catch (error) {
            console.error('Error fetching PT slabs:', error);
            setPtSlabs([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size="xl" py="lg">
            <Title order={2} mb="sm">Statutory Compliance</Title>
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
                </Tabs.List>

                <Tabs.Panel value="pf" py="md">
                    <Grid>
                        <Grid.Col span={8}>
                            <Card withBorder radius="md">
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
                            <Card withBorder radius="md" bg="gray.0">
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
                    <Card withBorder radius="md">
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
                    <Card withBorder radius="md">
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
            </Tabs>
        </Container>
    );
}
