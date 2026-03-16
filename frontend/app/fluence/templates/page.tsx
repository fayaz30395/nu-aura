'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Download,
  Copy,
  Copy as Copy2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useFluenceTemplates } from '@/lib/hooks/queries/useFluence';

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templatesData, isLoading } = useFluenceTemplates(0, 20);

  const templates = templatesData?.content || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              Templates
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Reusable document templates for your team
            </p>
          </div>
          <Button
            onClick={() => router.push('/fluence/templates/new')}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48" />
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
              <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
                No templates yet
              </h3>
              <p className="text-[var(--text-muted)] mb-4">
                Create your first template to get started
              </p>
              <Button
                onClick={() => router.push('/fluence/templates/new')}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        {template.icon ? (
                          <span className="text-xl">{template.icon}</span>
                        ) : (
                          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                        <Zap className="w-3 h-3" />
                        {template.usageCount} uses
                      </span>
                    </div>
                    <CardTitle className="text-base line-clamp-2">
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    {template.description && (
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 2 && (
                          <span className="text-xs text-[var(--text-muted)]">
                            +{template.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <div className="p-4 border-t border-[var(--border-main)] flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 gap-2 h-9"
                      onClick={() =>
                        router.push(`/fluence/templates/${template.id}?use=true`)
                      }
                    >
                      <Copy2 className="w-4 h-4" />
                      Use
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 gap-2 h-9"
                      onClick={() =>
                        router.push(`/fluence/templates/${template.id}`)
                      }
                    >
                      <Download className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
