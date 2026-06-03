'use client';

import {BookOpen, Briefcase, CheckCircle2, TrendingUp, Users} from 'lucide-react';
import {type ReactNode} from 'react';
import './brand-panel.css';

interface AuthProduct {
  id: string;
  name: string;
  tag: string;
  icon: ReactNode;
  color: string;
}

const PRODUCT_TILES: Record<string, string> = {
  hrms: 'bg-[var(--prod-hrms)]',
  hire: 'bg-[var(--prod-hire)]',
  grow: 'bg-[var(--prod-grow)]',
  fluence: 'bg-[var(--prod-fluence)]',
};

// Mirrors the four bundle apps from the Aura spec (PRODUCTS in Shell.jsx).
// Colors come from the frozen product tokens; icons map 1:1 to the prototype's
// lucide names (users / briefcase / trending-up / book-open).
const PRODUCTS: AuthProduct[] = [
  {id: 'hrms', name: 'NU-HRMS', tag: 'Core HR', icon: <Users size={18}/>, color: 'var(--prod-hrms)'},
  {id: 'hire', name: 'NU-Hire', tag: 'Recruitment', icon: <Briefcase size={18}/>, color: 'var(--prod-hire)'},
  {id: 'grow', name: 'NU-Grow', tag: 'Performance', icon: <TrendingUp size={18}/>, color: 'var(--prod-grow)'},
  {id: 'fluence', name: 'NU-Fluence', tag: 'Knowledge', icon: <BookOpen size={18}/>, color: 'var(--prod-fluence)'},
];

// Login-only cues. These are product affordances, not marketing proof claims.
const ACCESS_STEPS = [
  {title: 'Sign in once', detail: 'Use one identity for every people workflow.'},
  {title: 'Open the right workspace', detail: 'HRMS, Hire, Grow, and Fluence stay grouped.'},
  {title: 'Continue the task', detail: 'Navigation and permissions adapt after login.'},
];

const ACCESS_BADGES = ['Role-aware navigation', 'One workspace identity', 'Desktop and mobile ready'];

interface BrandPanelProps {
  /** Headline rendered in the brand panel. Defaults to the login headline. */
  headline?: ReactNode;
  /** Supporting copy beneath the headline. */
  lede?: ReactNode;
  /**
   * When true, render login-specific product highlights. Off by default so
   * signup / reset keep the lean panel.
   */
  showHighlights?: boolean;
}

/**
 * Dark gradient brand panel shared by the auth surfaces (login / signup /
 * reset). Presentation only — carries no auth logic. Hidden below the lg
 * breakpoint, where the form takes the full width.
 */
export function BrandPanel({headline, lede, showHighlights = false}: BrandPanelProps) {
  const defaultHeadline = showHighlights ? (
    <>One login.<br/>Four focused <span className="aura-brand__accent">workspaces.</span></>
  ) : (
    <>One login.<br/>Your whole people stack.</>
  );
  const defaultLede = showHighlights
    ? 'HRMS, hiring, growth, and knowledge tools in one role-aware workspace.'
    : 'HRMS, recruitment, performance and knowledge — unified in a single workspace for your organisation.';

  return (
    <section className="hidden lg:flex w-full">
      <div className="aura-brand motion-rise w-full">
        <div className="aura-brand__inner">
          <div className="aura-brand__logo">
            <div className="aura-brand__mark"><span>N</span></div>
            <div>
              <div className="aura-brand__name">NU-AURA</div>
              <div className="aura-brand__by">by NULogic Technologies</div>
            </div>
          </div>

          {showHighlights && (
            <div className="aura-brand__eyebrow">
              <span className="aura-brand__eyebrow-dot" aria-hidden="true"/>
              The enterprise people platform
            </div>
          )}

          <p className="aura-brand__head">
            {headline ?? defaultHeadline}
          </p>
          <p className="aura-brand__lede">
            {lede ?? defaultLede}
          </p>

          {showHighlights && (
            <div className="aura-brand__access" aria-label="Workspace access flow">
              {ACCESS_STEPS.map((step, index) => (
                <div className="aura-brand__access-row" key={step.title}>
                  <span className="aura-brand__access-index tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="aura-brand__access-title">{step.title}</span>
                    <span className="aura-brand__access-detail">{step.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="aura-brand__apps">
            {PRODUCTS.map((product) => (
              <div className="aura-brand__app" key={product.id}>
                <div className={`aura-brand__app-ico ${PRODUCT_TILES[product.id] ?? 'bg-[var(--accent)]'}`}>
                  {product.icon}
                </div>
                <div>
                  <div className="aura-brand__app-name">{product.name}</div>
                  <div className="aura-brand__app-tag">{product.tag}</div>
                </div>
              </div>
            ))}
          </div>

          {showHighlights ? (
            <div className="aura-brand__assurance">
              {ACCESS_BADGES.map((badge) => (
                <span className="aura-brand__badge" key={badge}>
                  <CheckCircle2 size={13} aria-hidden="true"/>
                  {badge}
                </span>
              ))}
            </div>
          ) : (
            <div className="aura-brand__tagline">Infinite Innovation</div>
          )}
        </div>
      </div>
    </section>
  );
}
