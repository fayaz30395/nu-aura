'use client';

import React from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  PlayCircle,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Badge, Button, Card, CardContent, EmptyState, Input, Select} from '@/components/ui';
import type {TrainingProgram} from '@/lib/types/grow/training';
import {ProgramStatus, TrainingCategory} from '@/lib/types/grow/training';
import {toBadgeVariant} from '@/lib/utils/type-guards';

const categoryOptions = [
  {value: TrainingCategory.TECHNICAL, label: 'Technical'},
  {value: TrainingCategory.SOFT_SKILLS, label: 'Soft Skills'},
  {value: TrainingCategory.LEADERSHIP, label: 'Leadership'},
  {value: TrainingCategory.COMPLIANCE, label: 'Compliance'},
  {value: TrainingCategory.SAFETY, label: 'Safety'},
  {value: TrainingCategory.PRODUCT, label: 'Product'},
  {value: TrainingCategory.SALES, label: 'Sales'},
  {value: TrainingCategory.CUSTOMER_SERVICE, label: 'Customer Service'},
  {value: TrainingCategory.OTHER, label: 'Other'},
];

const statusOptions = [
  {value: ProgramStatus.DRAFT, label: 'Draft'},
  {value: ProgramStatus.SCHEDULED, label: 'Scheduled'},
  {value: ProgramStatus.IN_PROGRESS, label: 'In Progress'},
  {value: ProgramStatus.COMPLETED, label: 'Completed'},
  {value: ProgramStatus.CANCELLED, label: 'Cancelled'},
];

const getStatusIcon = (status: ProgramStatus) => {
  switch (status) {
    case ProgramStatus.DRAFT:
      return <FileText className="h-4 w-4"/>;
    case ProgramStatus.SCHEDULED:
      return <Calendar className="h-4 w-4"/>;
    case ProgramStatus.IN_PROGRESS:
      return <PlayCircle className="h-4 w-4"/>;
    case ProgramStatus.COMPLETED:
      return <CheckCircle className="h-4 w-4"/>;
    case ProgramStatus.CANCELLED:
      return <XCircle className="h-4 w-4"/>;
    default:
      return <AlertCircle className="h-4 w-4"/>;
  }
};

const getCategoryColor = (category: TrainingCategory): string => {
  switch (category) {
    case TrainingCategory.TECHNICAL:
      return 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200';
    case TrainingCategory.SOFT_SKILLS:
      return 'bg-accent-300 text-accent-900 dark:bg-accent-900 dark:text-accent-400';
    case TrainingCategory.LEADERSHIP:
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
    case TrainingCategory.COMPLIANCE:
      return 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200';
    case TrainingCategory.SAFETY:
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
  }
};

interface ManageProgramsTabProps {
  programs: TrainingProgram[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onCreateProgram: () => void;
  onViewProgram: (program: TrainingProgram) => void;
  onEditProgram: (program: TrainingProgram) => void;
  onEnrollEmployee: (program: TrainingProgram) => void;
  onDeleteProgram: (programId: string) => void;
}

export function ManageProgramsTab({
                                    programs,
                                    loading,
                                    searchQuery,
                                    statusFilter,
                                    categoryFilter,
                                    onSearchChange,
                                    onStatusFilterChange,
                                    onCategoryFilterChange,
                                    onCreateProgram,
                                    onViewProgram,
                                    onEditProgram,
                                    onEnrollEmployee,
                                    onDeleteProgram,
                                  }: ManageProgramsTabProps) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="card-aura">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"/>
              <Input
                type="text"
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 input-aura"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full sm:w-48 input-aura"
            >
              <option value="">All Status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="w-full sm:w-48 input-aura"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>
      {/* Programs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className='h-8 w-8 animate-spin text-accent'/>
        </div>
      ) : programs.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8"/>}
          title="No Training Programs Found"
          description="Create your first training program to get started and offer learning opportunities"
          action={{
            label: 'Create Program',
            onClick: onCreateProgram,
          }}
          iconColor="violet"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id} className="card-interactive overflow-hidden">
              <CardContent className="p-0">
                <div className='bg-gradient-to-r from-accent-500 to-accent-700 p-4 text-inverse'>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm opacity-80">{program.programCode}</p>
                      <h3 className="text-xl font-semibold">{program.programName}</h3>
                    </div>
                    <Badge variant={toBadgeVariant(program.status)} className="flex items-center gap-1">
                      {getStatusIcon(program.status)}
                      {program.status ? program.status.replace('_', ' ') : '-'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(program.category)}`}
                    >
                      {program.category ? program.category.replace('_', ' ') : '-'}
                    </span>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)]">
                      {program.deliveryMode ? program.deliveryMode.replace('_', ' ') : '-'}
                    </span>
                    {program.isMandatory && (
                      <span
                        className='px-2 py-1 text-xs font-medium rounded-full bg-status-danger-bg text-status-danger-text'>
                        Mandatory
                      </span>
                    )}
                  </div>

                  <p className="text-body-secondary line-clamp-2">
                    {program.description || 'No description provided'}
                  </p>

                  <div className="space-y-2 text-sm">
                    {program.trainerName && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Users className="h-4 w-4"/>
                        <span>Trainer: {program.trainerName}</span>
                      </div>
                    )}
                    {program.durationHours && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Clock className="h-4 w-4"/>
                        <span>{program.durationHours} hours</span>
                      </div>
                    )}
                    {program.startDate && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4"/>
                        <span>
                          {new Date(program.startDate).toLocaleDateString()}
                          {program.endDate && ` - ${new Date(program.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                    )}
                    {program.costPerParticipant && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <DollarSign className="h-4 w-4"/>
                        <span>${program.costPerParticipant} per participant</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[var(--border-main)]">
                    <Button size="sm" variant="outline" onClick={() => onViewProgram(program)}>
                      <Eye className="h-4 w-4"/>
                    </Button>
                    <PermissionGate permission={Permissions.TRAINING_ENROLL}>
                      <Button size="sm" variant="outline" onClick={() => onEnrollEmployee(program)}>
                        <UserPlus className="h-4 w-4"/>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission={Permissions.TRAINING_EDIT}>
                      <Button size="sm" variant="outline" onClick={() => onEditProgram(program)}>
                        <Edit className="h-4 w-4"/>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission={Permissions.TRAINING_MANAGE}>
                      <Button
                        size="sm"
                        variant="outline"
                        className='text-status-danger-text hover:bg-status-danger-bg'
                        onClick={() => onDeleteProgram(program.id)}
                      >
                        <Trash2 className="h-4 w-4"/>
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
