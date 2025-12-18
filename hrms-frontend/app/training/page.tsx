'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  MapPin,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Textarea,
} from '@/components/ui';
import { trainingService } from '@/lib/services/training.service';
import type {
  TrainingProgram,
  TrainingProgramRequest,
  TrainingEnrollment,
  TrainingEnrollmentRequest,
} from '@/lib/types/training';
import {
  TrainingCategory,
  DeliveryMode,
  ProgramStatus,
  EnrollmentStatus,
} from '@/lib/types/training';

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

const deliveryModeOptions = [
  { value: DeliveryMode.IN_PERSON, label: 'In-Person' },
  { value: DeliveryMode.VIRTUAL, label: 'Virtual' },
  { value: DeliveryMode.HYBRID, label: 'Hybrid' },
  { value: DeliveryMode.SELF_PACED, label: 'Self-Paced' },
  { value: DeliveryMode.WORKSHOP, label: 'Workshop' },
];

const statusOptions = [
  { value: ProgramStatus.DRAFT, label: 'Draft' },
  { value: ProgramStatus.SCHEDULED, label: 'Scheduled' },
  { value: ProgramStatus.IN_PROGRESS, label: 'In Progress' },
  { value: ProgramStatus.COMPLETED, label: 'Completed' },
  { value: ProgramStatus.CANCELLED, label: 'Cancelled' },
];

