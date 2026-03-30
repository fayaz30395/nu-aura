'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Clock } from 'lucide-react';

interface AppLandingHeroProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  comingSoon?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable landing hero component for app entry pages
 * Provides animated gradient background and staggered content animations
 */
export const AppLandingHero: React.FC<AppLandingHeroProps> = ({
  icon,
  title,
  description,
  comingSoon = false,
  gradientFrom = 'from-accent-500',
  gradientTo = 'to-accent-600',
  iconSize = 'md',
}) => {
  const iconDimensions = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  const iconInnerDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <div className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12 overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-5`}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 ${
              i % 2 === 0 ? 'bg-accent-400' : 'bg-accent-500'
            } rounded-full opacity-40`}
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
            }}
            animate={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Content container */}
      <motion.div
        className="relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Icon */}
        <motion.div
          className={`${iconDimensions[iconSize]} rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg mb-6 mx-auto`}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className={`${iconInnerDimensions[iconSize]} text-white flex items-center justify-center`}>
            {icon}
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-3xl md:text-4xl font-bold text-surface-800 dark:text-surface-100 mb-3"
          variants={itemVariants}
        >
          {title}
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-surface-600 dark:text-surface-400 max-w-md mx-auto mb-6 text-base leading-relaxed"
          variants={itemVariants}
        >
          {description}
        </motion.p>

        {/* Coming Soon Badge */}
        {comingSoon && (
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 text-sm font-medium"
            variants={itemVariants}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Clock className="w-4 h-4" />
            Coming Soon — Phase 2
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
