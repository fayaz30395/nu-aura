'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Users,
  Calendar,
  BarChart3,
  FileText,
  Send,
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
import { surveyService } from '@/lib/services/survey.service';
import type { Survey, SurveyRequest } from '@/lib/types/survey';
import { SurveyType, SurveyStatus } from '@/lib/types/survey';
import { toBadgeVariant } from '@/lib/utils/type-guards';

const surveyTypeOptions = [
  { value: SurveyType.ENGAGEMENT, label: 'Engagement' },
  { value: SurveyType.SATISFACTION, label: 'Satisfaction' },
  { value: SurveyType.PULSE, label: 'Pulse' },
  { value: SurveyType.EXIT, label: 'Exit' },
  { value: SurveyType.FEEDBACK, label: 'Feedback' },
  { value: SurveyType.CUSTOM, label: 'Custom' },
];

const statusOptions = [
  { value: SurveyStatus.DRAFT, label: 'Draft' },
  { value: SurveyStatus.ACTIVE, label: 'Active' },
  { value: SurveyStatus.PAUSED, label: 'Paused' },
  { value: SurveyStatus.COMPLETED, label: 'Completed' },
  { value: SurveyStatus.ARCHIVED, label: 'Archived' },
];

const getStatusColor = (status: SurveyStatus) => {
  switch (status) {
    case SurveyStatus.DRAFT:
      return 'default';
    case SurveyStatus.ACTIVE:
      return 'success';
    case SurveyStatus.PAUSED:
      return 'warning';
    case SurveyStatus.COMPLETED:
      return 'info';
    case SurveyStatus.ARCHIVED:
      return 'danger';
    default:
      return 'default';
  }
};

