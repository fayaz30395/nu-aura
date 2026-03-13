interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin`} />
      {text && <p className="text-gray-600 dark:text-gray-400 text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-surface-950/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-8">{spinner}</div>;
}

/**
 * Animated branded loading screen for NU-AURA platform.
 * Shows an engaging pulsing logo + orbit animation + shimmer text.
 */
export function NuAuraLoader({ message = 'Loading your workspace...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-surface-50 via-white to-primary-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30 transition-colors">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo Container */}
        <div className="relative w-24 h-24">
          {/* Outer orbit ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-200 dark:border-primary-800 animate-[spin_3s_linear_infinite]">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50" />
          </div>
          {/* Middle orbit ring */}
          <div className="absolute inset-3 rounded-full border-2 border-violet-200 dark:border-violet-800 animate-[spin_2s_linear_infinite_reverse]">
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
          </div>
          {/* Inner pulsing core */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 shadow-xl shadow-primary-500/30 animate-pulse flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-tight">N</span>
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 dark:from-primary-400 dark:to-violet-400 bg-clip-text text-transparent">
            NU-AURA
          </h2>
          {/* Shimmer loading text */}
          <div className="relative overflow-hidden">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {message}
            </p>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-surface-800/60 to-transparent animate-[shimmer_2s_infinite]" />
          </div>
        </div>

        {/* Animated progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary-400 dark:bg-primary-500"
              style={{
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
