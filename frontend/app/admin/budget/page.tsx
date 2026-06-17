'use client';

import React, {useState} from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Plus,
  Send,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getGetAllBudgetsQueryKey,
  useApproveBudget,
  useCreateBudget,
  useGetAllBudgets,
  useGetDashboard10,
  useRejectBudget,
  useSubmitForApproval1,
} from '@/lib/generated/api/budget-planning/budget-planning';
import {useGetAllDepartments} from '@/lib/generated/api/departments/departments';
import type {HeadcountBudgetResponse, BudgetDashboard} from '@/lib/generated/api/model';
import {formatDate} from '@/lib/utils/format/date';

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN];

function fmt(n?: number, currency = 'USD') {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {style: 'currency', currency, maximumFractionDigits: 0}).format(n);
}

function statusVariant(status?: string): 'default' | 'warning' | 'success' | 'danger' {
  if (status === 'DRAFT') return 'default';
  if (status === 'PENDING_APPROVAL') return 'warning';
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'default';
}

function DashboardCards({dashboard}: {dashboard?: BudgetDashboard}) {
  const cards = [
    {label: 'Total Budget', value: fmt(dashboard?.totalBudget), icon: DollarSign},
    {label: 'Approved', value: `${dashboard?.approvedBudgets ?? 0} budgets`, icon: Check},
    {label: 'Pending', value: `${dashboard?.pendingBudgets ?? 0} pending`, icon: Send},
    {label: 'Headcount', value: String(dashboard?.totalPlannedHeadcount ?? '—'), icon: Users},
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(({label, value, icon: Icon}) => (
        <Card key={label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[var(--text-muted)]"/>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BudgetRow({budget, isAdmin}: {budget: HeadcountBudgetResponse; isAdmin: boolean}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = () => queryClient.invalidateQueries({queryKey: getGetAllBudgetsQueryKey()});

  const submitMutation = useSubmitForApproval1();
  const approveMutation = useApproveBudget();
  const rejectMutation = useRejectBudget();

  const pct = budget.utilizationPercent ?? 0;
  const barColor = pct >= 90 ? 'bg-danger-500' : pct >= 70 ? 'bg-warning-500' : 'bg-success-500';

  return (
    <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-secondary)] transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0"/>
          : <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0"/>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{budget.name}</span>
            <Badge variant={statusVariant(budget.status)} className="text-[10px] shrink-0">{budget.status}</Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {budget.departmentName} · FY{budget.fiscalYear}{budget.quarter ? ` Q${budget.quarter}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{fmt(budget.totalBudget, budget.currency)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{pct.toFixed(0)}% utilized</p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-3">
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5">
            <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{width: `${Math.min(pct, 100)}%`}}/>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[var(--text-muted)]">Salary Budget</p>
              <p className="font-medium">{fmt(budget.salaryBudget, budget.currency)}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Remaining</p>
              <p className="font-medium">{fmt(budget.remainingBudget, budget.currency)}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Opening HC</p>
              <p className="font-medium">{budget.openingHeadcount ?? '—'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Planned Hires</p>
              <p className="font-medium">{budget.plannedHires ?? '—'}</p>
            </div>
          </div>

          {budget.notes && <p className="text-xs text-[var(--text-secondary)] italic">{budget.notes}</p>}

          {budget.approvedBy && (
            <p className="text-xs text-[var(--text-muted)]">
              Approved by {budget.approvedBy} on {budget.approvedAt ? formatDate(budget.approvedAt) : '—'}
            </p>
          )}

          {confirmReject ? (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded p-3 space-y-2">
              <Input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmReject(false)} className="text-xs h-7 px-3">Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => {
                    rejectMutation.mutate({budgetId: budget.id ?? '', params: {reason: rejectReason}}, {
                      onSuccess: () => {invalidate(); setConfirmReject(false);},
                    });
                  }}
                  disabled={rejectMutation.isPending}
                  className="text-xs h-7 px-3 bg-danger-600 hover:bg-danger-700 text-white border-0"
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {budget.status === 'DRAFT' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitMutation.mutate({budgetId: budget.id ?? ''}, {onSuccess: invalidate})}
                  disabled={submitMutation.isPending}
                  className="text-xs h-7 px-3 flex items-center gap-1"
                >
                  <Send className="w-3 h-3"/>
                  Submit for Approval
                </Button>
              )}
              {isAdmin && budget.status === 'PENDING_APPROVAL' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate({budgetId: budget.id ?? ''}, {onSuccess: invalidate})}
                    disabled={approveMutation.isPending}
                    className="text-xs h-7 px-3 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3"/>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmReject(true)}
                    className="text-xs h-7 px-3 flex items-center gap-1 text-danger-600 border-danger-300"
                  >
                    <XCircle className="w-3 h-3"/>
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateBudgetPanel({onClose}: {onClose: () => void}) {
  const queryClient = useQueryClient();
  const {data: departments} = useGetAllDepartments();
  const depts = Array.isArray(departments) ? departments : [];

  const [form, setForm] = useState({
    name: '',
    fiscalYear: new Date().getFullYear(),
    departmentId: '',
    departmentName: '',
    totalBudget: '',
    openingHeadcount: '',
    plannedHires: '',
    currency: 'USD',
    notes: '',
  });
  const [error, setError] = useState('');
  const createMutation = useCreateBudget();

  const set = (k: string, v: string | number) => setForm(f => ({...f, [k]: v}));

  const submit = () => {
    if (!form.name.trim() || !form.departmentId || !form.totalBudget || !form.openingHeadcount) {
      setError('Name, department, total budget, and opening headcount are required');
      return;
    }
    setError('');
    const dept = depts.find(d => (d as {id?: string}).id === form.departmentId);
    createMutation.mutate({
      data: {
        name: form.name.trim(),
        fiscalYear: Number(form.fiscalYear),
        departmentId: form.departmentId,
        departmentName: (dept as {name?: string})?.name ?? form.departmentName,
        totalBudget: Number(form.totalBudget),
        openingHeadcount: Number(form.openingHeadcount),
        plannedHires: form.plannedHires ? Number(form.plannedHires) : undefined,
        currency: form.currency,
        notes: form.notes.trim() || undefined,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getGetAllBudgetsQueryKey()});
        onClose();
      },
      onError: () => setError('Failed to create budget'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="New Headcount Budget" widthClassName="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">New Headcount Budget</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Budget Name *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} className="h-8 text-sm" placeholder="e.g. Engineering Q1 2025"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Fiscal Year *</label>
              <Input type="number" value={form.fiscalYear} onChange={e => set('fiscalYear', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className="input-aura w-full h-8 text-sm">
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Department *</label>
            <select
              value={form.departmentId}
              onChange={e => set('departmentId', e.target.value)}
              className="input-aura w-full h-8 text-sm"
            >
              <option value="">Select department...</option>
              {depts.map((d: {id?: string; name?: string}) => (
                <option key={d.id} value={d.id ?? ''}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Total Budget *</label>
            <Input type="number" value={form.totalBudget} onChange={e => set('totalBudget', e.target.value)} className="h-8 text-sm" placeholder="0"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Opening Headcount *</label>
              <Input type="number" value={form.openingHeadcount} onChange={e => set('openingHeadcount', e.target.value)} className="h-8 text-sm" placeholder="0"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Planned Hires</label>
              <Input type="number" value={form.plannedHires} onChange={e => set('plannedHires', e.target.value)} className="h-8 text-sm" placeholder="0"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className="input-aura w-full text-sm resize-none" placeholder="Optional context..."/>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={submit} disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

export default function BudgetPlanningPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [fiscalYear] = useState(new Date().getFullYear());
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);

  const {data: dashboard} = useGetDashboard10({fiscalYear}, {query: {enabled: isAuthenticated && hasHydrated}});
  const {data: budgetsData, isLoading} = useGetAllBudgets(
    {pageable: {page: 0, size: 50}},
    {query: {enabled: isAuthenticated && hasHydrated}},
  );

  const allBudgets: HeadcountBudgetResponse[] = (budgetsData as {content?: HeadcountBudgetResponse[]})?.content ?? [];
  const filtered = statusFilter ? allBudgets.filter(b => b.status === statusFilter) : allBudgets;

  if (hasHydrated && isAuthenticated && isReady && !hasAnyRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN)) {
    return null;
  }

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Budget Planning</h1>
            <p className="page-subtitle">Manage headcount budgets and approval workflows — FY{fiscalYear}.</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/>
            New Budget
          </Button>
        </div>

        <DashboardCards dashboard={dashboard as BudgetDashboard | undefined}/>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm flex items-center gap-2 mr-auto">
                <BarChart3 className="w-4 h-4 text-[var(--text-muted)]"/>
                Budgets
              </CardTitle>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-aura text-xs h-8 pr-6 py-0"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {isLoading ? (
              Array.from({length: 3}).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart3 className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
                <p className="text-sm text-[var(--text-muted)]">No budgets yet</p>
                <p className="text-xs text-[var(--text-muted)]">Create your first headcount budget</p>
              </div>
            ) : (
              filtered.map(b => <BudgetRow key={b.id} budget={b} isAdmin={isAdmin}/>)
            )}
          </CardContent>
        </Card>

        {showCreate && <CreateBudgetPanel onClose={() => setShowCreate(false)}/>}
      </div>
    </AppLayout>
  );
}
