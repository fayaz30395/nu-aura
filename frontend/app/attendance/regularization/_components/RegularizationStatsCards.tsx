'use client';

import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { SkeletonStatCard } from '@/components/ui/Skeleton';
import { RegularizationStats } from './types';

interface RegularizationStatsCardsProps {
  stats: RegularizationStats;
  loading: boolean;
}

export function RegularizationStatsCards({ stats, loading }: RegularizationStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Pending Card */}
      <Card className="card-aura">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-[var(--status-warning-bg)] flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Clock className="h-6 w-6 text-[var(--status-warning-text)]" />
            </motion.div>
            <div>
              <p className="text-caption uppercase font-medium">Pending</p>
              <motion.p
                className="text-stat-large"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {stats.pending}
              </motion.p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approved Card */}
      <Card className="card-aura">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
            >
              <CheckCircle className="h-6 w-6 text-[var(--status-success-text)]" />
            </motion.div>
            <div>
              <p className="text-caption uppercase font-medium">Approved</p>
              <motion.p
                className="text-stat-large"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {stats.approved}
              </motion.p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejected Card */}
      <Card className="card-aura">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-[var(--status-danger-bg)] flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
            >
              <XCircle className="h-6 w-6 text-[var(--status-danger-text)]" />
            </motion.div>
            <div>
              <p className="text-caption uppercase font-medium">Rejected</p>
              <motion.p
                className="text-stat-large"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {stats.rejected}
              </motion.p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Resolution Card */}
      <Card className="card-aura">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-[var(--status-info-bg)] flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
            >
              <TrendingUp className="h-6 w-6 text-[var(--status-info-text)]" />
            </motion.div>
            <div>
              <p className="text-caption uppercase font-medium">Avg Resolution</p>
              <motion.p
                className="text-stat-large"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : '--'}
              </motion.p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
