'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {Copy, Download, FileText, Plus, Search, Zap,} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {card as dsCard, iconSize, input as dsInput, layout, motion as dsMotion, typography,} from '@/lib/theme/design-system';
import {useFluenceTemplates} from '@/lib/hooks/queries/useFluence';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

interface Template {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tags?: string[];
  usageCount: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const {data: templatesData, isLoading, isError} = useFluenceTemplates(0, 20);

  const templates: Template[] = useMemo(
    () => templatesData?.content || [],
    [templatesData?.content]
  );

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [templates, searchQuery]);

  const handleCreateTemplate = () => {
    router.push('/fluence/templates/new');
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/fluence/templates/${templateId}?use=true`);
  };

  const handleViewTemplate = (templateId: string) => {
    router.push(`/fluence/templates/${templateId}`);
  };

  return (
    <AppLayout>
      <motion.div
        className={layout.sectionGap}
        {...dsMotion.pageEnter}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className={`${typography.pageTitle} flex items-center gap-4`}>
              <div
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-800)] flex items-center justify-center flex-shrink-0">
                <FileText className={`${iconSize.pageHeader} text-white`}/>
              </div>
              Templates
            </h1>
            <p className={`${typography.bodySecondary} mt-2`}>
              Reusable document templates for your team
            </p>
          </div>
          <PermissionGate permission={Permissions.KNOWLEDGE_TEMPLATE_CREATE}>
            <Button
              onClick={handleCreateTemplate}
              className="gap-2 bg-[var(--accent-700)] hover:bg-[var(--accent-800)] text-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow duration-150 flex-shrink-0"
            >
              <Plus className={iconSize.button}/>
              Create Template
            </Button>
          </PermissionGate>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${iconSize.cardInline} text-[var(--text-muted)]`}/>
          <input
            type="text"
            placeholder="Search templates by name or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${dsInput.base} w-full pl-12 pr-4 py-4`}
          />
        </div>

        {/* Templates Grid */}
        {isLoading && !isError ? (
          <div className={layout.grid3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className={`${dsCard.base} card-aura animate-pulse`}
              >
                <CardContent className="h-56 bg-[var(--bg-secondary)]"/>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<FileText className={iconSize.statCard}/>}
            title="Unable to load templates"
            description="There was an error fetching templates. Please try again later."
          />
        ) : templates.length === 0 ? (
          <PermissionGate
            permission={Permissions.KNOWLEDGE_TEMPLATE_CREATE}
            fallback={
              <EmptyState
                icon={<FileText className={iconSize.statCard}/>}
                title="No templates yet"
                description="Templates will appear here once they have been created."
              />
            }
          >
            <EmptyState
              icon={<FileText className={iconSize.statCard}/>}
              title="No templates yet"
              description="Create your first template to get started"
              actionLabel="Create Template"
              onAction={handleCreateTemplate}
            />
          </PermissionGate>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<Search className={iconSize.statCard}/>}
            title="No templates match"
            description="Try adjusting your search query"
          />
        ) : (
          <motion.div
            className={layout.grid3}
            {...dsMotion.staggerContainer}
          >
            {filteredTemplates.map((template) => (
              <motion.div
                key={template.id}
                variants={dsMotion.staggerItem.variants}
              >
                <Card className={`${dsCard.interactive} h-full flex flex-col group`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div
                        className="w-10 h-10 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-950)]/30 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--accent-200)] dark:group-hover:bg-[var(--accent-900)]/40 transition-colors duration-150">
                        {template.icon ? (
                          <span className="text-xl">{template.icon}</span>
                        ) : (
                          <FileText
                            className={`${iconSize.cardInline} text-[var(--accent-800)] dark:text-[var(--accent-300)]`}/>
                        )}
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-950)]/30 text-[var(--accent-800)] dark:text-[var(--accent-300)] text-xs font-semibold whitespace-nowrap">
                        <Zap className={iconSize.meta}/>
                        {template.usageCount} uses
                      </span>
                    </div>
                    <CardTitle className={`${typography.cardTitle} line-clamp-2`}>
                      {template.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {template.description && (
                      <p className={`${typography.bodySecondary} line-clamp-3`}>
                        {template.description}
                      </p>
                    )}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`text-xs px-2 py-1 rounded-md font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors duration-150`}
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className={`text-caption px-2 py-1`}>
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>

                  <div className="p-4 border-t border-[var(--border-main)] flex gap-2">
                    <PermissionGate permission={Permissions.KNOWLEDGE_TEMPLATE_CREATE}>
                      <Button
                        variant="secondary"
                        className="flex-1 gap-2 h-9 text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                        onClick={() => handleUseTemplate(template.id)}
                      >
                        <Copy className={iconSize.button}/>
                        Use
                      </Button>
                    </PermissionGate>
                    <Button
                      variant="secondary"
                      className="flex-1 gap-2 h-9 text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                      onClick={() => handleViewTemplate(template.id)}
                    >
                      <Download className={iconSize.button}/>
                      View
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}
