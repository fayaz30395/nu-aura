'use client';

import React, {useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {motion} from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckSquare,
  CircleDot,
  GripVertical,
  Hash,
  Plus,
  Send,
  Star,
  ToggleLeft,
  Trash2,
  Type,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
} from '@/components/ui';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useLaunchSurvey, useSurveyDetail} from '@/lib/hooks/queries/useSurveys';
import {useAddQuestion, useDeleteQuestion, useSurveyQuestions,} from '@/lib/hooks/queries/useSurveyQuestions';
import {QuestionType, SurveyStatus} from '@/lib/types/grow/survey';
import {toBadgeVariant} from '@/lib/utils/type-guards';
import {iconSize, motion as dsMotion, typography,} from '@/lib/design-system';

// ─── Question type metadata ────────────────────────────────────────────────
const questionTypeOptions = [
  {value: QuestionType.TEXT, label: 'Text', icon: Type},
  {value: QuestionType.SINGLE_CHOICE, label: 'Single Choice', icon: CircleDot},
  {value: QuestionType.MULTIPLE_CHOICE, label: 'Multiple Choice', icon: CheckSquare},
  {value: QuestionType.SCALE, label: 'Likert Scale (1-5)', icon: BarChart3},
  {value: QuestionType.NPS, label: 'NPS (0-10)', icon: Hash},
  {value: QuestionType.RATING, label: 'Rating (1-5)', icon: Star},
];

const getQuestionTypeIcon = (type: QuestionType) => {
  const match = questionTypeOptions.find((o) => o.value === type);
  return match?.icon ?? Type;
};

const needsOptions = (type: QuestionType): boolean =>
  type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE;

// ─── Add-question form schema ──────────────────────────────────────────────
const addQuestionSchema = z
  .object({
    questionText: z.string().min(1, 'Question text is required'),
    questionType: z.nativeEnum(QuestionType),
    isRequired: z.boolean().default(true),
    options: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (needsOptions(data.questionType)) {
        const opts = data.options
          ?.split(',')
          .map((o) => o.trim())
          .filter(Boolean);
        return opts && opts.length >= 2;
      }
      return true;
    },
    {message: 'Provide at least 2 comma-separated options', path: ['options']}
  );

type AddQuestionFormData = z.infer<typeof addQuestionSchema>;

