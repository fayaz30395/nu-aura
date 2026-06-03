'use client';

import {BookOpen, Briefcase, ShieldCheck, Star, TrendingUp, Users} from 'lucide-react';
import {Fragment, type ReactNode} from 'react';
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

// Aura v2 login brand highlights — social-proof rows shown only on the login
// surface (signup / reset keep the lean panel via showHighlights=false default).
const BRAND_METRICS = [
  {n: '1,248', l: 'employees managed'},
  {n: '4-in-1', l: 'products, one login'},
  {n: '99.98%', l: 'uptime SLA'},
];

const TRUST_AVATARS = ['Priya Nair', 'Diego Santos', 'Mei Lin', 'Hana Kim'];

const COMPLIANCE_BADGES = ['SOC 2 Type II', 'GDPR', 'ISO 27001'];

function avatarInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface BrandPanelProps {
  /** Headline rendered in the brand panel. Defaults to the login headline. */
  headline?: ReactNode;
  /** Supporting copy beneath the headline. */
  lede?: ReactNode;
  /**
   * When true, render the Aura v2 login highlights (eyebrow, animated gradient
   * headline accent, metrics, trust/rating/compliance rows, ambient orbs). Off
   * by default so signup / reset keep the lean panel.
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
    <>One login.<br/>Your whole <span className="aura-brand__grad">people stack.</span></>
  ) : (
    <>One login.<br/>Your whole people stack.</>
  );
  const defaultLede = showHighlights
    ? 'HR, recruitment, performance and knowledge — unified in a single workspace. Less tab-switching, more shipping.'
    : 'HRMS, recruitment, performance and knowledge — unified in a single workspace for your organisation.';

  return (
    <section className="hidden lg:flex w-full">
      <div className="aura-brand motion-rise w-full">
        {showHighlights && (
          <>
            <div className="aura-brand__orb aura-brand__orb--1" aria-hidden="true"/>
            <div className="aura-brand__orb aura-brand__orb--2" aria-hidden="true"/>
          </>
        )}
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

          <h1 className="aura-brand__head">
            {headline ?? defaultHeadline}
          </h1>
          <p className="aura-brand__lede">
            {lede ?? defaultLede}
          </p>

          {showHighlights && (
            <div className="aura-brand__metrics">
              {BRAND_METRICS.map((metric, index) => (
                <Fragment key={metric.l}>
                  {index > 0 && <div className="aura-brand__metric-sep" aria-hidden="true"/>}
                  <div className="aura-brand__metric">
                    <div className="aura-brand__metric-n tabular-nums">{metric.n}</div>
                    <div className="aura-brand__metric-l">{metric.l}</div>
                  </div>
                </Fragment>
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
            <>
              <div className="aura-brand__trust">
                <div className="aura-brand__avs">
                  {TRUST_AVATARS.map((name) => (
                    <span className="aura-brand__av" key={name} aria-hidden="true">
                      {avatarInitials(name)}
                    </span>
                  ))}
                  <span className="aura-brand__avs-more tabular-nums" aria-hidden="true">1.2k+</span>
                </div>
                <span className="aura-brand__trust-txt">
                  Trusted by <b className="tabular-nums">1,200+</b> people teams worldwide
                </span>
              </div>

              <div className="aura-brand__rating">
                <span className="aura-brand__stars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={14}/>
                  ))}
                </span>
                <span className="aura-brand__rating-txt">
                  <b className="tabular-nums">4.9 / 5</b> · <span className="tabular-nums">2,400+</span> reviews on G2
                </span>
              </div>

              <div className="aura-brand__compliance">
                {COMPLIANCE_BADGES.map((badge) => (
                  <span className="aura-brand__badge" key={badge}>
                    <ShieldCheck size={13} aria-hidden="true"/>
                    {badge}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="aura-brand__tagline">Infinite Innovation</div>
          )}
        </div>
      </div>
    </section>
  );
}
