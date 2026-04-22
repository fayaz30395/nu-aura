import React from 'react';
import {StatCard} from './StatCard';

interface PremiumMetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  delay?: number;
}

// Thin compat shim: the premium metric card visual is now the `premium` variant of StatCard.
export const PremiumMetricCard: React.FC<PremiumMetricCardProps> = ({
                                                                      title,
                                                                      value,
                                                                      change,
                                                                      isPositive = true,
                                                                      icon,
                                                                      delay = 0,
                                                                    }) => (
  <StatCard
    variant="premium"
    title={title}
    value={value}
    change={change}
    isPositive={isPositive}
    icon={icon}
    delay={delay}
  />
);
