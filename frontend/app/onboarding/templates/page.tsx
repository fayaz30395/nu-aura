'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {ClipboardList, Edit3, Layout, Plus, Search, Trash2,} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {useOnboardingTemplates} from '@/lib/hooks/queries/useOnboarding';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Skeleton} from '@/components/ui/Skeleton';

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const {data: templates = [], isLoading} = useOnboardingTemplates();

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout
      activeMenuItem="recruitment"
      breadcrumbs={[
        {label: 'Onboarding', href: '/onboarding'},
        {label: 'Templates', href: '/onboarding/templates'}
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-10 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[var(--accent-500)]/10 rounded-xl">
                <Layout className='h-6 w-6 text-accent'/>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] skeuo-emboss">
                Checklist <span className='text-accent'>Templates</span>
              </h1>
            </div>
            <p className="text-[var(--text-muted)] font-bold max-w-md">
              Standardize your onboarding experience with reusable blueprints for different roles and departments.
            </p>
          </div>

          <PermissionGate permission={Permissions.ONBOARDING_MANAGE}>
            <Button
              variant="primary"
              className="btn-primary font-black tracking-widest uppercase text-xs bg-gradient-to-r from-accent-700 to-accent-600 border-0 shadow-[var(--shadow-dropdown)] shadow-accent-500/20 rounded-lg py-6 px-8"
              leftIcon={<Plus className="h-4 w-4"/>}
              onClick={() => router.push('/onboarding/templates/new')}
            >
              Create Template
            </Button>
          </PermissionGate>
        </div>

        {/* Templates Grid */}
        <div className="space-y-6">
          <Card className="border-0 shadow-[var(--shadow-elevated)] bg-[var(--bg-card)] overflow-hidden">
            <div
              className="p-6 border-b border-[var(--border-main)]/50 flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
                <Input
                  placeholder="Search templates..."
                  className="pl-12 rounded-lg bg-[var(--bg-input)] border-0 font-bold focus:ring-2 focus:ring-accent-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6 gap-6">
              {isLoading ? (
                Array.from({length: 6}).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-3xl"/>
                ))
              ) : filteredTemplates.length === 0 ? (
                <div className="col-span-full p-20 text-center">
                  <div
                    className="h-20 w-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <ClipboardList className="h-10 w-10 text-[var(--text-muted)]"/>
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-primary)]">No templates found</h3>
                  <p className="text-[var(--text-muted)] font-bold mt-2">Create your first onboarding blueprint to get
                    started.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredTemplates.map((template, idx) => (
                    <motion.div
                      key={template.id}
                      initial={{opacity: 0, scale: 0.9}}
                      animate={{opacity: 1, scale: 1}}
                      transition={{delay: idx * 0.05}}
                      className="group"
                    >
                      <Card
                        className="h-full border border-[var(--border-main)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-dropdown)] transition-all cursor-pointer rounded-3xl group overflow-hidden"
                        onClick={() => router.push(`/onboarding/templates/${template.id}`)}
                      >
                        <CardContent className="p-6 h-full flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-4 bg-[var(--accent-500)]/10 rounded-lg">
                              <ClipboardList className='h-6 w-6 text-accent'/>
                            </div>
                            <Badge variant="outline"
                                   className="rounded-xl px-4 py-1 font-black text-xs uppercase tracking-widest border-[var(--accent-500)]/20 text-accent">
                              Blueprint
                            </Badge>
                          </div>

                          <h3
                            className='text-xl font-black text-[var(--text-primary)] mb-2 group-hover:text-accent transition-colors'>
                            {template.name}
                          </h3>
                          <p className="text-body-muted font-bold mb-6 flex-grow line-clamp-2">
                            {template.description || 'No description provided for this template.'}
                          </p>

                          <div className="row-between mt-auto pt-6 border-t border-white/20">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                  <div key={i}
                                       className="h-6 w-6 rounded-full bg-[var(--bg-secondary)] border-2 border-white/50"/>
                                ))}
                              </div>
                              <span
                                className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Reusable</span>
                            </div>
                            <div className="flex gap-2">
                              <PermissionGate permission={Permissions.ONBOARDING_MANAGE}>
                                <Button size="sm" variant="outline"
                                        className="h-8 w-8 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                  <Edit3 className="h-3.5 w-3.5"/>
                                </Button>
                              </PermissionGate>
                              <PermissionGate permission={Permissions.ONBOARDING_MANAGE}>
                                <Button size="sm" variant="outline"
                                        className="h-8 w-8 p-0 rounded-xl text-status-danger-text border-[var(--danger-500)]/20 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 className="h-3.5 w-3.5"/>
                                </Button>
                              </PermissionGate>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
