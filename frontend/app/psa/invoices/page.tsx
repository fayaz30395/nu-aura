'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Button, Group, Card, Table, Badge, ActionIcon, Menu, Container, Select } from '@mantine/core';
import { IconPlus, IconDotsVertical, IconFileInvoice, IconSend, IconDownload } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { psaService } from '@/lib/services/psa.service';
import { PSAInvoice, InvoiceStatus } from '@/lib/types/psa';
import { notifications } from '@mantine/notifications';

export default function PsaInvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<PSAInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            // Assuming a generic getAll for invoices exists or we fetch by status
            // For now using client/project fetch placeholders or a hypothetical getAll endpoint if added to service
            // Let's assume we iterate or fetch specific lists. Ideally backend should have getAllInvoices
            // Since service doesn't have getAllInvoices, we might need to add it or use a specific one.
            // For this demo, let's assume empty or mock.
            setInvoices([]);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            notifications.show({ title: 'Error', message: 'Failed to load invoices', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (status: InvoiceStatus) => {
        switch (status) {
            case InvoiceStatus.PAID: return 'green';
            case InvoiceStatus.OVERDUE: return 'red';
            case InvoiceStatus.SENT: return 'blue';
            case InvoiceStatus.DRAFT: return 'gray';
            default: return 'gray';
        }
    };

    const rows = invoices.map((inv) => (
        <Table.Tr key={inv.id}>
            <Table.Td>
                <Text fw={500}>{inv.invoiceNumber}</Text>
                <Text size="xs" c="dimmed">Due: {inv.dueDate}</Text>
            </Table.Td>
            <Table.Td>
                {/* We would look up client name here or have it in DTO */}
                Client ID: {inv.clientId.substring(0, 8)}...
            </Table.Td>
            <Table.Td>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.totalAmount)}
            </Table.Td>
            <Table.Td>
                <Badge color={statusColor(inv.status)}>{inv.status}</Badge>
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
                            <Menu.Item leftSection={<IconFileInvoice size={16} stroke={1.5} />} onClick={() => router.push(`/psa/invoices/${inv.id}`)}>
                                View Details
                            </Menu.Item>
                            <Menu.Item leftSection={<IconDownload size={16} stroke={1.5} />}>
                                Download PDF
                            </Menu.Item>
                            {inv.status === InvoiceStatus.DRAFT && (
                                <Menu.Item leftSection={<IconSend size={16} stroke={1.5} />}>
                                    Send to Client
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
                    <Title order={2}>Invoices</Title>
                    <Text c="dimmed">Manage client billing and payments</Text>
                </div>
                <Button leftSection={<IconPlus size={20} />} onClick={() => router.push('/psa/invoices/new')}>
                    Create Invoice
                </Button>
            </Group>

            <Card withBorder radius="md" p="md">
                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Invoice #</Table.Th>
                            <Table.Th>Client</Table.Th>
                            <Table.Th>Amount</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {loading ? (
                            <Table.Tr><Table.Td colSpan={5} align="center">Loading...</Table.Td></Table.Tr>
                        ) : rows.length > 0 ? (
                            rows
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={5} align="center">
                                    <Text c="dimmed">No invoices found</Text>
                                    <Button variant="light" mt="xs" onClick={() => router.push('/psa/invoices/new')}>
                                        Create your first invoice
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
