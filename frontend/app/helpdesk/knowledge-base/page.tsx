'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useKnowledgeBaseArticles, useArticleFeedback, useCreateArticle, useCreateTicketFromKB } from '@/lib/hooks/queries/useKnowledgeBase';
import {
  Search,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Eye,
  Plus,
  MessageSquare,
  ChevronRight,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  category: z.string().min(1, 'Category is required'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(50000, 'Content is too long'),
});

type CreateArticleFormData = z.infer<typeof createArticleSchema>;

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be less than 255 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  views: number;
  helpful: number;
  unhelpful: number;
  updatedAt: string;
  author?: string;
}

interface ArticleCardProps {
  article: Article;
  onView: (article: Article) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onView }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'HR Policies': 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
      'IT Support': 'bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-500',
      'Payroll': 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
      'Leave & Attendance': 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300',
      'Benefits': 'bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-500',
      'Company Policies': 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
    };
    return colors[category] || 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
  };

  const helpfulRate = article.helpful + article.unhelpful > 0
    ? Math.round((article.helpful / (article.helpful + article.unhelpful)) * 100)
    : 0;

  return (
    <Card
      className="p-6 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onView(article)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-4 mb-3">
            <FileText className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-accent-700 dark:group-hover:text-accent-400 transition-colors truncate">
                {article.title}
              </h3>
              <Badge
                variant="outline"
                className={`mt-2 ${getCategoryColor(article.category)} border-0 inline-block`}
              >
                {article.category}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] mt-4">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.views} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {helpfulRate}% helpful ({article.helpful + article.unhelpful})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatDate(article.updatedAt)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0 group-hover:translate-x-1 transition-transform" />
      </div>
    </Card>
  );
};