const getTypeColor = (type: SurveyType) => {
  switch (type) {
    case SurveyType.ENGAGEMENT:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case SurveyType.SATISFACTION:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case SurveyType.PULSE:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case SurveyType.EXIT:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case SurveyType.FEEDBACK:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SurveyRequest>>({
    surveyCode: '',
    title: '',
    description: '',
    surveyType: SurveyType.ENGAGEMENT,
    isAnonymous: false,
    startDate: '',
    endDate: '',
    status: SurveyStatus.DRAFT,
    targetAudience: 'ALL',
  });

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const response = await surveyService.getAllSurveys();
      setSurveys(response.content || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setFormData({
      surveyCode: '',
      title: '',
      description: '',
      surveyType: SurveyType.ENGAGEMENT,
      isAnonymous: false,
      startDate: '',
      endDate: '',
      status: SurveyStatus.DRAFT,
      targetAudience: 'ALL',
    });
    setIsModalOpen(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setFormData({
      surveyCode: survey.surveyCode,
      title: survey.title,
      description: survey.description,
      surveyType: survey.surveyType,
      isAnonymous: survey.isAnonymous,
      startDate: survey.startDate?.split('T')[0] || '',
      endDate: survey.endDate?.split('T')[0] || '',
      status: survey.status,
      targetAudience: survey.targetAudience,
    });
    setIsModalOpen(true);
  };

  const handleViewSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsViewModalOpen(true);
  };

  const handleSubmitSurvey = async () => {
    try {
      const submitData = {
        ...formData,
        startDate: formData.startDate ? `${formData.startDate}T00:00:00` : undefined,
        endDate: formData.endDate ? `${formData.endDate}T23:59:59` : undefined,
      };

      if (editingSurvey) {
        await surveyService.updateSurvey(editingSurvey.id, submitData as SurveyRequest);
      } else {
        await surveyService.createSurvey(submitData as SurveyRequest);
      }
      setIsModalOpen(false);
      fetchSurveys();
    } catch (error) {
      console.error('Error saving survey:', error);
    }
  };

  const handleLaunchSurvey = async (surveyId: string) => {
    try {
      await surveyService.launchSurvey(surveyId);
      fetchSurveys();
    } catch (error) {
      console.error('Error launching survey:', error);
    }
  };

  const handlePauseSurvey = async (surveyId: string) => {
    try {
      await surveyService.updateStatus(surveyId, SurveyStatus.PAUSED);
      fetchSurveys();
    } catch (error) {
      console.error('Error pausing survey:', error);
    }
  };

  const handleCompleteSurvey = async (surveyId: string) => {
    try {
      await surveyService.completeSurvey(surveyId);
      fetchSurveys();
    } catch (error) {
      console.error('Error completing survey:', error);
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (confirm('Are you sure you want to delete this survey?')) {
      try {
        await surveyService.deleteSurvey(surveyId);
        fetchSurveys();
      } catch (error) {
        console.error('Error deleting survey:', error);
      }
    }
  };

  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch =
      survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.surveyCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || survey.status === statusFilter;
    const matchesType = !typeFilter || survey.surveyType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: surveys.length,
    active: surveys.filter((s) => s.status === SurveyStatus.ACTIVE).length,
    draft: surveys.filter((s) => s.status === SurveyStatus.DRAFT).length,
    completed: surveys.filter((s) => s.status === SurveyStatus.COMPLETED).length,
    totalResponses: surveys.reduce((sum, s) => sum + (s.totalResponses || 0), 0),
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Surveys' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="surveys">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Employee Surveys
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Create and manage employee surveys and feedback collection
            </p>
          </div>
          <Button onClick={handleCreateSurvey}>
            <Plus className="mr-2 h-4 w-4" />
            Create Survey
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Surveys</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Active</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                  <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Drafts</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Completed</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Responses</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.totalResponses}</p>
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
                  placeholder="Search surveys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="">All Status</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="">All Types</option>
                {surveyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Surveys Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-surface-400" />
              <p className="mt-4 text-lg font-medium text-surface-900 dark:text-white">
                No surveys found
              </p>
              <p className="text-surface-600 dark:text-surface-400">
                Create your first survey to collect employee feedback
              </p>
              <Button onClick={handleCreateSurvey} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Survey
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSurveys.map((survey) => (
              <Card key={survey.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm opacity-80">{survey.surveyCode}</p>
                        <h3 className="text-lg font-semibold">{survey.title}</h3>
                      </div>
                      <Badge variant={toBadgeVariant(survey.status)}>
                        {survey.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(survey.surveyType)}`}>
                        {survey.surveyType}
                      </span>
                      {survey.isAnonymous && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          Anonymous
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
                      {survey.description || 'No description provided'}
                    </p>

                    <div className="space-y-2 text-sm">
                      {survey.startDate && (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(survey.startDate).toLocaleDateString()}
                            {survey.endDate && ` - ${new Date(survey.endDate).toLocaleDateString()}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                        <Users className="h-4 w-4" />
                        <span>{survey.totalResponses || 0} responses</span>
                      </div>
                      <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                        <BarChart3 className="h-4 w-4" />
                        <span>Target: {survey.targetAudience || 'All Employees'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                      <Button size="sm" variant="outline" onClick={() => handleViewSurvey(survey)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {survey.status === SurveyStatus.DRAFT && (
                        <Button size="sm" variant="outline" onClick={() => handleLaunchSurvey(survey.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {survey.status === SurveyStatus.ACTIVE && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handlePauseSurvey(survey.id)}>
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleCompleteSurvey(survey.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {survey.status === SurveyStatus.PAUSED && (
                        <Button size="sm" variant="outline" onClick={() => handleLaunchSurvey(survey.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEditSurvey(survey)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteSurvey(survey.id)}
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

        {/* Create/Edit Survey Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {editingSurvey ? 'Edit Survey' : 'Create Survey'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Survey Code *
                </label>
                <Input
                  value={formData.surveyCode}
                  onChange={(e) => setFormData({ ...formData, surveyCode: e.target.value })}
                  placeholder="e.g., SRV-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Survey Type *
                </label>
                <Select
                  value={formData.surveyType}
                  onChange={(e) => setFormData({ ...formData, surveyType: e.target.value as SurveyType })}
                >
                  {surveyTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter survey title"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter survey description"
                  rows={3}
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
                  Target Audience
                </label>
                <Select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                >
                  <option value="ALL">All Employees</option>
                  <option value="DEPARTMENT">By Department</option>
                  <option value="MANAGER">Managers Only</option>
                  <option value="NEW_HIRE">New Hires</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as SurveyStatus })}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Anonymous Survey (responses will not be linked to employees)
                  </span>
                </label>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitSurvey}>
              {editingSurvey ? 'Update Survey' : 'Create Survey'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* View Survey Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {selectedSurvey?.title}
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedSurvey && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-surface-500">Survey Code:</span>
                    <p className="font-medium text-surface-900 dark:text-white">{selectedSurvey.surveyCode}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Status:</span>
                    <p>
                      <Badge variant={toBadgeVariant(selectedSurvey.status)}>
                        {selectedSurvey.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Type:</span>
                    <p className="font-medium text-surface-900 dark:text-white">{selectedSurvey.surveyType}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Anonymous:</span>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedSurvey.isAnonymous ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Start Date:</span>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedSurvey.startDate
                        ? new Date(selectedSurvey.startDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">End Date:</span>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedSurvey.endDate
                        ? new Date(selectedSurvey.endDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-surface-500">Total Responses:</span>
                    <p className="font-medium text-surface-900 dark:text-white">{selectedSurvey.totalResponses || 0}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Target Audience:</span>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedSurvey.targetAudience || 'All Employees'}
                    </p>
                  </div>
                </div>

                {selectedSurvey.description && (
                  <div>
                    <h4 className="font-medium text-surface-900 dark:text-white mb-2">Description</h4>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      {selectedSurvey.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            {selectedSurvey?.status === SurveyStatus.DRAFT && (
              <Button onClick={() => {
                handleLaunchSurvey(selectedSurvey.id);
                setIsViewModalOpen(false);
              }}>
                <Send className="mr-2 h-4 w-4" />
                Launch Survey
              </Button>
            )}
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
