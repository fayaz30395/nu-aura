/* NU-AURA Aura — app shell: rail, nav, topbar, command palette */
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

const PRODUCTS = [
  { id:'hrms', name:'NU-HRMS', tag:'Core HR', icon:'users', color:'var(--prod-hrms)' },
  { id:'hire', name:'NU-Hire', tag:'Recruitment', icon:'briefcase', color:'var(--prod-hire)' },
  { id:'grow', name:'NU-Grow', tag:'Performance', icon:'trending-up', color:'var(--prod-grow)' },
  { id:'fluence', name:'NU-Fluence', tag:'Knowledge', icon:'book-open', color:'var(--prod-fluence)' },
];

const NAV = {
  hrms: [
    { group:'Workspace', items:[
      { id:'dashboard', label:'Dashboard', icon:'layout-dashboard' },
      { id:'inbox', label:'Approvals', icon:'inbox', count:6, alert:true },
    ]},
    { group:'People', items:[
      { id:'employees', label:'Employees', icon:'users' },
      { id:'attendance', label:'Attendance', icon:'fingerprint' },
      { id:'leave', label:'Leave', icon:'palmtree' },
      { id:'payroll', label:'Payroll', icon:'banknote' },
    ]},
    { group:'Operations', items:[
      { id:'assets', label:'Assets', icon:'package' },
      { id:'benefits', label:'Benefits', icon:'heart-pulse' },
      { id:'reports', label:'Reports', icon:'bar-chart-3' },
      { id:'settings', label:'Settings', icon:'settings' },
    ]},
  ],
};

function ProductRail({ product, onProduct, onAvatar, theme }) {
  return (
    <aside className="rail">
      <div className="rail__logo" title="NU-AURA"><span>N</span></div>
      <div className="rail__sep" />
      {PRODUCTS.map(p => (
        <button key={p.id} className={`rail__btn ${product === p.id ? 'is-active' : ''}`} data-tip={p.name}
          style={{ '--prod': p.color }} onClick={() => onProduct(p.id)}>
          <span className="rail__chip" />
          <span className="rail__ico"><Icon name={p.icon} size={21} /></span>
        </button>
      ))}
      <div className="rail__spacer" />
      <button className="rail__btn" data-tip="Help & support"><Icon name="life-buoy" size={20} /></button>
      <div className="rail__avatar" onClick={onAvatar}><Avatar name={NU.user.name} size={34} square /></div>
    </aside>
  );
}

