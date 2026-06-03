/* NU-AURA Aura — primitive components */
const { useState: useStateP, useRef: useRefP, useEffect: useEffectP } = React;

// React-safe Lucide icon: owns its own SVG inside a span React never diffs,
// so re-renders/route changes can't collide with Lucide's DOM replacement.
function Icon({ name, size, style, cls }) {
  const ref = useRefP(null);
  const s = size || 16;
  useEffectP(() => {
    const el = ref.current;
    if (!el || !window.lucide) return;
    el.innerHTML = '<i data-lucide="' + name + '" width="' + s + '" height="' + s + '"></i>';
    try { window.lucide.createIcons({ nameAttr: 'data-lucide' }); } catch (e) {}
  }, [name, s]);
  return <span ref={ref} className={cls} style={{ width: s, height: s, display: 'inline-flex', flexShrink: 0, ...style }}></span>;
}

function Button({ variant = 'ghost', size = 'md', icon, iconRight, children, className = '', ...rest }) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

function IconButton({ icon, dot, label, className = '', ...rest }) {
  return (
    <button className={`iconbtn ${className}`} aria-label={label} {...rest}>
      <Icon name={icon} size={18} />
      {dot && <span className="iconbtn__dot" />}
    </button>
  );
}

function Avatar({ name, size = 36, square = false, src }) {
  const bg = NU.colorFor(name);
  return (
    <div className={`avatar ${square ? 'avatar--sq' : ''}`} title={name}
      style={{ width: size, height: size, fontSize: size * 0.38, background: src ? undefined : `linear-gradient(150deg, ${bg}, color-mix(in srgb, ${bg} 72%, #000))` }}>
      {NU.initials(name)}
    </div>
  );
}

function Badge({ variant = 'neutral', dot, children }) {
  return <span className={`badge badge--${variant}`}>{dot && <span className="badge__dot" />}{children}</span>;
}

// status → badge variant map
const STATUS_VARIANT = { Active:'ok', 'On Leave':'warn', Probation:'primary', Terminated:'err', Paid:'ok', Processing:'primary', Draft:'neutral', Pending:'warn', Approved:'ok', Rejected:'err', High:'err', Normal:'neutral', Low:'neutral' };
function StatusBadge({ value }) {
  const v = STATUS_VARIANT[value] || 'neutral';
  return <Badge variant={v} dot>{value}</Badge>;
}

function Card({ pad = true, hover = false, className = '', children, ...rest }) {
  return <div className={`card ${pad ? 'card--pad' : ''} ${hover ? 'card--hover' : ''} ${className}`} {...rest}>{children}</div>;
}

function SectionHead({ title, sub, action }) {
  return (
    <div className="sec-head">
      <div>
        <h3 className="sec-title">{title}</h3>
        {sub && <p className="sec-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ icon, label, value, delta, deltaDir = 'up', spark, sparkColor, foot, iconBg }) {
  return (
    <Card className="stat" pad={false}>
      <div className="stat__top">
        <div className="stat__ico" style={iconBg ? { background: `color-mix(in srgb, ${iconBg} 14%, transparent)`, color: iconBg } : undefined}><Icon name={icon} size={19} /></div>
        {delta && <span className={`stat__delta ${deltaDir}`}><Icon name={deltaDir==='up'?'trending-up':deltaDir==='down'?'trending-down':'minus'} size={13} />{delta}</span>}
      </div>
      <div className="stat__label">{label}</div>
      <div className="stat__row">
        <div className="stat__value">{value}</div>
      </div>
      {spark && <div className="stat__spark"><Sparkline data={spark} color={sparkColor || 'var(--accent)'} /></div>}
      {foot && <div className="stat__foot">{foot}</div>}
    </Card>
  );
}

function Field({ label, icon, hint, error, ...rest }) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      <div className="field__wrap">
        {icon && <span className="field__ico"><Icon name={icon} /></span>}
        <input className={`input ${icon ? 'has-ico' : ''}`} {...rest} />
      </div>
      {(hint || error) && <span className="field__hint" style={error ? { color: 'var(--err-fg)' } : undefined}>{error || hint}</span>}
    </div>
  );
}

function Switch({ on, onClick }) {
  return <button className={`switch ${on ? 'is-on' : ''}`} onClick={onClick} role="switch" aria-checked={on} />;
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={15} />}{o.label}
        </button>
      ))}
    </div>
  );
}

function Check({ on, onClick }) {
  return (
    <button className={`tbl-check ${on ? 'is-on' : ''}`} onClick={onClick} aria-checked={on} role="checkbox">
      <Icon name="check" size={12} />
    </button>
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.id} className={`tab ${value === t.id ? 'is-active' : ''}`} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}{t.label}
          {t.count != null && <span className="tab__n">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function AvatarStack({ names, size = 26, max = 4 }) {
  const shown = names.slice(0, max), extra = names.length - max;
  return (
    <div className="astack">
      {shown.map((n, i) => <Avatar key={i} name={n} size={size} />)}
      {extra > 0 && (
        <div className="avatar" style={{ width: size, height: size, fontSize: size*0.34, background: 'var(--surface-hover)', color: 'var(--text-2)' }}>+{extra}</div>
      )}
    </div>
  );
}

Object.assign(window, { Icon, Button, IconButton, Avatar, Badge, StatusBadge, STATUS_VARIANT, Card, SectionHead, Stat, Field, Switch, Segmented, Check, Tabs, AvatarStack });