const ArticleDetailModal: React.FC<{
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitTicket: () => void;
}> = ({ article, isOpen, onClose, onSubmitTicket }) => {
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const feedbackMutation = useArticleFeedback();

  if (!article) return null;

  const handleHelpful = async (helpful: boolean) => {
    try {
      await feedbackMutation.mutateAsync({ articleId: article.id, helpful });
      setIsHelpful(helpful);
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {article.title}
          </h2>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <Badge variant="outline">{article.category}</Badge>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.views} views
            </span>
            {article.author && (
              <span className="text-xs text-[var(--text-muted)]">
                by {article.author}
              </span>
            )}
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Article Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>
          </div>

          <hr className="border-[var(--border-main)]" />

          {/* Feedback Section */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Was this article helpful?
            </h4>

            {submitStatus === 'success' && (
              <div className="p-4 rounded-lg bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 flex gap-2 mb-4 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                Thank you for your feedback!
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant={isHelpful === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleHelpful(true)}
                disabled={feedbackMutation.isPending || isHelpful === true}
                className={isHelpful === true ? 'bg-success-600 hover:bg-success-700' : ''}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Helpful
              </Button>
              <Button
                variant={isHelpful === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleHelpful(false)}
                disabled={feedbackMutation.isPending || isHelpful === false}
                className={isHelpful === false ? 'bg-danger-600 hover:bg-danger-700' : ''}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Not Helpful
              </Button>
            </div>
          </div>

          <hr className="border-[var(--border-main)]" />

          {/* Related Articles Section */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Related Articles
            </h4>
            <p className="text-sm text-[var(--text-muted)]">
              More articles in {article.category} category (feature coming soon)
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={() => {
            onClose();
            onSubmitTicket();
          }}
          variant="primary"
          leftIcon={<MessageSquare className="h-4 w-4" />}
        >
          Submit a Ticket
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const ArticleSkeletonCard: React.FC = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-5 w-5 flex-shrink-0" />
        <Skeleton className="h-6 w-2/3" />
      </div>
      <Skeleton className="h-6 w-24" />
      <div className="flex gap-4 mt-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  </Card>
);

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [createArticleSuccess, setCreateArticleSuccess] = useState(false);
  const [createTicketSuccess, setCreateTicketSuccess] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    'HR Policies',
    'IT Support',
    'Payroll',
    'Leave & Attendance',
    'Benefits',
    'Company Policies',
  ];

  // React Query - automatically refetches when filters change
  const { data: articles = [], isLoading } = useKnowledgeBaseArticles({
    category: selectedCategory || undefined,
    q: searchQuery || undefined,
  });

  // Mutations
  const createArticleMutation = useCreateArticle();
  const createTicketMutation = useCreateTicketFromKB();

  // Create Article form
  const {
    register: registerArticle,
    handleSubmit: handleArticleSubmit,
    reset: resetArticleForm,
    formState: { errors: articleErrors },
  } = useForm<CreateArticleFormData>({
    resolver: zodResolver(createArticleSchema),
    defaultValues: {
      title: '',
      category: 'HR Policies',
      content: '',
    },
  });

  // Create Ticket form
  const {
    register: registerTicket,
    handleSubmit: handleTicketSubmit,
    reset: resetTicketForm,
    formState: { errors: ticketErrors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      priority: 'MEDIUM',
    },
  });

  const onArticleSubmit = async (data: CreateArticleFormData) => {
    await createArticleMutation.mutateAsync({
      title: data.title,
      category: data.category,
      content: data.content,
    });
    setCreateArticleSuccess(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setCreateArticleSuccess(false);
      resetArticleForm();
    }, 1500);
  };

  const onTicketSubmit = async (data: CreateTicketFormData) => {
    await createTicketMutation.mutateAsync({
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      relatedArticleId: selectedArticle?.id,
    });
    setCreateTicketSuccess(true);
    setTimeout(() => {
      setShowTicketModal(false);
      setCreateTicketSuccess(false);
      resetTicketForm();
    }, 1500);
  };

  const handleViewArticle = (article: Article) => {
    setSelectedArticle(article);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedArticle(null);
  };

  const handleSubmitTicket = () => {
    setShowDetail(false);
    setShowTicketModal(true);
  };

  const isAdmin = user?.roles?.some(role =>
    role.code === 'ADMIN' ||
    role.permissions?.some(perm => perm.code === 'hr:manage_knowledge_base')
  ) ?? false;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl  font-bold text-[var(--text-primary)]">
              Knowledge Base
            </h1>
            <p className="text-[var(--text-secondary)] mt-2">
              Find answers to common questions
            </p>
          </div>
          {isAdmin && (
            <PermissionGate permission={Permissions.HELPDESK_KB_CREATE}>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New Article
              </Button>
            </PermissionGate>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--bg-input)] rounded-lg p-6 sticky top-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
                Categories
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    selectedCategory === ''
                      ? 'bg-accent-700 text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  All Articles ({articles.length})
                </button>

                {categories.map((category) => {
                  const count = articles.filter((a) => a.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                        selectedCategory === category
                          ? 'bg-accent-700 text-white'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                      }`}
                    >
                      {category} ({count})
                    </button>
                  );
                })}
              </div>

              {(searchQuery || selectedCategory) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="w-full mt-6 text-sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </div>
            </div>

            {/* Articles List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <ArticleSkeletonCard key={i} />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No articles found
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  Try adjusting your search or category filter
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onView={handleViewArticle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ArticleDetailModal
        article={selectedArticle}
        isOpen={showDetail}
        onClose={handleCloseDetail}
        onSubmitTicket={handleSubmitTicket}
      />

      {/* Create Article Modal (Admin Only) */}
      {isAdmin && (
        <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetArticleForm(); }} size="lg">
          <ModalHeader onClose={() => { setShowCreateModal(false); resetArticleForm(); }}>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                Create New Article
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Add a new article to the knowledge base
              </p>
            </div>
          </ModalHeader>

          {createArticleSuccess ? (
            <ModalBody>
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-success-600 dark:text-success-400" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                  Article Created
                </h3>
                <p className="text-[var(--text-secondary)] mt-2">
                  The article has been published to the knowledge base.
                </p>
              </div>
            </ModalBody>
          ) : (
            <form onSubmit={handleArticleSubmit(onArticleSubmit)}>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Title *
                    </label>
                    <Input
                      type="text"
                      placeholder="Article title"
                      className="w-full"
                      {...registerArticle('title')}
                    />
                    {articleErrors.title && (
                      <p className="text-sm text-danger-500 mt-1">{articleErrors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Category *
                    </label>
                    <select className="input-aura w-full" {...registerArticle('category')}>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {articleErrors.category && (
                      <p className="text-sm text-danger-500 mt-1">{articleErrors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Content *
                    </label>
                    <textarea
                      placeholder="Write the article content here..."
                      rows={8}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                      {...registerArticle('content')}
                    />
                    {articleErrors.content && (
                      <p className="text-sm text-danger-500 mt-1">{articleErrors.content.message}</p>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button variant="outline" onClick={() => { setShowCreateModal(false); resetArticleForm(); }}>
                  Cancel
                </Button>
                <PermissionGate permission={Permissions.HELPDESK_KB_CREATE}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createArticleMutation.isPending}
                  >
                    {createArticleMutation.isPending ? 'Creating...' : 'Create Article'}
                  </Button>
                </PermissionGate>
              </ModalFooter>
            </form>
          )}
        </Modal>
      )}

      {/* Submit Ticket Modal */}
      <Modal isOpen={showTicketModal} onClose={() => { setShowTicketModal(false); resetTicketForm(); }} size="lg">
        <ModalHeader onClose={() => { setShowTicketModal(false); resetTicketForm(); }}>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Submit a Support Ticket
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Couldn&apos;t find the answer? We&apos;re here to help
            </p>
          </div>
        </ModalHeader>

        {createTicketSuccess ? (
          <ModalBody>
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Ticket Submitted
              </h3>
              <p className="text-[var(--text-secondary)] mt-2">
                Your support ticket has been created. You will receive a notification when it is assigned.
              </p>
            </div>
          </ModalBody>
        ) : (
          <form onSubmit={handleTicketSubmit(onTicketSubmit)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Subject *
                  </label>
                  <Input
                    type="text"
                    placeholder="Brief description of your issue"
                    className="w-full"
                    {...registerTicket('subject')}
                  />
                  {ticketErrors.subject && (
                    <p className="text-sm text-danger-500 mt-1">{ticketErrors.subject.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Description *
                  </label>
                  <textarea
                    placeholder="Provide more details about your issue..."
                    rows={6}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                    {...registerTicket('description')}
                  />
                  {ticketErrors.description && (
                    <p className="text-sm text-danger-500 mt-1">{ticketErrors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Priority
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg"
                    {...registerTicket('priority')}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  {ticketErrors.priority && (
                    <p className="text-sm text-danger-500 mt-1">{ticketErrors.priority.message}</p>
                  )}
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="outline" onClick={() => { setShowTicketModal(false); resetTicketForm(); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                leftIcon={<MessageSquare className="h-4 w-4" />}
                disabled={createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </AppLayout>
  );
}
