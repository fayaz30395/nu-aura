'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  ArrowRight,
  Check,
  Clock,
  Code,
  DollarSign,
  FileText,
  Fingerprint,
  Mail,
  MessageSquare,
  Shield,
  Video,
  Workflow,
  Zap,
} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const {hasAnyPermission, isReady} = usePermissions();
  const router = useRouter();

  const hasAccess = hasAnyPermission(Permissions.SYSTEM_ADMIN, Permissions.INTEGRATION_MANAGE);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [isReady, hasAccess, router]);

  if (!isReady || !hasAccess) return null;

  const categories = [
    {id: 'all', name: 'All Integrations'},
    {id: 'productivity', name: 'Productivity'},
    {id: 'attendance', name: 'Attendance'},
    {id: 'finance', name: 'Finance'},
    {id: 'developer', name: 'Developer'},
  ];

  const integrations = [
    {
      name: 'Google Workspace',
      category: 'productivity',
      icon: Mail,
      description: 'Deep integration with Gmail, Drive, Calendar, and Chat',
      features: [
        'SSO authentication',
        'Calendar sync',
        'Drive document storage',
        'Chat notifications',
      ],
      color: 'from-accent-500 to-accent-600',
      popular: true,
    },
    {
      name: 'Microsoft Teams',
      category: 'productivity',
      icon: MessageSquare,
      description: 'Notifications, approvals, and collaboration in Teams',
      features: [
        'Approval workflows',
        'Leave notifications',
        'Employee directory',
        'Bot commands',
      ],
      color: 'from-accent-700 to-accent-800',
      popular: true,
    },
    {
      name: 'Slack',
      category: 'productivity',
      icon: Zap,
      description: 'Real-time alerts and workflow automation via Slack',
      features: [
        'Custom notifications',
        'Slash commands',
        'Approval requests',
        'Status updates',
      ],
      color: 'from-accent-700 to-danger-600',
      popular: true,
    },
    {
      name: 'Zoom',
      category: 'productivity',
      icon: Video,
      description: 'Schedule interviews and meetings directly',
      features: [
        'Interview scheduling',
        'Calendar integration',
        'Auto-join links',
        'Recording storage',
      ],
      color: 'from-accent-400 to-accent-500',
      popular: false,
    },
    {
      name: 'ZKTeco Biometric',
      category: 'attendance',
      icon: Fingerprint,
      description: 'Seamless biometric device integration',
      features: [
        'Real-time sync',
        'Multiple device support',
        'Offline mode',
        'Facial recognition',
      ],
      color: 'from-success-500 to-success-600',
      popular: true,
    },
    {
      name: 'eSSL Biometric',
      category: 'attendance',
      icon: Clock,
      description: 'Connect eSSL attendance machines',
      features: [
        'Auto-sync attendance',
        'Fingerprint & face ID',
        'Multi-location support',
        'Bulk employee upload',
      ],
      color: 'from-success-500 to-success-600',
      popular: false,
    },
    {
      name: 'QuickBooks',
      category: 'finance',
      icon: DollarSign,
      description: 'Sync payroll data with QuickBooks accounting',
      features: [
        'Payroll export',
        'Chart of accounts mapping',
        'Auto-reconciliation',
        'Expense sync',
      ],
      color: 'from-success-500 to-success-600',
      popular: false,
    },
    {
      name: 'Xero',
      category: 'finance',
      icon: FileText,
      description: 'Accounting integration for payroll and expenses',
      features: [
        'Payroll journals',
        'Expense claims',
        'Invoice sync',
        'Tax compliance',
      ],
      color: 'from-accent-500 to-accent-600',
      popular: false,
    },
    {
      name: 'REST API',
      category: 'developer',
      icon: Code,
      description: 'Comprehensive RESTful API for custom integrations',
      features: [
        '300+ endpoints',
        'Webhook support',
        'OAuth 2.0',
        'Swagger documentation',
      ],
      color: 'from-surface-600 to-surface-700',
      popular: true,
    },
    {
      name: 'Webhooks',
      category: 'developer',
      icon: Workflow,
      description: 'Real-time event notifications for automation',
      features: [
        'Custom triggers',
        'Event streaming',
        'Retry mechanism',
        'Secure endpoints',
      ],
      color: 'from-warning-500 to-warning-600',
      popular: false,
    },
  ];

  const filteredIntegrations =
    selectedCategory === 'all'
      ? integrations
      : integrations.filter((i) => i.category === selectedCategory);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      {/* Header */}
      <header
        className="border-b border-[var(--border-main)] sticky top-0 z-50 bg-[var(--bg-elevated)] backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="row-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-[var(--text-primary)]">NU-AURA</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  Pricing
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge size="lg" variant="info" className="mb-6">
            Integrations
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
            Works with the tools you already use
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            Connect NU-AURA with 50+ popular business applications and build custom integrations with our powerful API
          </p>
        </div>
      </section>

      {/* Category Filters */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  selectedCategory === category.id
                    ? 'bg-accent-500 text-white shadow-[var(--shadow-dropdown)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] border border-[var(--border-main)]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Integration Cards — popular ones span 2 cols so the grid has visual rhythm
              instead of being 10 identical tiles. Auto-rows-fr keeps the masonry tidy. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-6">
            {filteredIntegrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: index * 0.05}}
                className={integration.popular ? 'md:col-span-2' : ''}
              >
                <Card hover padding="lg" className="h-full">
                  {integration.popular ? (
                    <div className="flex flex-col sm:flex-row items-start gap-6 h-full">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <integration.icon className="h-7 w-7 text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                            {integration.name}
                          </h2>
                          <Badge variant="success" size="sm">Popular</Badge>
                        </div>
                        <p className="text-body-secondary mb-4 leading-relaxed">
                          {integration.description}
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                          {integration.features.map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-body-secondary"
                            >
                              <Check className="h-4 w-4 text-success-500 flex-shrink-0"/>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center mb-4`}
                      >
                        <integration.icon className="h-6 w-6 text-white"/>
                      </div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        {integration.name}
                      </h2>
                      <p className="text-body-secondary mb-4 leading-relaxed">
                        {integration.description}
                      </p>
                      <ul className="space-y-2">
                        {integration.features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-body-secondary"
                          >
                            <Check className="h-4 w-4 text-success-500 flex-shrink-0"/>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge size="md" variant="primary" className="mb-4">
              Developer Platform
            </Badge>
            <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
              Build custom integrations with our API
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              RESTful API with comprehensive documentation and SDKs
            </p>
          </div>

          {/* API features — list form. Three short factual claims read better as scannable
              rows than as three identical icon-headline-text tiles. */}
          <Card padding="none" className="divide-y divide-[var(--border-subtle)]">
            {[
              {
                icon: Code,
                title: '300+ Endpoints',
                description: 'Comprehensive API coverage for all HR operations',
              },
              {
                icon: Shield,
                title: 'OAuth 2.0',
                description: 'Secure authentication with token-based access',
              },
              {
                icon: Workflow,
                title: 'Webhooks',
                description: 'Real-time event notifications for automation',
              },
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 sm:p-6">
                <feature.icon className="h-6 w-6 text-accent-700 dark:text-accent-400 flex-shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {feature.title}
                  </h3>
                  <p className="text-body-secondary mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </Card>

          <div className="mt-10 text-center">
            <Button variant="outline" size="lg" className="gap-2">
              View API Documentation
              <ArrowRight className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </section>

      {/* Request Integration */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
            Don&apos;t see your tool?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Request an integration or build your own with our API
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Request Integration
              </Button>
            </Link>
            <Button size="lg" className="gap-2">
              View API Docs
              <ArrowRight className="h-5 w-5"/>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
