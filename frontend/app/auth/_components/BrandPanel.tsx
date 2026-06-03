'use client';

import {BookOpen, Briefcase, TrendingUp, Users} from 'lucide-react';
import type {ReactNode} from 'react';
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

interface BrandPanelProps {
  /** Headline rendered in the brand panel. Defaults to the login headline. */
  headline?: ReactNode;
  /** Supporting copy beneath the headline. */
  lede?: ReactNode;
}

/**
 * Dark gradient brand panel shared by the auth surfaces (login / signup /
 * reset). Presentation only — carries no auth logic. Hidden below the lg
 * breakpoint, where the form takes the full width.
 */
export function BrandPanel({headline, lede}: BrandPanelProps) {
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

          <h1 className="aura-brand__head">
            {headline ?? (
              <>One login.<br/>Your whole people stack.</>
            )}
          </h1>
          <p className="aura-brand__lede">
            {lede ?? 'HRMS, recruitment, performance and knowledge — unified in a single workspace for your organisation.'}
          </p>

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

          <div className="aura-brand__tagline">Infinite Innovation</div>
        </div>
      </div>
    </section>
  );
}