function NavPanel({ product, active, onNav, collapsed }) {
  const groups = NAV[product] || NAV.hrms;
  const prod = PRODUCTS.find(p => p.id === product);
  return (
    <nav className={`nav ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="nav__head">
        <div className="nav__product">
          <div className="nav__pico" style={{ background: prod.color }}><Icon name={prod.icon} size={17} /></div>
          <div>
            <div className="nav__pname">{prod.name}</div>
            <div className="nav__ptag">{prod.tag}</div>
          </div>
        </div>
      </div>
      <div className="nav__ws">
        <div className="nav__ws-logo">AR</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nav__ws-name">{NU.tenant.name}</div>
          <div className="nav__ws-sub">{NU.tenant.plan}</div>
        </div>
        <span className="nav__ws-chev"><Icon name="chevrons-up-down" size={14} /></span>
      </div>
      <div className="nav__scroll">
        {groups.map(g => (
          <div className="nav__group" key={g.group}>
            <div className="nav__glabel">{g.group}</div>
            {g.items.map(it => (
              <button key={it.id} className={`nav__item ${active === it.id ? 'is-active' : ''}`} onClick={() => onNav(it.id)}>
                <span className="nav__iico"><Icon name={it.icon} size={18} /></span>
                <span className="nav__ilabel">{it.label}</span>
                {it.count != null && <span className={`nav__count ${it.alert ? 'is-alert' : ''}`}>{it.count}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="nav__foot">
        <div className="nav__upsell">
          <div className="nav__upsell-t">Unlock NU-Grow</div>
          <div className="nav__upsell-s">Reviews, OKRs &amp; learning in one place.</div>
          <Button variant="ghostdark" size="xs">Start trial</Button>
        </div>
      </div>
    </nav>
  );
}

function TopBar({ crumbs, onToggleNav, onCmdK, theme, onToggleTheme, onNav }) {
  return (
    <header className="top">
      <button className="top__menu" onClick={onToggleNav} aria-label="Toggle navigation"><Icon name="panel-left" size={19} /></button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumbs__sep"><Icon name="chevron-right" size={14} /></span>}
            <span className={`crumbs__item ${i === crumbs.length-1 ? 'is-current' : ''}`}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="top__spacer" />
      <button className="cmdk" onClick={onCmdK}>
        <Icon name="search" size={16} />
        <span className="cmdk__txt">Search or jump to…</span>
        <kbd>⌘K</kbd>
      </button>
      <button className="iconbtn" onClick={onToggleTheme} aria-label="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
      <IconButton icon="bell" dot label="Notifications" />
      <div className="top__sep" />
      <button className="top__user" onClick={() => onNav('settings')}>
        <Avatar name={NU.user.name} size={32} />
        <div style={{ textAlign: 'left' }}>
          <div className="top__uname">{NU.user.name}</div>
          <div className="top__urole">{NU.user.role}</div>
        </div>
        <Icon name="chevron-down" size={15} style={{ color: 'var(--text-3)' }} />
      </button>
    </header>
  );
}

// ── Command palette ──
const CMD_ITEMS = [
  { group:'Navigate', icon:'layout-dashboard', label:'Go to Dashboard', hint:'G then D', nav:'dashboard' },
  { group:'Navigate', icon:'users', label:'Go to Employees', hint:'G then E', nav:'employees' },
  { group:'Navigate', icon:'inbox', label:'Go to Approvals', hint:'G then A', nav:'inbox' },
  { group:'Navigate', icon:'fingerprint', label:'Go to Attendance', nav:'attendance' },
  { group:'Navigate', icon:'palmtree', label:'Go to Leave', nav:'leave' },
  { group:'Navigate', icon:'banknote', label:'Go to Payroll', nav:'payroll' },
  { group:'Actions', icon:'user-plus', label:'Add new employee', hint:'Create' },
  { group:'Actions', icon:'calendar-plus', label:'Request time off', hint:'Create' },
  { group:'Actions', icon:'play', label:'Run payroll', hint:'Create' },
  { group:'Actions', icon:'download', label:'Export directory (CSV)' },
  { group:'People', icon:'user', label:'Priya Nair · Engineering', nav:'employees' },
  { group:'People', icon:'user', label:'Tomas Becker · Engineering', nav:'employees' },
  { group:'People', icon:'user', label:'Mei Lin · Finance', nav:'employees' },
];

function CommandPalette({ onClose, onNav }) {
  const [q, setQ] = useStateS('');
  const [sel, setSel] = useStateS(0);
  const inputRef = useRefS(null);
  useEffectS(() => { inputRef.current && inputRef.current.focus(); }, []);
  const filtered = CMD_ITEMS.filter(it => it.label.toLowerCase().includes(q.toLowerCase()));
  const groups = {};
  filtered.forEach(it => { (groups[it.group] = groups[it.group] || []).push(it); });
  useEffectS(() => { setSel(0); }, [q]);

  function run(it) { if (it && it.nav) onNav(it.nav); onClose(); }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, filtered.length-1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(filtered[sel]); }
    else if (e.key === 'Escape') { onClose(); }
  }

  let idx = -1;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="cmd" onClick={e => e.stopPropagation()} onKeyDown={onKey}>
        <div className="cmd__in">
          <Icon name="search" size={19} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search people, actions, pages…" />
          <kbd>ESC</kbd>
        </div>
        <div className="cmd__body">
          {filtered.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5 }}>No results for “{q}”</div>}
          {Object.keys(groups).map(g => (
            <div className="cmd__group" key={g}>
              <div className="cmd__glabel">{g}</div>
              {groups[g].map(it => {
                idx++;
                const me = idx;
                return (
                  <div key={it.label} className={`cmd__item ${sel === me ? 'is-active' : ''}`}
                    onMouseEnter={() => setSel(me)} onClick={() => run(it)}>
                    <div className="cmd__iico"><Icon name={it.icon} size={16} /></div>
                    <div className="cmd__label">{it.label}</div>
                    {it.hint && <div className="cmd__hint">{it.hint}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmd__foot">
          <span><kbd>↑↓</kbd>navigate</span>
          <span><kbd>↵</kbd>select</span>
          <span><kbd>esc</kbd>close</span>
          <span style={{ marginLeft: 'auto' }}>NU-AURA Command</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PRODUCTS, NAV, ProductRail, NavPanel, TopBar, CommandPalette });
