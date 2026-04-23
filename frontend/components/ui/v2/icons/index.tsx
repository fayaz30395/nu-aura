import * as React from 'react';

type Props = React.SVGProps<SVGSVGElement> & {size?: number};

const base = (size = 24, props: Omit<Props, 'size'>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const BrandG: React.FC<Props> = ({size = 28, ...props}) => (
  <svg {...base(size, props)} viewBox="0 0 32 32">
    <defs>
      <linearGradient id="nulogic-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--accent-400)"/>
        <stop offset="100%" stopColor="var(--accent-700)"/>
      </linearGradient>
    </defs>
    <path
      d="M22 10a7 7 0 1 0 0 12h-4v-6h4"
      stroke="url(#nulogic-g)"
      strokeWidth="2.5"
      fill="none"
    />
  </svg>
);

export const EmptyInbox: React.FC<Props> = ({size = 96, ...props}) => (
  <svg {...base(size, props)} viewBox="0 0 96 96" stroke="var(--accent-400)">
    <path d="M12 56 L24 28 H72 L84 56 V76 H12 Z" strokeOpacity={0.45}/>
    <path d="M12 56 H32 L36 66 H60 L64 56 H84" strokeOpacity={0.8}/>
    <circle cx="48" cy="36" r="3" strokeOpacity={0.4}/>
  </svg>
);

export const EmptyChart: React.FC<Props> = ({size = 96, ...props}) => (
  <svg {...base(size, props)} viewBox="0 0 96 96" stroke="var(--accent-400)">
    <path d="M16 76 H80" strokeOpacity={0.45}/>
    <path d="M16 76 V20" strokeOpacity={0.45}/>
    <rect x="24" y="52" width="10" height="20" strokeOpacity={0.7}/>
    <rect x="42" y="40" width="10" height="32" strokeOpacity={0.7}/>
    <rect x="60" y="28" width="10" height="44" strokeOpacity={0.9}/>
  </svg>
);

export const EmptyCalendar: React.FC<Props> = ({size = 96, ...props}) => (
  <svg {...base(size, props)} viewBox="0 0 96 96" stroke="var(--accent-400)">
    <rect x="16" y="24" width="64" height="56" rx="4" strokeOpacity={0.5}/>
    <path d="M16 38 H80" strokeOpacity={0.5}/>
    <path d="M32 16 V28 M64 16 V28" strokeOpacity={0.7}/>
    <circle cx="40" cy="56" r="2" strokeOpacity={0.8} fill="currentColor"/>
    <circle cx="56" cy="56" r="2" strokeOpacity={0.8} fill="currentColor"/>
  </svg>
);

export const EmptySearch: React.FC<Props> = ({size = 96, ...props}) => (
  <svg {...base(size, props)} viewBox="0 0 96 96" stroke="var(--accent-400)">
    <circle cx="42" cy="42" r="22" strokeOpacity={0.55}/>
    <path d="M60 60 L78 78" strokeOpacity={0.7}/>
    <path d="M32 42 H52" strokeOpacity={0.35}/>
  </svg>
);

export const EmptyTable: React.FC<Props> = ({size = 96, ...props}) => (
  <svg {...base(size, props)} viewBox="0 0 96 96" stroke="var(--accent-400)">
    <rect x="12" y="20" width="72" height="56" rx="3" strokeOpacity={0.45}/>
    <path d="M12 34 H84 M12 48 H84 M12 62 H84 M36 20 V76 M60 20 V76" strokeOpacity={0.35}/>
  </svg>
);

export const LoaderRing: React.FC<Props & {thickness?: number}> = ({
  size = 24,
  thickness = 2,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role="status"
    aria-label="Loading"
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeOpacity={0.18}
      strokeWidth={thickness}
    />
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth={thickness}
      strokeDasharray="56.5"
      strokeDashoffset="42"
      strokeLinecap="round"
      style={{
        transformOrigin: 'center',
        animation: 'v2-spin 0.9s linear infinite',
      }}
    />
    <style>{`@keyframes v2-spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);
