'use client';

import {useEffect, useMemo} from 'react';
import {motion} from 'framer-motion';
import {useRouter} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {BookOpen, Eye, FileText, Heart, MessageCircle, TrendingUp,} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {useActivityFeed, useBlogPosts, useFluenceTemplates, useWikiPages,} from '@/lib/hooks/queries/useFluence';
import {card, chartColors, iconSize, layout, motion as dsMotion, typography,} from '@/lib/design-system';

/**
 * NU-Fluence Analytics Dashboard
 * Track content performance metrics and activity across the platform.
 */
export default function FluenceAnalyticsPage() {
  const router = useRouter();
  const {hasPermission, isReady} = usePermissions();

  const hasAccess = hasPermission(Permissions.KNOWLEDGE_VIEW);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  // Fetch data
  const {data: wikiData, isLoading: wikiLoading} = useWikiPages(undefined, 0, 100);
  const {data: blogData, isLoading: blogLoading} = useBlogPosts(0, 100);
  const {data: templatesData, isLoading: templatesLoading} = useFluenceTemplates(0, 100);
  const {data: activityData, isLoading: activityLoading} = useActivityFeed(0, 100);

  // ── All useMemo hooks must be before any conditional return ──────────────────

  const isLoading = wikiLoading || blogLoading || templatesLoading || activityLoading;

  // Aggregate metrics
  const metrics = useMemo(() => {
    const wikiPages = wikiData?.content || [];
    const blogPosts = blogData?.content || [];
    const _templates = templatesData?.content || [];

    const totalViews =
      wikiPages.reduce((sum, p) => sum + (p.viewCount || 0), 0) +
      blogPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

    const totalLikes =
      wikiPages.reduce((sum, p) => sum + (p.likeCount || 0), 0) +
      blogPosts.reduce((sum, p) => sum + (p.likeCount || 0), 0);

    const totalComments =
      wikiPages.reduce((sum, p) => sum + (p.commentCount || 0), 0) +
      blogPosts.reduce((sum, p) => sum + (p.commentCount || 0), 0);

    const publishedWiki = wikiPages.filter((p) => p.status === 'PUBLISHED').length;
    const publishedBlogs = blogPosts.filter((p) => p.status === 'PUBLISHED').length;
    const activeContent = publishedWiki + publishedBlogs;

    return {totalViews, totalLikes, totalComments, activeContent};
  }, [wikiData, blogData, templatesData?.content]);

  // Activity trend data (group by day, last 30 days)
  const activityTrendData = useMemo(() => {
    const activities = activityData?.content || [];
    const dayMap: Record<string, number> = {};

    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dayMap[dateStr] = 0;
    }

    activities.forEach((activity) => {
      const dateStr = new Date(activity.createdAt).toISOString().split('T')[0];
      if (dateStr in dayMap) {
        dayMap[dateStr]++;
      }
    });

    return Object.entries(dayMap)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        actions: count,
      }))
      ; // Keep all 30 days so the x-axis is consistent
  }, [activityData]);

  // Content distribution data
  const contentDistData = useMemo(() => {
    const wikiCount = wikiData?.totalElements || 0;
    const blogCount = blogData?.totalElements || 0;
    const templateCount = templatesData?.totalElements || 0;

    return [
      {name: 'Wiki Pages', value: wikiCount, fill: chartColors.primary},
      {name: 'Blog Posts', value: blogCount, fill: chartColors.secondary},
      {name: 'Templates', value: templateCount, fill: chartColors.success},
    ];
  }, [wikiData, blogData, templatesData]);

  // Top content (sorted by views)
  const topContent = useMemo(() => {
    const wikiPages = (wikiData?.content || []).map((p) => ({
      id: p.id,
      title: p.title,
      type: 'Wiki' as const,
      views: p.viewCount || 0,
      likes: p.likeCount || 0,
      author: p.authorName || 'Unknown',
    }));

    const blogPosts = (blogData?.content || []).map((p) => ({
      id: p.id,
      title: p.title,
      type: 'Blog' as const,
      views: p.viewCount || 0,
      likes: p.likeCount || 0,
      author: p.authorName || 'Unknown',
    }));

    return [...wikiPages, ...blogPosts]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [wikiData, blogData]);

  // Recent activity
  const recentActivities = useMemo(() => {
    return (activityData?.content || []).slice(0, 10);
  }, [activityData]);

  // Guard — all hooks are above this point
  if (!isReady) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <div
              className='w-12 h-12 border-4 border-[var(--accent-primary)] border-t-accent-500 rounded-full animate-spin'/>
            <p className="text-[var(--text-muted)] font-medium">Loading analytics...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) return null;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
        return "bg-status-success-bg text-status-success-text";
      case 'UPDATED':
        return "bg-status-info-bg text-status-info-text";
      case 'PUBLISHED':
        return "bg-accent-subtle text-accent";
      case 'COMMENTED':
        return "bg-status-warning-bg text-status-warning-text";
      case 'LIKED':
        return "bg-status-danger-bg text-status-danger-text";
      default:
        return "bg-surface text-secondary";
    }
  };

  return (
    <AppLayout>
      <motion.div className={layout.sectionGap} {...dsMotion.pageEnter}>
        {/* Page Header */}
        <motion.div
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3}}
        >
          <div className="flex items-start gap-4 mb-2">
            <div className="p-4 bg-gradient-to-br from-[var(--accent-700)] to-[var(--accent-500)] rounded-lg">
              <TrendingUp className={`${iconSize.pageHeader} text-inverse`}/>
            </div>
            <div className="flex-1">
              <h1 className={typography.pageTitle}>Content Analytics</h1>
              <p className={typography.bodySecondary}>
                Track content performance across NU-Fluence
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards Row */}
        {isLoading ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 0.1}}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`${card.base} ${card.paddingLarge} h-24 animate-pulse`}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.1, duration: 0.3}}
          >
            <KpiCard
              icon={Eye}
              label="Total Views"
              value={metrics.totalViews}
              color="primary"
            />
            <KpiCard
              icon={Heart}
              label="Total Likes"
              value={metrics.totalLikes}
              color="secondary"
            />
            <KpiCard
              icon={MessageCircle}
              label="Total Comments"
              value={metrics.totalComments}
              color="warning"
            />
            <KpiCard
              icon={FileText}
              label="Active Content"
              value={metrics.activeContent}
              color="success"
            />
          </motion.div>
        )}

        {/* Charts Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.2, duration: 0.3}}
        >
          {/* Activity Trend */}
          <motion.div className="lg:col-span-2" initial={{opacity: 0, x: -8}} animate={{opacity: 1, x: 0}}>
            <Card className={card.base}>
              <CardHeader className="pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`${iconSize.cardInline} text-accent`}/>
                  <CardTitle className={typography.cardTitle}>Activity Trend</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {activityLoading ? (
                  <div className="h-72 bg-[var(--bg-secondary)] rounded-lg animate-pulse"/>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={activityTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
                      <XAxis
                        dataKey="date"
                        stroke={chartColors.grid}
                        tick={{fill: 'var(--text-muted)', fontSize: 12}}
                      />
                      <YAxis
                        stroke={chartColors.grid}
                        tick={{fill: 'var(--text-muted)', fontSize: 12}}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltip.bg,
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '8px',
                        }}
                        labelStyle={{color: chartColors.tooltip.text}}
                      />
                      <Line
                        type="monotone"
                        dataKey="actions"
                        stroke={chartColors.primary}
                        strokeWidth={2}
                        dot={{fill: chartColors.primary, r: 4}}
                        activeDot={{r: 6}}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Distribution */}
          <motion.div initial={{opacity: 0, x: 8}} animate={{opacity: 1, x: 0}}>
            <Card className={card.base}>
              <CardHeader className="pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <FileText className={`${iconSize.cardInline} text-status-success-text`}/>
                  <CardTitle className={typography.cardTitle}>Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="h-72 bg-[var(--bg-secondary)] rounded-lg animate-pulse"/>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={contentDistData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, value}) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="var(--chart-secondary)"
                        dataKey="value"
                      >
                        {contentDistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill}/>
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltip.bg,
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '8px',
                        }}
                        labelStyle={{color: chartColors.tooltip.text}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Top Content Table */}
        <motion.div
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.3, duration: 0.3}}
        >
          <Card className={card.base}>
            <CardHeader className="pb-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <BookOpen className={`${iconSize.cardInline} text-accent`}/>
                <CardTitle className={typography.cardTitle}>Top Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-[var(--bg-secondary)] rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : topContent.length === 0 ? (
                <p className={typography.bodySecondary}>No content yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                    <tr className="border-b border-[var(--border-main)]">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                        Title
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                        Views
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                        Likes
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                        Author
                      </th>
                    </tr>
                    </thead>
                    <tbody>
                    {topContent.map((item) => (
                      <motion.tr
                        key={item.id}
                        className="border-b border-[var(--border-main)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                        onClick={() => {
                          const route =
                            item.type === 'Wiki'
                              ? `/fluence/wiki/${item.id}`
                              : `/fluence/blogs/${item.id}`;
                          router.push(route);
                        }}
                        whileHover={{backgroundColor: 'var(--bg-secondary)'}}
                      >
                        <td className="px-4 py-4 text-sm text-[var(--text-primary)]">
                          <span className="line-clamp-2">{item.title}</span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                                item.type === 'Wiki'
                                  ? "bg-accent-subtle text-accent"
                                  : "bg-status-warning-bg text-status-warning-text"
                              }`}
                            >
                              {item.type}
                            </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--text-primary)]">
                          {item.views}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--text-primary)]">
                          {item.likes}
                        </td>
                        <td className="px-4 py-4 text-body-secondary">
                          {item.author}
                        </td>
                      </motion.tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.4, duration: 0.3}}
        >
          <Card className={card.base}>
            <CardHeader className="pb-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <TrendingUp className={`${iconSize.cardInline} text-status-info-text`}/>
                <CardTitle className={typography.cardTitle}>Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 bg-[var(--bg-secondary)] rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : recentActivities.length === 0 ? (
                <p className={typography.bodySecondary}>No recent activities</p>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                      whileHover={{x: 4}}
                    >
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${getActionColor(
                          activity.action
                        )}`}
                      >
                        {activity.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`${typography.bodySecondary} truncate`}>
                          <span className="font-medium text-[var(--text-primary)]">
                            {activity.actorName}
                          </span>{' '}
                          {activity.action.toLowerCase()} {activity.contentType.toLowerCase()}
                        </p>
                        <p className={`${typography.caption} truncate`}>
                          {activity.contentTitle}
                        </p>
                      </div>
                      <p className={typography.caption}>
                        {new Date(activity.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'primary' | 'secondary' | 'warning' | 'success';
}

function KpiCard({icon: IconComponent, label, value, color}: KpiCardProps) {
  const _colorMap = {
    primary: 'from-accent-600 to-accent-700',
    secondary: 'from-info-600 to-info-700',
    warning: 'from-warning-600 to-warning-700',
    success: 'from-success-600 to-success-700',
  };

  const bgMap = {
    primary: "bg-accent-subtle",
    secondary: "bg-status-info-bg",
    warning: "bg-status-warning-bg",
    success: "bg-status-success-bg",
  };

  const textMap = {
    primary: "text-accent",
    secondary: "text-status-info-text",
    warning: "text-status-warning-text",
    success: "text-status-success-text",
  };

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.9}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.2}}
    >
      <Card className={card.base}>
        <CardContent className={`${card.paddingLarge} row-between`}>
          <div>
            <p className={typography.caption}>{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-2 tabular-nums">
              {value.toLocaleString()}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${bgMap[color]}`}>
            <IconComponent className={`${iconSize.statCard} ${textMap[color]}`}/>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
