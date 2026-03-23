'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, AlertCircle, CheckCircle, Loader2, Plus } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { AppLayout } from '@/components/layout/AppLayout';
import { SkillGapAnalysis } from '@/components/training/SkillGapAnalysis';
import { Button, EmptyState, ConfirmDialog } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import type { TrainingProgram, TrainingEnrollmentRequest, TrainingProgramRequest } from '@/lib/types/training';
import {
  TrainingCategory,
  DeliveryMode,
  ProgramStatus,
  EnrollmentStatus,
} from '@/lib/types/training';
import {
  useAllPrograms,
  useEnrollmentsByEmployee,
  useEnrollmentsByProgram,
  useCreateTrainingProgram,
  useUpdateTrainingProgram,
  useDeleteTrainingProgram,
  useEnrollInTraining as useEnrollEmployee,
  useUpdateEnrollmentStatus,
} from '@/lib/hooks/queries/useTraining';
import {
  TrainingStatsCards,
  TrainingTabs,
  MyTrainingsTab,
  CourseCatalogTab,
  ManageProgramsTab,
  ProgramFormModal,
  ViewProgramModal,
  EnrollEmployeeModal,
  trainingProgramSchema,
} from './_components';
import type { TabType, TrainingProgramFormData } from './_components';

export default function TrainingPage() {
  const { user, hasHydrated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('my-trainings');

  // React Query hooks
  const { data: programsResponse, isLoading: programsLoading } = useAllPrograms();
  const { data: enrollmentsResponse, isLoading: enrollmentsLoading } = useEnrollmentsByEmployee(
    user?.id || ''
  );
  const createProgramMutation = useCreateTrainingProgram();
  const updateProgramMutation = useUpdateTrainingProgram();
  const deleteProgramMutation = useDeleteTrainingProgram();
  const enrollMutation = useEnrollEmployee();
  useUpdateEnrollmentStatus();

  const programs = programsResponse?.content || [];
  const myEnrollments = enrollmentsResponse || [];
  const loading = programsLoading || enrollmentsLoading;

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Notification state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    },
    []
  );

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [enrolling] = useState(false);
  const [deleteProgramId, setDeleteProgramId] = useState<string | null>(null);

  // Fetch enrollments for the selected program via React Query
  const { data: enrollments = [] } = useEnrollmentsByProgram(selectedProgramId);

  // Form state with React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TrainingProgramFormData>({
    resolver: zodResolver(trainingProgramSchema),
    defaultValues: {
      programCode: '',
      programName: '',
      description: '',
      category: TrainingCategory.TECHNICAL,
      deliveryMode: DeliveryMode.IN_PERSON,
      durationHours: 0,
      startDate: '',
      endDate: '',
      trainerName: '',
      trainerEmail: '',
      location: '',
      maxParticipants: 0,
      costPerParticipant: 0,
      prerequisites: '',
      learningObjectives: '',
      isMandatory: false,
      status: ProgramStatus.DRAFT,
    },
  });

  // Enrollment form state
  const [enrollFormData, setEnrollFormData] = useState<Partial<TrainingEnrollmentRequest>>({
    programId: '',
    employeeId: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  const handleCreateProgram = () => {
    setEditingProgram(null);
    reset({
      programCode: '',
      programName: '',
      description: '',
      category: TrainingCategory.TECHNICAL,
      deliveryMode: DeliveryMode.IN_PERSON,
      durationHours: 0,
      startDate: '',
      endDate: '',
      trainerName: '',
      trainerEmail: '',
      location: '',
      maxParticipants: 0,
      costPerParticipant: 0,
      prerequisites: '',
      learningObjectives: '',
      isMandatory: false,
      status: ProgramStatus.DRAFT,
    });
    setIsModalOpen(true);
  };

  const handleEditProgram = (program: TrainingProgram) => {
    setEditingProgram(program);
    reset({
      programCode: program.programCode,
      programName: program.programName,
      description: program.description,
      category: program.category,
      deliveryMode: program.deliveryMode,
      durationHours: program.durationHours,
      startDate: program.startDate,
      endDate: program.endDate,
      trainerName: program.trainerName,
      trainerEmail: program.trainerEmail,
      location: program.location,
      maxParticipants: program.maxParticipants,
      costPerParticipant: program.costPerParticipant,
      prerequisites: program.prerequisites,
      learningObjectives: program.learningObjectives,
      isMandatory: program.isMandatory,
      status: program.status,
    });
    setIsModalOpen(true);
  };

  const handleViewProgram = (program: TrainingProgram) => {
    setSelectedProgram(program);
    setSelectedProgramId(program.id); // triggers useEnrollmentsByProgram
    setIsViewModalOpen(true);
  };

  const handleEnrollEmployee = (program: TrainingProgram) => {
    setSelectedProgram(program);
    setEnrollFormData({
      programId: program.id,
      employeeId: '',
      enrollmentDate: new Date().toISOString().split('T')[0],
    });
    setIsEnrollModalOpen(true);
  };

  const handleSelfEnroll = (program: TrainingProgram) => {
    if (!user?.employeeId) {
      showNotification('You must be logged in to enroll', 'error');
      return;
    }

    const alreadyEnrolled = myEnrollments.some((e) => e.programId === program.id);
    if (alreadyEnrolled) {
      showNotification('You are already enrolled in this program', 'error');
      return;
    }

    enrollMutation.mutate(
      {
        programId: program.id,
        employeeId: user.employeeId,
        enrollmentDate: new Date().toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          showNotification(`Successfully enrolled in ${program.programName}!`, 'success');
          setActiveTab('my-trainings');
        },
      }
    );
  };

  const onSubmitProgram = (data: TrainingProgramFormData) => {
    const requestData = data as TrainingProgramRequest;
    if (editingProgram) {
      updateProgramMutation.mutate(
        { programId: editingProgram.id, data: requestData },
        {
          onSuccess: () => {
            showNotification('Program updated successfully', 'success');
            setIsModalOpen(false);
          },
        }
      );
    } else {
      createProgramMutation.mutate(requestData, {
        onSuccess: () => {
          showNotification('Program created successfully', 'success');
          setIsModalOpen(false);
        },
      });
    }
  };

  const handleSubmitEnrollment = () => {
    enrollMutation.mutate(enrollFormData as TrainingEnrollmentRequest, {
      onSuccess: () => {
        setIsEnrollModalOpen(false);
        showNotification('Employee enrolled successfully', 'success');
      },
    });
  };

  const handleDeleteProgram = (programId: string) => {
    setDeleteProgramId(programId);
  };

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.programCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.trainerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || program.status === statusFilter;
    const matchesCategory = !categoryFilter || program.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: programs.length,
    scheduled: programs.filter((p) => p.status === ProgramStatus.SCHEDULED).length,
    inProgress: programs.filter((p) => p.status === ProgramStatus.IN_PROGRESS).length,
    completed: programs.filter((p) => p.status === ProgramStatus.COMPLETED).length,
    myEnrolled: myEnrollments.length,
    myInProgress: myEnrollments.filter((e) => e.status === EnrollmentStatus.IN_PROGRESS).length,
    myCompleted: myEnrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length,
  };

  const isEnrolled = (programId: string) => myEnrollments.some((e) => e.programId === programId);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Training Programs' },
  ];

  if (!hasHydrated) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="training">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="training">
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title="No Employee Profile Linked"
          description="Training enrollment requires an employee profile. Use the admin panels to manage employee training."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="training">
      <div className="space-y-6">
        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Training Programs</h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              Enroll in courses and track your learning progress
            </p>
          </div>
          {activeTab === 'manage' && (
            <PermissionGate permission={Permissions.TRAINING_CREATE}>
              <Button onClick={handleCreateProgram}>
                <Plus className="mr-2 h-4 w-4" />
                Create Program
              </Button>
            </PermissionGate>
          )}
        </div>

        {/* Stats Cards */}
        <TrainingStatsCards stats={stats} />

        {/* Tab Navigation */}
        <TrainingTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab: My Trainings */}
        {activeTab === 'my-trainings' && (
          <MyTrainingsTab
            enrollments={myEnrollments}
            loading={loading}
            onNavigateToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {/* Tab: Course Catalog */}
        {activeTab === 'catalog' && (
          <CourseCatalogTab
            programs={filteredPrograms}
            loading={loading}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            isEnrolled={isEnrolled}
            enrolling={enrolling}
            onSearchChange={setSearchQuery}
            onCategoryFilterChange={setCategoryFilter}
            onViewProgram={handleViewProgram}
            onSelfEnroll={handleSelfEnroll}
            onNavigateToMyTrainings={() => setActiveTab('my-trainings')}
          />
        )}

        {/* Tab: Manage Programs */}
        {activeTab === 'manage' && (
          <ManageProgramsTab
            programs={filteredPrograms}
            loading={loading}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onCategoryFilterChange={setCategoryFilter}
            onCreateProgram={handleCreateProgram}
            onViewProgram={handleViewProgram}
            onEditProgram={handleEditProgram}
            onEnrollEmployee={handleEnrollEmployee}
            onDeleteProgram={handleDeleteProgram}
          />
        )}

        {/* Tab: Growth Roadmap */}
        {activeTab === 'growth-roadmap' && user?.employeeId && (
          <SkillGapAnalysis employeeId={user.employeeId} />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteProgramId !== null}
          onClose={() => setDeleteProgramId(null)}
          onConfirm={async () => {
            if (deleteProgramId) {
              deleteProgramMutation.mutate(deleteProgramId);
              setDeleteProgramId(null);
            }
          }}
          title="Delete Training Program"
          message="Are you sure you want to delete this training program? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleteProgramMutation.isPending}
        />

        {/* Create/Edit Program Modal */}
        <ProgramFormModal
          isOpen={isModalOpen}
          editingProgram={editingProgram}
          register={register}
          errors={errors}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit(onSubmitProgram)}
        />

        {/* View Program Modal */}
        <ViewProgramModal
          isOpen={isViewModalOpen}
          program={selectedProgram}
          enrollments={enrollments}
          isEnrolled={isEnrolled}
          enrolling={enrolling}
          onClose={() => setIsViewModalOpen(false)}
          onSelfEnroll={handleSelfEnroll}
        />

        {/* Enroll Employee Modal */}
        <EnrollEmployeeModal
          isOpen={isEnrollModalOpen}
          programName={selectedProgram?.programName || ''}
          enrollFormData={enrollFormData}
          onClose={() => setIsEnrollModalOpen(false)}
          onEnrollFormChange={setEnrollFormData}
          onSubmit={handleSubmitEnrollment}
        />
      </div>
    </AppLayout>
  );
}
