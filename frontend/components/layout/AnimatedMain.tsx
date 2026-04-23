'use client';

import * as React from 'react';
import {motion, useReducedMotion} from 'framer-motion';
import {useThemeVersion} from '@/lib/theme/ThemeVersionProvider';
import {fadeRise, reduceVariants} from '@/lib/animations/v2';

interface AnimatedMainProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function AnimatedMain({children, className, ...rest}: AnimatedMainProps) {
  const isV2 = useThemeVersion() === 'v2';
  const shouldReduce = useReducedMotion() ?? false;

  if (!isV2) {
    return (
      <main className={className} {...rest}>
        {children}
      </main>
    );
  }

  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={reduceVariants(fadeRise, shouldReduce)}
      className={className}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.main>
  );
}
