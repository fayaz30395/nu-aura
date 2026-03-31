'use client';

import React from 'react';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Eye,
  Plus,
  Play,
  CheckCircle,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { Card, CardContent, Button, Input, Select, Badge } from '@/components/ui';
import { ProgramStatus, TrainingCategory } from '@/lib/types/grow/training';
import type { TrainingProgram } from '@/lib/types/grow/training';

const categoryOptions = [
  { value: TrainingCategory.TECHNICAL, label: 'Technical' },
  { value: TrainingCategory.SOFT_SKILLS, label: 'Soft Skills' },
  { value: TrainingCategory.LEADERSHIP, label: 'Leadership' },
  { value: TrainingCategory.COMPLIANCE, label: 'Compliance' },
  { value: TrainingCategory.SAFETY, label: 'Safety' },
  { value: TrainingCategory.PRODUCT, label: 'Product' },
  { value: TrainingCategory.SALES, label: 'Sales' },
  { value: TrainingCategory.CUSTOMER_SERVICE, label: 'Customer Service' },
  { value: TrainingCategory.OTHER, label: 'Other' },
];

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

interface CourseCatalogTabProps {
  programs: TrainingProgram[];
  loading: boolean;
  searchQuery: string;
  categoryFilter: string;
  isEnrolled: (programId: string) => boolean;
  enrolling: boolean;
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onViewProgram: (program: TrainingProgram) => void;
  onSelfEnroll: (program: TrainingProgram) => void;
  onNavigateToMyTrainings: () => void;
}

export function CourseCatalogTab({
  programs,
  loading,
  searchQuery,
  categoryFilter,
  isEnrolled,
  enrolling,
  onSearchChange,
  onCategoryFilterChange,
  onViewProgram,
  onSelfEnroll,
  onNavigateToMyTrainings,
}: CourseCatalogTabProps) {
  const availablePrograms = programs.filter(
    (p) => p.status === ProgramStatus.SCHEDULED || p.status === ProgramStatus.IN_PROGRESS
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="card-aura">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                type="text"
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 input-aura"
              />
            </div>
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
          <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
        </div>
      ) : availablePrograms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-[var(--text-muted)]" />
            <p className="mt-4 text-lg font-medium text-[var(--text-primary)]">
              No courses available
            </p>
            <p className="text-[var(--text-secondary)]">
              Check back later for new training programs
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availablePrograms.map((program) => {
            const enrolled = isEnrolled(program.id);
            return (
              <Card key={program.id} className="card-interactive overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-accent-500 to-accent-700 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm opacity-80">{program.programCode}</p>
                        <h3 className="text-xl font-semibold">{program.programName}</h3>
                      </div>
                      {enrolled && (
                        <Badge variant="success" className="bg-white/20 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enrolled
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(program.category)}`}
                      >
                        {program.category.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)]">
                        {program.deliveryMode.replace('_', ' ')}
                      </span>
                      {program.isMandatory && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200">
                          Mandatory
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {program.description || 'No description provided'}
                    </p>

                    <div className="space-y-2 text-sm">
                      {program.durationHours && (
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Clock className="h-4 w-4" />
                          <span>{program.durationHours} hours</span>
                        </div>
                      )}
                      {program.startDate && (
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Calendar className="h-4 w-4" />
                          <span>Starts: {new Date(program.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {program.location && (
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <MapPin className="h-4 w-4" />
                          <span>{program.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--border-main)]">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewProgram(program)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {!enrolled ? (
                        <PermissionGate permission={Permissions.TRAINING_ENROLL}>
                          <Button
                            size="sm"
                            onClick={() => onSelfEnroll(program)}
                            disabled={enrolling}
                            className="flex-1"
                          >
                            {enrolling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Enroll
                              </>
                            )}
                          </Button>
                        </PermissionGate>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onNavigateToMyTrainings}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Go to Course
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
