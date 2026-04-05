'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Heart,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState('core');

  const modules = [
    {
      id: 'core',
      name: 'Core HR',
      icon: Users,
      color: 'from-accent-500 to-accent-600',
      features: [
        {
          title: 'Employee Directory',
          icon: Users,
          description:
            'Centralized employee database with advanced search, filters, and custom fields',
          benefits: [
            'Quick employee lookup',
            'Org chart visualization',
            'Department management',
            'Custom field builder',
          ],
        },
        {
          title: 'Document Management',
          icon: FileText,
          description: 'Secure document storage, e-signatures, and automated workflows',
          benefits: [
            'Digital document vault',
            'E-signature integration',
            'Template library',
            'Version control',
          ],
        },
        {
          title: 'Org Chart',
          icon: BarChart3,
          description: 'Interactive organization hierarchy with reporting structures',
          benefits: [
            'Visual hierarchy',
            'Drag-and-drop editing',
            'Multiple views',
            'Export capabilities',
          ],
        },
      ],
    },
    {
      id: 'attendance',
      name: 'Attendance & Time',
      icon: Clock,
      color: 'from-success-500 to-success-600',
      features: [
        {
          title: 'Smart Check-in/out',
          icon: Clock,
          description: 'Mobile and web clock-in with geofencing and facial recognition',
          benefits: [
            'Biometric integration',
            'GPS geofencing',
            'Offline mode',
            'Real-time tracking',
          ],
        },
        {
          title: 'Shift Management',
          icon: Calendar,
          description: 'Flexible shift scheduling with automated roster generation',
          benefits: [
            'Shift templates',
            'Auto-rotation',
            'Conflict detection',
            'Overtime calculation',
          ],
        },
        {
          title: 'Attendance Regularization',
          icon: Settings,
          description: 'Employee-initiated regularization with approval workflows',
          benefits: [
            'Self-service requests',
            'Manager approvals',
            'Audit trail',
            'Policy enforcement',
          ],
        },
      ],
    },
    {
      id: 'leave',
      name: 'Leave Management',
      icon: Calendar,
      color: 'from-accent-700 to-accent-800',
      features: [
        {
          title: 'Leave Policies',
          icon: FileText,
          description: 'Configurable leave types with accrual rules and carry-forward',
          benefits: [
            'Multiple leave types',
            'Custom accrual rules',
            'Carry-forward logic',
            'Encashment support',
          ],
        },
        {
          title: 'Leave Calendar',
          icon: Calendar,
          description: 'Team leave visibility with holiday management',
          benefits: [
            'Team calendar view',
            'Holiday configuration',
            'Conflict alerts',
            'Public holidays',
          ],
        },
        {
          title: 'Approval Workflows',
          icon: CheckCircle2,
          description: 'Multi-level approvals with delegation and notifications',
          benefits: [
            'Multi-tier approvals',
            'Delegation support',
            'Auto-notifications',
            'Mobile approvals',
          ],
        },
      ],
    },
    {
      id: 'payroll',
      name: 'Payroll & Compensation',
      icon: DollarSign,
      color: 'from-warning-500 to-warning-500',
      features: [
        {
          title: 'Salary Processing',
          icon: DollarSign,
          description: 'Automated payroll calculations with statutory compliance',
          benefits: [
            'Auto-calculations',
            'Tax deductions',
            'Statutory compliance',
            'Payslip generation',
          ],
        },
        {
          title: 'Compensation Management',
          icon: TrendingUp,
          description: 'Salary structures, revisions, and increment management',
          benefits: [
            'Salary structures',
            'Annual increments',
            'Bonus processing',
            'Arrears calculation',
          ],
        },
        {
          title: 'Statutory Compliance',
          icon: Shield,
          description: 'Automated PF, ESI, PT, and tax calculations',
          benefits: [
            'PF & ESI auto-calc',
            'PT compliance',
            'Form 16 generation',
            'Challan reports',
          ],
        },
      ],
    },
    {
      id: 'performance',
      name: 'Performance & Goals',
      icon: TrendingUp,
      color: 'from-accent-700 to-danger-600',
      features: [
        {
          title: 'OKRs & Goals',
          icon: Target,
          description: 'Objective and key results tracking with cascading goals',
          benefits: [
            'Cascading OKRs',
            'Progress tracking',
            'Check-ins',
            'Alignment views',
          ],
        },
        {
          title: '360° Feedback',
          icon: MessageSquare,
          description: 'Multi-rater feedback with anonymous responses',
          benefits: [
            'Multi-source feedback',
            'Anonymous options',
            'Custom questionnaires',
            'Report generation',
          ],
        },
        {
          title: 'Performance Reviews',
          icon: BarChart3,
          description: 'Structured review cycles with 9-box calibration',
          benefits: [
            'Review templates',
            '9-box matrix',
            'Calibration sessions',
            'Performance analytics',
          ],
        },
      ],
    },
    {
      id: 'recruitment',
      name: 'Recruitment & ATS',
      icon: UserPlus,
      color: 'from-accent-500 to-accent-500',
      features: [
        {
          title: 'Job Management',
          icon: Briefcase,
          description: 'Post jobs to multiple boards and manage requisitions',
          benefits: [
            'Multi-board posting',
            'Requisition workflow',
            'Job templates',
            'Careers page',
          ],
        },
        {
          title: 'Candidate Pipeline',
          icon: Users,
          description: 'Visual Kanban board for candidate tracking',
          benefits: [
            'Kanban board',
            'Stage automation',
            'Resume parsing',
            'Communication hub',
          ],
        },
        {
          title: 'Interview Scheduling',
          icon: Calendar,
          description: 'Calendar integration with automated interview scheduling',
          benefits: [
            'Calendar sync',
            'Interview kits',
            'Feedback forms',
            'Scorecard system',
          ],
        },
      ],
    },
    {
      id: 'learning',
      name: 'Learning & Development',
      icon: BookOpen,
      color: 'from-accent-500 to-accent-800',
      features: [
        {
          title: 'Course Catalog',
          icon: BookOpen,
          description: 'Create and manage training courses with multimedia content',
          benefits: [
            'Course builder',
            'Video support',
            'Quizzes & assessments',
            'Certifications',
          ],
        },
        {
          title: 'Learning Paths',
          icon: TrendingUp,
          description: 'Structured learning journeys with skill tracking',
          benefits: [
            'Custom paths',
            'Skill mapping',
            'Progress tracking',
            'Recommendations',
          ],
        },
        {
          title: 'Skill Matrix',
          icon: BarChart3,
          description: 'Competency framework with gap analysis',
          benefits: [
            'Skill assessment',
            'Gap analysis',
            'Competency mapping',
            'Development plans',
          ],
        },
      ],
    },
    {
      id: 'benefits',
      name: 'Benefits & Wellness',
      icon: Heart,
      color: 'from-danger-500 to-accent-800',
      features: [
        {
          title: 'Benefits Administration',
          icon: Package,
          description: 'Manage insurance, medical, and benefit plans',
          benefits: [
            'Plan management',
            'Enrollment tracking',
            'Claims processing',
            'Dependent management',
          ],
        },
        {
          title: 'Wellness Programs',
          icon: Heart,
          description: 'Track wellness initiatives and employee engagement',
          benefits: [
            'Program tracking',
            'Fitness challenges',
            'Health metrics',
            'Wellness surveys',
          ],
        },
        {
          title: 'Rewards & Recognition',
          icon: Award,
          description: 'Peer recognition and rewards management',
          benefits: [
            'Peer recognition',
            'Badge system',
            'Points & rewards',
            'Leaderboards',
          ],
        },
      ],
    },
  ];

  const integrations = [
    {name: 'Google Workspace', icon: Globe},
    {name: 'Microsoft Teams', icon: MessageSquare},
    {name: 'Slack', icon: Zap},
    {name: 'Zoom', icon: Users},
  ];

  const selectedModule = modules.find((m) => m.id === activeTab);

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
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
          <Badge size="lg" variant="primary" className="mb-6">
            Platform Features
          </Badge>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] skeuo-emboss mb-4">
            Everything you need to manage your workforce
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">
            From hiring to retirement, NU-AURA streamlines every HR process with
            intelligent automation and powerful analytics
          </p>
        </div>
      </section>

      {/* Module Tabs */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveTab(module.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === module.id
                    ? 'bg-accent-500 text-white shadow-[var(--shadow-dropdown)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] border border-[var(--border-main)]'
                }`}
              >
                <module.icon className="h-4 w-4"/>
                {module.name}
              </button>
            ))}
          </div>

          {/* Selected Module Features */}
          {selectedModule && (
            <motion.div
              key={selectedModule.id}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.3}}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {selectedModule.features.map((feature, index) => (
                  <Card key={index} hover padding="lg">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedModule.color} flex items-center justify-center mb-4`}
                    >
                      <feature.icon className="h-6 w-6 text-white"/>
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-body-secondary mb-4 leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-body-secondary">
                          <Check className="h-4 w-4 text-success-500 flex-shrink-0"/>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto text-center">
          <Badge size="md" variant="info" className="mb-4">
            Integrations
          </Badge>
          <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
            Works with the tools you already use
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Seamless integrations with 50+ popular business applications
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {integrations.map((integration, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-4 group cursor-pointer"
              >
                <div
                  className="w-16 h-16 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center group-hover:border-accent-500 group-hover:shadow-card-hover transition-all">
                  <integration.icon
                    className="h-8 w-8 text-[var(--text-secondary)] group-hover:text-accent-500 transition-colors"/>
                </div>
                <span className="text-sm font-medium text-[var(--text-muted)]">
                  {integration.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link href="/integrations">
              <Button variant="outline" size="lg" className="gap-2">
                View All Integrations
                <ArrowRight className="h-4 w-4"/>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl  font-bold text-[var(--text-primary)] mb-4">
            Ready to streamline your HR operations?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Start your free 14-day trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" className="btn-primary gap-2">
                Start Free Trial
                <ArrowRight className="h-5 w-5"/>
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
