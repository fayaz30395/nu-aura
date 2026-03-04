/**
 * SAMPLE: CEO Dashboard Refactored to Match nu-aura Patterns
 *
 * This demonstrates how the new CEO Dashboard would look when properly
 * integrated with existing codebase standards.
 *
 * Key Changes:
 * 1. Uses existing Card, Button, Skeleton components
 * 2. Tailwind CSS instead of inline styles
 * 3. AppLayout wrapper for navigation
 * 4. Authentication guards
 * 5. Service layer for data fetching
 * 6. TypeScript types from centralized location
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Existing Component Imports ──
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/hooks/useAuth';

// ── New Service Layer ──
import { ceoDashboardService } from '@/lib/services/ceo-dashboard.service';
import {
  CEODashboardData,
  OperationalMetrics,
  RegionalData
} from '@/lib/types/ceo-dashboard';

// ── New Custom Components (in same file for now, can extract later) ──
import { AnimatedNumber } from '@/components/ceo-dashboard/AnimatedNumber';
import { Sparkline } from '@/components/ceo-dashboard/Sparkline';
import { MetricTile } from '@/components/ceo-dashboard/MetricTile';
import { StatusDot } from '@/components/ceo-dashboard/StatusDot';

// ── Chart Colors (from Tailwind config) ──
const CHART_COLORS = [
  'rgb(59 130 246)',    // blue-500
  'rgb(16 185 129)',    // green-500
  'rgb(245 158 11)',    // amber-500
  'rgb(239 68 68)',     // red-500
  'rgb(139 92 246)',    // purple-500
  'rgb(6 182 212)',     // cyan-500
];

// ── Custom Tooltip (using Tailwind) ──
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface-900/95 backdrop-blur-sm border border-surface-700 rounded-lg px-3 py-2 shadow-lg">
      <div className="text-xs text-surface-400 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function CEODashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'delivery' | 'regions'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CEODashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ── Authentication Guard ──
  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Role-based access control
    if (!user?.roles?.includes('CEO') && !user?.roles?.includes('EXECUTIVE')) {
      router.push('/unauthorized');
      return;
    }

    loadDashboard();
  }, [hasHydrated, isAuthenticated, router, user]);

  // ── Data Fetching ──
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await ceoDashboardService.getOperationalMetrics();
      setData(dashboardData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading CEO dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <AppLayout activeMenuItem="ceo-dashboard">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error State ──
  if (error || !data) {
    return (
      <AppLayout activeMenuItem="ceo-dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <CardTitle>Error Loading Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-surface-600 dark:text-surface-400 mb-4">
                {error || 'Unable to load dashboard data'}
              </p>
              <Button variant="primary" onClick={loadDashboard} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // ── Main Render ──
  return (
    <AppLayout activeMenuItem="ceo-dashboard">
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="border-b border-surface-200 dark:border-surface-800 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusDot color="rgb(16 185 129)" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                  All Systems Operational
                </span>
              </div>
              <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
                Operations Command Center
              </h1>
              <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                Global IT MNC · FY2026 Q3 · Live Dashboard
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-surface-900 dark:text-white">
                  ${data.metrics.totalRevenue.toFixed(3)}B
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                  ↑ {data.metrics.revenueGrowth}% above target
                </div>
                <div className="text-xs text-surface-500">
                  YTD Revenue · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboard}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: '◉' },
              { id: 'delivery', label: 'Delivery & DORA', icon: '⚡' },
              { id: 'regions', label: 'Regions', icon: '◎' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-surface-600 dark:text-surface-400 border-transparent hover:text-surface-900 dark:hover:text-surface-200'
                  }
                `}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="pb-6">
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'delivery' && <DeliveryTab data={data} />}
          {activeTab === 'regions' && <RegionsTab data={data} />}
        </div>
      </div>
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════
function OverviewTab({ data }: { data: CEODashboardData }) {
  return (
    <div className="space-y-6">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                  Revenue (YTD)
                </p>
                <p className="text-3xl font-bold font-mono text-surface-900 dark:text-white mt-2">
                  <AnimatedNumber value={data.metrics.totalRevenue} prefix="$" suffix="B" decimals={3} />
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    +{data.metrics.revenueGrowth}%
                  </span>
                  <span className="text-xs text-surface-400">vs target</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            {/* Sparkline */}
            <div className="mt-3">
              <Sparkline
                data={data.revenueData.map(d => d.actual)}
                color="rgb(16 185 129)"
                height={32}
                width={200}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                  Operating Margin
                </p>
                <p className="text-3xl font-bold font-mono text-surface-900 dark:text-white mt-2">
                  <AnimatedNumber value={data.metrics.operatingMargin} suffix="%" decimals={1} />
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-600">+2.1%</span>
                  <span className="text-xs text-surface-400">from Q2</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add more KPI cards... */}
      </div>

      {/* ── Revenue Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-blue-600">◆</span>
              Revenue Trajectory ($M)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-surface-200 dark:stroke-surface-700"
                />
                <XAxis
                  dataKey="month"
                  className="text-xs text-surface-600 dark:text-surface-400"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  className="text-xs text-surface-600 dark:text-surface-400"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="rgb(59 130 246)"
                  fill="url(#revGrad)"
                  strokeWidth={2.5}
                  name="Actual Revenue"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="rgb(148 163 184)"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                  name="Target"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Portfolio Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Project Portfolio Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.projectPortfolio}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="count"
                  nameKey="status"
                  paddingAngle={3}
                >
                  {data.projectPortfolio.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {data.projectPortfolio.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <StatusDot color={item.color} />
                  <span className="text-surface-600 dark:text-surface-400">{item.status}</span>
                  <span className="font-mono font-semibold ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DELIVERY TAB (Stub - similar pattern)
// ══════════════════════════════════════════════════════
function DeliveryTab({ data }: { data: CEODashboardData }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-12 text-surface-500">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Delivery & DORA metrics coming soon...</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// REGIONS TAB (Stub - similar pattern)
// ══════════════════════════════════════════════════════
function RegionsTab({ data }: { data: CEODashboardData }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-12 text-surface-500">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Regional performance metrics coming soon...</p>
      </div>
    </div>
  );
}

/**
 * KEY DIFFERENCES FROM ORIGINAL:
 *
 * 1. Uses AppLayout wrapper for navigation
 * 2. Authentication guards with role-based access
 * 3. Uses existing Card, Button, Skeleton components
 * 4. Tailwind CSS classes instead of inline styles
 * 5. Service layer integration (ceoDashboardService)
 * 6. TypeScript types from centralized location
 * 7. Error handling patterns match existing code
 * 8. Loading states consistent with other dashboards
 * 9. Responsive design with Tailwind breakpoints
 * 10. Dark mode support through Tailwind classes
 *
 * STILL NEEDED:
 * - Create /lib/services/ceo-dashboard.service.ts
 * - Create /lib/types/ceo-dashboard.ts
 * - Extract AnimatedNumber, Sparkline to /components/ceo-dashboard/
 * - Implement all tabs (Delivery, Regions, Infra, Risk, Talent)
 * - Add backend API endpoints
 * - Write tests
 * - Optimize fonts with next/font
 * - Add accessibility features
 */
