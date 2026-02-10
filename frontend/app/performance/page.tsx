'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flag,
  ClipboardCheck,
  MessageSquare,
  CalendarDays,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { goalService, reviewCycleService } from '@/lib/services/performance.service';
import { okrService, OkrSummary } from '@/lib/services/okr.service';
import { feedback360Service } from '@/lib/services/feedback360.service';

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  activeReviewCycles: number;
  pendingReviews: number;
  okrObjectives: number;
  okrProgress: number;
  pending360Reviews: number;
}

const performanceModules = [
  {
    id: 'goals',
    title: 'Goals',
    description: 'Set and track individual, team, and organizational goals',
    href: '/performance/goals',
    icon: Flag,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    id: 'okr',
    title: 'OKR Management',
    description: 'Objectives and Key Results for strategic alignment',
    href: '/performance/okr',
    icon: SlidersHorizontal,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    id: 'reviews',
    title: 'Performance Reviews',
    description: 'Conduct and manage employee performance reviews',
    href: '/performance/reviews',
    icon: ClipboardCheck,
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  {
    id: '360-feedback',
    title: '360 Feedback',
    description: 'Multi-rater feedback from peers, managers, and direct reports',
    href: '/performance/360-feedback',
    icon: Users,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    id: 'feedback',
    title: 'Continuous Feedback',
    description: 'Give and receive ongoing feedback throughout the year',
    href: '/performance/feedback',
    icon: MessageSquare,
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
  {
    id: 'cycles',
    title: 'Review Cycles',
    description: 'Manage review periods and deadlines',
    href: '/performance/cycles',
    icon: CalendarDays,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
];

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

export default function PerformancePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    averageProgress: 0,
    activeReviewCycles: 0,
    pendingReviews: 0,
    okrObjectives: 0,
    okrProgress: 0,
    pending360Reviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [goals, cycles, okrSummary, pending360] = await Promise.all([
          goalService.getAllGoals().then(r => r.content || []).catch(() => [] as any[]),
          reviewCycleService.getAllCycles().catch(() => ({ content: [] } as any)),
          okrService.getDashboardSummary().catch(() => null as any),
          feedback360Service.getMyPendingReviews().catch(() => [] as any[]),
        ]);

        const activeGoals = goals.filter((g: any) => g.status === 'ACTIVE' || g.status === 'IN_PROGRESS');
        const completedGoals = goals.filter((g: any) => g.status === 'COMPLETED');
        const avgProgress = goals.length > 0
          ? Math.round(goals.reduce((acc: number, g: any) => acc + (g.progressPercentage || 0), 0) / goals.length)
          : 0;

        const activeCycles = (cycles.content || []).filter((c: any) => c.status === 'ACTIVE');

        setStats({
          totalGoals: goals.length,
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          averageProgress: avgProgress,
          activeReviewCycles: activeCycles.length,
          pendingReviews: 0,
          okrObjectives: okrSummary?.totalObjectives || 0,
          okrProgress: Math.round(okrSummary?.averageProgress || 0),
          pending360Reviews: pending360.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Performance Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track goals, conduct reviews, and manage employee performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Goals"
          value={loading ? '-' : stats.activeGoals}
          subtitle={`${stats.completedGoals} completed`}
          icon={Flag}
          color="bg-blue-500"
        />
        <StatCard
          title="Goal Progress"
          value={loading ? '-' : `${stats.averageProgress}%`}
          subtitle="Average across all goals"
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="OKR Objectives"
          value={loading ? '-' : stats.okrObjectives}
          subtitle={`${stats.okrProgress}% progress`}
          icon={SlidersHorizontal}
          color="bg-purple-500"
        />
        <StatCard
          title="Pending Reviews"
          value={loading ? '-' : stats.pending360Reviews}
          subtitle="360 feedback requests"
          icon={Clock}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      {stats.pending360Reviews > 0 && (
        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-orange-800">
                  You have {stats.pending360Reviews} pending 360 feedback request(s)
                </p>
                <p className="text-sm text-orange-600">
                  Complete your feedback to help your colleagues grow
                </p>
              </div>
            </div>
            <Link
              href="/performance/360-feedback"
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performanceModules.map((module) => (
          <Link
            key={module.id}
            href={module.href}
            className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${module.lightColor}`}>
                  <module.icon className={`h-6 w-6 ${module.textColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                </div>
              </div>
            </div>
            <div className={`h-1 ${module.color} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`} />
          </Link>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Tips</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Set SMART Goals</h3>
            <p className="text-sm text-gray-600 mt-1">
              Make goals Specific, Measurable, Achievable, Relevant, and Time-bound
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Give Regular Feedback</h3>
            <p className="text-sm text-gray-600 mt-1">
              Continuous feedback helps improve performance year-round
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Track Progress</h3>
            <p className="text-sm text-gray-600 mt-1">
              Update your goals and OKRs regularly to stay on track
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