const getStatusColor = (status: ProgramStatus) => {
  switch (status) {
    case ProgramStatus.DRAFT:
      return 'default';
    case ProgramStatus.SCHEDULED:
      return 'info';
    case ProgramStatus.IN_PROGRESS:
      return 'warning';
    case ProgramStatus.COMPLETED:
      return 'success';
    case ProgramStatus.CANCELLED:
      return 'danger';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: ProgramStatus) => {
  switch (status) {
    case ProgramStatus.DRAFT:
      return <FileText className="h-4 w-4" />;
    case ProgramStatus.SCHEDULED:
      return <Calendar className="h-4 w-4" />;
    case ProgramStatus.IN_PROGRESS:
      return <PlayCircle className="h-4 w-4" />;
    case ProgramStatus.COMPLETED:
      return <CheckCircle className="h-4 w-4" />;
    case ProgramStatus.CANCELLED:
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: TrainingCategory) => {
  switch (category) {
    case TrainingCategory.TECHNICAL:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case TrainingCategory.SOFT_SKILLS:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case TrainingCategory.LEADERSHIP:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case TrainingCategory.COMPLIANCE:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case TrainingCategory.SAFETY:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export default function TrainingPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);

  // Form state
  const [formData, setFormData] = useState<Partial<TrainingProgramRequest>>({
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

  // Enrollment form state
  const [enrollFormData, setEnrollFormData] = useState<Partial<TrainingEnrollmentRequest>>({
    programId: '',
    employeeId: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await trainingService.getAllPrograms();
      setPrograms(response.content || []);
    } catch (error) {
      console.error('Error fetching training programs:', error);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = () => {
    setEditingProgram(null);
    setFormData({
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
    setFormData({
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

  const handleViewProgram = async (program: TrainingProgram) => {
    setSelectedProgram(program);
    try {
      const enrollmentList = await trainingService.getEnrollmentsByProgram(program.id);
      setEnrollments(enrollmentList);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setEnrollments([]);
    }
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

  const handleSubmitProgram = async () => {
    try {
      if (editingProgram) {
        await trainingService.updateProgram(editingProgram.id, formData as TrainingProgramRequest);
      } else {
        await trainingService.createProgram(formData as TrainingProgramRequest);
      }
      setIsModalOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error('Error saving training program:', error);
    }
  };

  const handleSubmitEnrollment = async () => {
    try {
      await trainingService.enrollEmployee(enrollFormData as TrainingEnrollmentRequest);
      setIsEnrollModalOpen(false);
      if (selectedProgram) {
        const enrollmentList = await trainingService.getEnrollmentsByProgram(selectedProgram.id);
        setEnrollments(enrollmentList);
      }
    } catch (error) {
      console.error('Error enrolling employee:', error);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (confirm('Are you sure you want to delete this training program?')) {
      try {
        await trainingService.deleteProgram(programId);
        fetchPrograms();
      } catch (error) {
        console.error('Error deleting training program:', error);
      }
    }
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

  // Stats
  const stats = {
    total: programs.length,
    scheduled: programs.filter((p) => p.status === ProgramStatus.SCHEDULED).length,
    inProgress: programs.filter((p) => p.status === ProgramStatus.IN_PROGRESS).length,
    completed: programs.filter((p) => p.status === ProgramStatus.COMPLETED).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Training Programs' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="training">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Training Programs
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Manage employee training and development programs
            </p>
          </div>
          <Button onClick={handleCreateProgram}>
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Programs</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Scheduled</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <PlayCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">In Progress</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Completed</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <Input
                  type="text"
                  placeholder="Search programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-48"
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
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-48"
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-surface-400" />
              <p className="mt-4 text-lg font-medium text-surface-900 dark:text-white">
                No training programs found
              </p>
              <p className="text-surface-600 dark:text-surface-400">
                Create your first training program to get started
              </p>
              <Button onClick={handleCreateProgram} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrograms.map((program) => (
              <Card key={program.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm opacity-80">{program.programCode}</p>
                        <h3 className="text-lg font-semibold">{program.programName}</h3>
                      </div>
                      <Badge variant={getStatusColor(program.status) as any} className="flex items-center gap-1">
                        {getStatusIcon(program.status)}
                        {program.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(program.category)}`}>
                        {program.category.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {program.deliveryMode.replace('_', ' ')}
                      </span>
                      {program.isMandatory && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Mandatory
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
                      {program.description || 'No description provided'}
                    </p>

                    <div className="space-y-2 text-sm">
                      {program.trainerName && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <Users className="h-4 w-4" />
                          <span>Trainer: {program.trainerName}</span>
                        </div>
                      )}
                      {program.durationHours && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <Clock className="h-4 w-4" />
                          <span>{program.durationHours} hours</span>
                        </div>
                      )}
                      {program.startDate && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(program.startDate).toLocaleDateString()}
                            {program.endDate && ` - ${new Date(program.endDate).toLocaleDateString()}`}
                          </span>
                        </div>
                      )}
                      {program.location && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <MapPin className="h-4 w-4" />
                          <span>{program.location}</span>
                        </div>
                      )}
                      {program.maxParticipants && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <Users className="h-4 w-4" />
                          <span>Max {program.maxParticipants} participants</span>
                        </div>
                      )}
                      {program.costPerParticipant && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <DollarSign className="h-4 w-4" />
                          <span>${program.costPerParticipant} per participant</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                      <Button size="sm" variant="outline" onClick={() => handleViewProgram(program)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEnrollEmployee(program)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditProgram(program)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteProgram(program.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Program Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {editingProgram ? 'Edit Training Program' : 'Create Training Program'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Program Code *
                </label>
                <Input
                  value={formData.programCode}
                  onChange={(e) => setFormData({ ...formData, programCode: e.target.value })}
                  placeholder="e.g., TRN-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Program Name *
                </label>
                <Input
                  value={formData.programName}
                  onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                  placeholder="Enter program name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter program description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Category *
                </label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TrainingCategory })}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Delivery Mode *
                </label>
                <Select
                  value={formData.deliveryMode}
                  onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value as DeliveryMode })}
                >
                  {deliveryModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProgramStatus })}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Duration (Hours)
                </label>
                <Input
                  type="number"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({ ...formData, durationHours: parseInt(e.target.value) || 0 })}
                  placeholder="Enter duration"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Trainer Name
                </label>
                <Input
                  value={formData.trainerName}
                  onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                  placeholder="Enter trainer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Trainer Email
                </label>
                <Input
                  type="email"
                  value={formData.trainerEmail}
                  onChange={(e) => setFormData({ ...formData, trainerEmail: e.target.value })}
                  placeholder="Enter trainer email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Location
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Max Participants
                </label>
                <Input
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                  placeholder="Enter max participants"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Cost per Participant ($)
                </label>
                <Input
                  type="number"
                  value={formData.costPerParticipant}
                  onChange={(e) => setFormData({ ...formData, costPerParticipant: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter cost"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Prerequisites
                </label>
                <Textarea
                  value={formData.prerequisites}
                  onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                  placeholder="Enter prerequisites"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Learning Objectives
                </label>
                <Textarea
                  value={formData.learningObjectives}
                  onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
                  placeholder="Enter learning objectives"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Mandatory Training
                  </span>
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitProgram}>
              {editingProgram ? 'Update Program' : 'Create Program'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* View Program Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {selectedProgram?.programName}
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedProgram && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-surface-500">Program Code:</span>
                    <p className="font-medium text-surface-900 dark:text-white">{selectedProgram.programCode}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Status:</span>
                    <p>
                      <Badge variant={getStatusColor(selectedProgram.status) as any}>
                        {selectedProgram.status.replace('_', ' ')}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Category:</span>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedProgram.category.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Delivery Mode:</span>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedProgram.deliveryMode.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {selectedProgram.description && (
                  <div>
                    <h4 className="font-medium text-surface-900 dark:text-white mb-2">Description</h4>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      {selectedProgram.description}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-surface-900 dark:text-white mb-2">
                    Enrollments ({enrollments.length})
                  </h4>
                  {enrollments.length === 0 ? (
                    <p className="text-sm text-surface-500">No enrollments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {enrollments.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-surface-900 dark:text-white">
                              {enrollment.employeeName || enrollment.employeeId}
                            </p>
                            <p className="text-xs text-surface-500">
                              Enrolled: {new Date(enrollment.enrollmentDate || '').toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              enrollment.status === EnrollmentStatus.COMPLETED
                                ? 'success'
                                : enrollment.status === EnrollmentStatus.IN_PROGRESS
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {enrollment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => selectedProgram && handleEnrollEmployee(selectedProgram)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Enroll Employee
            </Button>
          </ModalFooter>
        </Modal>

        {/* Enroll Employee Modal */}
        <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Enroll Employee
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Program
                </label>
                <Input value={selectedProgram?.programName || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Employee ID *
                </label>
                <Input
                  value={enrollFormData.employeeId}
                  onChange={(e) => setEnrollFormData({ ...enrollFormData, employeeId: e.target.value })}
                  placeholder="Enter employee ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Enrollment Date
                </label>
                <Input
                  type="date"
                  value={enrollFormData.enrollmentDate}
                  onChange={(e) => setEnrollFormData({ ...enrollFormData, enrollmentDate: e.target.value })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEnrollment}>
              Enroll
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