// ─── Component ─────────────────────────────────────────────────────────────
export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const {data: survey, isLoading: surveyLoading} = useSurveyDetail(surveyId);
  const {data: questions, isLoading: questionsLoading} = useSurveyQuestions(surveyId);
  const addMutation = useAddQuestion(surveyId);
  const deleteMutation = useDeleteQuestion(surveyId);
  const launchMutation = useLaunchSurvey();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: {errors},
  } = useForm<AddQuestionFormData>({
    resolver: zodResolver(addQuestionSchema),
    defaultValues: {
      questionText: '',
      questionType: QuestionType.TEXT,
      isRequired: true,
      options: '',
    },
  });

  const watchedType = watch('questionType');

  const handleOpenAddModal = () => {
    reset({
      questionText: '',
      questionType: QuestionType.TEXT,
      isRequired: true,
      options: '',
    });
    setIsAddModalOpen(true);
  };

  const onSubmitQuestion = (formData: AddQuestionFormData) => {
    const optionsArray = needsOptions(formData.questionType)
      ? formData.options
        ?.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
      : undefined;

    addMutation.mutate(
      {
        questionText: formData.questionText,
        questionType: formData.questionType,
        isRequired: formData.isRequired,
        orderIndex: (questions?.length ?? 0) + 1,
        options: optionsArray,
      },
      {
        onSuccess: () => setIsAddModalOpen(false),
      }
    );
  };

  const handlePublish = () => {
    launchMutation.mutate(surveyId);
  };

  const isLoading = surveyLoading || questionsLoading;
  const isDraft = survey?.status === SurveyStatus.DRAFT;

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Surveys', href: '/surveys'},
    {label: survey?.title ?? 'Survey Detail'},
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="surveys">
      <motion.div className="space-y-6" {...dsMotion.pageEnter}>
        {/* Back + Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/surveys')}>
              <ArrowLeft className={iconSize.button}/>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={typography.pageTitle}>
                  {surveyLoading ? <span className="skeleton-aura inline-block h-6 w-48 rounded" /> : survey?.title}
                </h1>
                {survey && (
                  <Badge variant={toBadgeVariant(survey.status)}>{survey.status}</Badge>
                )}
              </div>
              {survey && (
                <p className={typography.bodySecondary}>
                  {survey.surveyCode}
                  {survey.startDate &&
                    ` | ${new Date(survey.startDate).toLocaleDateString()}`}
                  {survey.endDate &&
                    ` - ${new Date(survey.endDate).toLocaleDateString()}`}
                </p>
              )}
            </div>
          </div>

          <PermissionGate permission={Permissions.SURVEY_MANAGE}>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/surveys/${surveyId}/analytics`)}
              >
                <BarChart3 className={`${iconSize.button} mr-2`}/>
                Analytics
              </Button>
              {isDraft && (
                <Button onClick={handlePublish} disabled={launchMutation.isPending}>
                  <Send className={`${iconSize.button} mr-2`}/>
                  Publish
                </Button>
              )}
            </div>
          </PermissionGate>
        </div>

        {/* Survey info cards */}
        {survey && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                    <Users className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                  </div>
                  <div>
                    <p className={typography.bodySecondary}>Target</p>
                    <p className={typography.cardTitle}>
                      {survey.targetAudience ?? 'All Employees'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                    <Hash className="h-6 w-6 text-success-600 dark:text-success-400"/>
                  </div>
                  <div>
                    <p className={typography.bodySecondary}>Responses</p>
                    <p className={typography.statLarge}>{survey.totalResponses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                    <Calendar className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                  </div>
                  <div>
                    <p className={typography.bodySecondary}>Status</p>
                    <p className={typography.cardTitle}>{survey.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-warning-100 p-4 dark:bg-warning-900">
                    <ToggleLeft className="h-6 w-6 text-warning-600 dark:text-warning-400"/>
                  </div>
                  <div>
                    <p className={typography.bodySecondary}>Anonymous</p>
                    <p className={typography.cardTitle}>
                      {survey.isAnonymous ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Questions section */}
        <Card className="card-aura">
          <CardContent className="p-6">
            <div className="row-between mb-6">
              <h2 className={typography.sectionTitle}>
                Questions ({questions?.length ?? 0})
              </h2>
              <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                {isDraft && (
                  <Button size="sm" onClick={handleOpenAddModal}>
                    <Plus className={`${iconSize.button} mr-2`}/>
                    Add Question
                  </Button>
                )}
              </PermissionGate>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg bg-[var(--bg-surface)]"
                  />
                ))}
              </div>
            ) : !questions || questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Type className="h-12 w-12 text-[var(--text-muted)]"/>
                <p className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  No questions yet
                </p>
                <p className={typography.bodySecondary}>
                  Add questions to build your survey
                </p>
              </div>
            ) : (
              <motion.div className="space-y-2" {...dsMotion.staggerContainer}>
                {questions
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((question, index) => {
                    const Icon = getQuestionTypeIcon(question.questionType);
                    return (
                      <motion.div
                        key={question.id}
                        variants={dsMotion.staggerItem.variants}
                        className="flex items-center gap-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 transition-colors hover:bg-[var(--bg-card-hover)]"
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700 dark:bg-accent-900 dark:text-accent-300">
                          {index + 1}
                        </span>
                        <GripVertical className="h-4 w-4 text-[var(--text-muted)]"/>
                        <Icon className={`${iconSize.cardInline} text-[var(--text-secondary)]`}/>
                        <div className="flex-1 min-w-0">
                          <p className={typography.body}>{question.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge-status status-info text-xs">
                              {question.questionType ? question.questionType.replace('_', ' ') : '-'}
                            </span>
                            {question.isRequired && (
                              <span className="badge-status status-warning text-xs">
                                Required
                              </span>
                            )}
                            {question.options && question.options.length > 0 && (
                              <span className={typography.caption}>
                                {question.options.length} options
                              </span>
                            )}
                          </div>
                        </div>
                        <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                          {isDraft && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                              onClick={() => setDeleteConfirmId(question.id)}
                            >
                              <Trash2 className={iconSize.button}/>
                            </Button>
                          )}
                        </PermissionGate>
                      </motion.div>
                    );
                  })}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmId !== null}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={async () => {
            if (deleteConfirmId) {
              deleteMutation.mutate(deleteConfirmId);
              setDeleteConfirmId(null);
            }
          }}
          title="Delete Question"
          message="Are you sure you want to delete this question? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleteMutation.isPending}
        />

        {/* Add Question Modal */}
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Add Question
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit(onSubmitQuestion)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Question Text *
                  </label>
                  <Textarea
                    {...register('questionText')}
                    placeholder="Enter your question..."
                    rows={3}
                  />
                  {errors.questionText && (
                    <p className="mt-1 text-sm text-danger-600">
                      {errors.questionText.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Question Type *
                  </label>
                  <Select {...register('questionType')} className="input-aura">
                    {questionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {errors.questionType && (
                    <p className="mt-1 text-sm text-danger-600">
                      {errors.questionType.message}
                    </p>
                  )}
                </div>

                {needsOptions(watchedType) && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Options (comma-separated) *
                    </label>
                    <Input
                      {...register('options')}
                      placeholder="Option A, Option B, Option C"
                      className="input-aura"
                    />
                    {errors.options && (
                      <p className="mt-1 text-sm text-danger-600">
                        {errors.options.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Controller
                    name="isRequired"
                    control={control}
                    render={({field}) => (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                        />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">
                          Required question
                        </span>
                      </label>
                    )}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Adding...' : 'Add Question'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </motion.div>
    </AppLayout>
  );
}
