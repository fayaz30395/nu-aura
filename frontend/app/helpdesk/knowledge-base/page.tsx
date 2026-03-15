'use client';

import React, { useState } from 'react';
import { useKnowledgeBaseArticles, useArticleFeedback, type Article as KBArticle } from '@/lib/hooks/queries/useKnowledgeBase';
import {
  Search,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Eye,
  AlertCircle,
  Loader2,
  Plus,
  MessageSquare,
  ChevronRight,
  FileText,
  CheckCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

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
      'HR Policies': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'IT Support': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      'Payroll': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'Leave & Attendance': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      'Benefits': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
      'Company Policies': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    };
    return colors[category] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
  };

  const helpfulRate = article.helpful + article.unhelpful > 0
    ? Math.round((article.helpful / (article.helpful + article.unhelpful)) * 100)
    : 0;

  return (
    <Card
      className="p-5 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onView(article)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            <FileText className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
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

          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mt-4">
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

        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
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
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {article.title}
          </h2>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge variant="outline">{article.category}</Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.views} views
            </span>
            {article.author && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
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
            <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Feedback Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
              Was this article helpful?
            </h4>

            {submitStatus === 'success' && (
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex gap-2 mb-4 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                Thank you for your feedback!
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant={isHelpful === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleHelpful(true)}
                disabled={feedbackMutation.isPending || isHelpful === true}
                className={isHelpful === true ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Helpful
              </Button>
              <Button
                variant={isHelpful === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleHelpful(false)}
                disabled={feedbackMutation.isPending || isHelpful === false}
                className={isHelpful === false ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Not Helpful
              </Button>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Related Articles Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">
              Related Articles
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Submit a Ticket
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const ArticleSkeletonCard: React.FC = () => (
  <Card className="p-5">
    <div className="space-y-4">
      <div className="flex gap-3">
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
  const feedbackMutation = useArticleFeedback();

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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Knowledge Base
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Find answers to common questions
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-6">
                Categories
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    selectedCategory === ''
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        selectedCategory === category
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  No articles found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
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
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
          <ModalHeader onClose={() => setShowCreateModal(false)}>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Create New Article
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Add a new article to the knowledge base
              </p>
            </div>
          </ModalHeader>

          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                  Title
                </label>
                <Input
                  type="text"
                  placeholder="Article title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                  Category
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                  Content
                </label>
                <textarea
                  placeholder="Write the article content here..."
                  rows={8}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowCreateModal(false)}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Create Article
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Submit Ticket Modal */}
      <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} size="lg">
        <ModalHeader onClose={() => setShowTicketModal(false)}>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Submit a Support Ticket
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Couldn&apos;t find the answer? We&apos;re here to help
            </p>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                Subject
              </label>
              <Input
                type="text"
                placeholder="Brief description of your issue"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                Description
              </label>
              <textarea
                placeholder="Provide more details about your issue..."
                rows={6}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                Priority
              </label>
              <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowTicketModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowTicketModal(false);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Submit Ticket
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}
