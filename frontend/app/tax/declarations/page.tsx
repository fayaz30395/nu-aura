'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Button, Group, Card, Table, Badge, ActionIcon, Menu, Container } from '@mantine/core';
import { IconPlus, IconDotsVertical, IconFileText, IconCheck, IconX, IconEye } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { taxService } from '@/lib/services/tax.service';
import { TaxDeclarationResponse, DeclarationStatus } from '@/lib/types/tax';
import { notifications } from '@mantine/notifications';

export default function TaxDeclarationsPage() {
    const router = useRouter();
    const [declarations, setDeclarations] = useState<TaxDeclarationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeclarations();
    }, []);

    const fetchDeclarations = async () => {
        try {
            setLoading(true);
            // In a real scenario, we might fetch by current user employeeId or getAll if admin
            // For now, let's assume we fetch all for the demo/admin view
            const data = await taxService.getAll({ page: 0, size: 20 });
            setDeclarations(data.content || []);
        } catch (error) {
            console.error('Error fetching tax declarations:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to load tax declarations',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (status: DeclarationStatus) => {
        switch (status) {
            case DeclarationStatus.APPROVED: return 'green';
            case DeclarationStatus.REJECTED: return 'red';
            case DeclarationStatus.SUBMITTED: return 'blue';
            case DeclarationStatus.DRAFT: return 'gray';
            default: return 'gray';
        }
    };

    const rows = declarations.map((declaration) => (
        <Table.Tr key={declaration.id}>
            <Table.Td>{declaration.financialYear}</Table.Td>
            <Table.Td>{declaration.employeeName}</Table.Td>
            <Table.Td>{declaration.taxRegime.replace('_', ' ')}</Table.Td>
            <Table.Td>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(declaration.taxableIncome)}
            </Table.Td>
            <Table.Td>
                <Badge color={statusColor(declaration.status)}>{declaration.status}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={0} justify="flex-end">
                    <Menu transitionProps={{ transition: 'pop' }} withArrow position="bottom-end">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} stroke={1.5} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEye size={16} stroke={1.5} />} onClick={() => router.push(`/tax/declarations/${declaration.id}`)}>
                                View Details
                            </Menu.Item>
                            {declaration.status === DeclarationStatus.DRAFT && (
                                <Menu.Item leftSection={<IconCheck size={16} stroke={1.5} />} onClick={() => { /* Submit logic */ }}>
                                    Submit
                                </Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl" py="lg">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Tax Declarations</Title>
                    <Text c="dimmed">Manage employee tax declarations and proofs</Text>
                </div>
                <Button leftSection={<IconPlus size={20} />} onClick={() => router.push('/tax/declarations/new')}>
                    New Declaration
                </Button>
            </Group>

            <Card withBorder radius="md" p="md">
                <Table verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Financial Year</Table.Th>
                            <Table.Th>Employee</Table.Th>
                            <Table.Th>Regime</Table.Th>
                            <Table.Th>Taxable Income</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {loading ? (
                            <Table.Tr>
                                <Table.Td colSpan={6} align="center">Loading...</Table.Td>
                            </Table.Tr>
                        ) : rows.length > 0 ? (
                            rows
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={6} align="center">
                                    <Text c="dimmed">No tax declarations found</Text>
                                    <Button variant="light" mt="xs" onClick={() => router.push('/tax/declarations/new')}>
                                        Create your first declaration
                                    </Button>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>
        </Container>
    );
}
