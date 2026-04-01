'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/components/notifications/ToastProvider';
import {
  useTickets,
  useCreateTicket,
  useUpdateTicketStatus,
  useActiveCategories,
} from '@/lib/hooks/queries/useHelpdesk';
import type { TicketPriority, TicketStatus, TicketResponse } from '@/lib/services/hrms/helpdesk.service';
import {
  Plus,
  Search,
  Filter,
  Ticket,
  Clock,
  CheckCircle2,
  Circle,
  Pause,
  ChevronLeft,
  ChevronRight,
  User,
  Tag,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; variant: 'danger' | 'warning' | 'info' | 'default' }> = {
  URGENT: { label: 'Urgent', variant: 'danger' },
  HIGH: { label: 'High', variant: 'warning' },
  MEDIUM: { label: 'Medium', variant: 'info' },
  LOW: { label: 'Low', variant: 'default' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'danger' | 'warning' | 'info' | 'success' | 'default'; icon: React.FC<{ className?: string }> }> = {
  OPEN: { label: 'Open', variant: 'info', icon: Circle },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning', icon: Clock },
  WAITING_FOR_RESPONSE: { label: 'Waiting', variant: 'default', icon: Pause },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', variant: 'default', icon: CheckCircle2 },
};

const ALL_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_RESPONSE', 'RESOLVED', 'CLOSED'];
const ALL_PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

// ─── Create Ticket Schema ────────────────────────────────────────────────────

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject cannot exceed 200 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description cannot exceed 5000 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
  categoryId: z.string().optional(),
  tags: z.string().max(500, 'Tags cannot exceed 500 characters').optional(),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function TicketListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Queries
  const { data: ticketsPage, isLoading } = useTickets(page, pageSize);
  const { data: categories = [] } = useActiveCategories();
  const createMutation = useCreateTicket();
  const statusMutation = useUpdateTicketStatus();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      priority: 'MEDIUM',
      categoryId: '',
      tags: '',
    },
  });

  // Client-side filtering of already-fetched page
  const filteredTickets = useMemo(() => {
    const tickets = ticketsPage?.content ?? [];
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = t.subject?.toLowerCase().includes(q);
        const matchesNumber = t.ticketNumber?.toLowerCase().includes(q);
        const matchesEmployee = t.employeeName?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesNumber && !matchesEmployee) return false;
      }
      return true;
    });
  }, [ticketsPage, statusFilter, priorityFilter, searchQuery]);

  const totalPages = ticketsPage?.totalPages ?? 0;

  const onCreateSubmit = async (data: CreateTicketFormData) => {
    if (!user?.employeeId) {
      toast.error('Employee ID not found. Please log in again.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        employeeId: user.employeeId,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        categoryId: data.categoryId || undefined,
        tags: data.tags || undefined,
      });
      toast.success('Ticket created successfully');
      setShowCreateModal(false);
      reset();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create ticket';
      toast.error(message);
    }
  };

  const handleQuickStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await statusMutation.mutateAsync({ id: ticketId, status: newStatus });
      toast.success(`Ticket status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter || priorityFilter || searchQuery;

  return (
    <AppLayout activeMenuItem="helpdesk">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Support Tickets
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              View and manage helpdesk tickets
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Ticket
          </Button>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by subject, ticket number, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700"
            />
          </div>
          <Button
            variant={showFilters ? 'soft' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="h-4 w-4" />}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-accent-700 text-white rounded-full">
                {[statusFilter, priorityFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
                  className="input-aura text-sm"
                >
                  <option value="">All Statuses</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
                  className="input-aura text-sm"
                >
                  <option value="">All Priorities</option>
                  {ALL_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Ticket Table */}
        {isLoading ? (
          <Card className="p-0 overflow-hidden">
            <div className="space-y-0">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-main)] last:border-0">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-48 flex-1" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </Card>
        ) : filteredTickets.length === 0 ? (
          <Card className="p-12 text-center">
            <Ticket className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {hasActiveFilters ? 'No tickets match your filters' : 'No tickets yet'}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first support ticket to get started'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            ) : (
              <Button variant="primary" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Create Ticket
              </Button>
            )}
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-main)] bg-[var(--bg-surface)]">
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Ticket</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Requester</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Assignee</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {filteredTickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onNavigate={() => router.push(`/helpdesk/tickets/${ticket.id}`)}
                      onStatusChange={handleQuickStatusChange}
                      formatDate={formatDate}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)]">
                  Page {page + 1} of {totalPages} ({ticketsPage?.totalElements ?? 0} tickets)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); reset(); }} size="lg">
        <ModalHeader onClose={() => { setShowCreateModal(false); reset(); }}>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Create Support Ticket</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Describe your issue and we will get back to you</p>
          </div>
        </ModalHeader>
        <form onSubmit={handleSubmit(onCreateSubmit)}>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Subject *</label>
                <input
                  type="text"
                  placeholder="Brief description of the issue"
                  className="input-aura w-full"
                  {...register('subject')}
                />
                {errors.subject && <p className="text-sm text-danger-500 mt-1">{errors.subject.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description *</label>
                <textarea
                  placeholder="Provide details about your issue..."
                  rows={5}
                  className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 text-sm"
                  {...register('description')}
                />
                {errors.description && <p className="text-sm text-danger-500 mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Priority</label>
                  <select className="input-aura w-full" {...register('priority')}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Category</label>
                  <select className="input-aura w-full" {...register('categoryId')}>
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Tags</label>
                <input
                  type="text"
                  placeholder="Comma-separated tags (e.g. vpn, network, access)"
                  className="input-aura w-full"
                  {...register('tags')}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => { setShowCreateModal(false); reset(); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}

// ─── Ticket Row Component ────────────────────────────────────────────────────

interface TicketRowProps {
  ticket: TicketResponse;
  onNavigate: () => void;
  onStatusChange: (id: string, status: TicketStatus) => void;
  formatDate: (date: string | null) => string;
}

function TicketRow({ ticket, onNavigate, onStatusChange, formatDate }: TicketRowProps) {
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;
  const StatusIcon = statusCfg.icon;

  return (
    <tr
      className="h-11 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
      onClick={onNavigate}
    >
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-sm font-mono text-accent-700 dark:text-accent-400">{ticket.ticketNumber || ticket.id.slice(0, 8)}</span>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{ticket.subject}</span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-secondary)]">{ticket.employeeName || '-'}</span>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        {ticket.categoryName ? (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">{ticket.categoryName}</span>
          </div>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">-</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center">
        <Badge variant={priorityCfg.variant} size="sm">{priorityCfg.label}</Badge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center">
        <Badge variant={statusCfg.variant} size="sm">
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </Badge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-sm text-[var(--text-secondary)]">{ticket.assignedToName || 'Unassigned'}</span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-sm text-[var(--text-muted)]">{formatDate(ticket.createdAt)}</span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <PermissionGate permission={Permissions.HELPDESK_TICKET_RESOLVE}>
          <select
            className="text-xs bg-transparent border border-[var(--border-main)] rounded px-1.5 py-1 text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-accent-700"
            value={ticket.status}
            onChange={(e) => onStatusChange(ticket.id, e.target.value as TicketStatus)}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </PermissionGate>
      </td>
    </tr>
  );
}
