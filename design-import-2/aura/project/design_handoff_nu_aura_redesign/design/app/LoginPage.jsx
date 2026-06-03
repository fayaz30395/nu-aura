/* NU-AURA Aura — Login */
const { useState: useStateL } = React;

function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useStateL('fayaz@acme.co');
  const [pw, setPw] = useStateL('••••••••••');
  const [remember, setRemember] = useStateL(true);

  return (
    <div className="login">
      <button className="iconbtn login__theme" onClick={onToggleTheme} aria-label="Toggle theme"><Icon name={theme==='dark'?'sun':'moon'} size={18} /></button>
      {/* Left — brand panel */}
      <div className="login__brand">
        <div className="login__orb login__orb--1"></div>
        <div className="login__orb login__orb--2"></div>
        <div className="login__brand-inner">
          <div className="login__logo">
            <div className="login__logo-mark"><span>N</span></div>
            <div>
              <div className="login__logo-name">NU-AURA</div>
              <div className="login__logo-tag">by NULogic Technologies</div>
            </div>
          </div>
          <div className="login__eyebrow"><span className="login__eyebrow-dot"></span>The enterprise people platform</div>
          <h1 className="login__head">One login.<br />Your whole <span className="login__grad">people stack.</span></h1>
          <p className="login__lede">HR, recruitment, performance and knowledge — unified in a single workspace. Less tab-switching, more shipping.</p>

          <div className="login__metrics">
            <div className="login__metric"><div className="login__metric-n">1,248</div><div className="login__metric-l">employees managed</div></div>
            <div className="login__metric-sep"></div>
            <div className="login__metric"><div className="login__metric-n">4-in-1</div><div className="login__metric-l">products, one login</div></div>
            <div className="login__metric-sep"></div>
            <div className="login__metric"><div className="login__metric-n">99.98%</div><div className="login__metric-l">uptime SLA</div></div>
          </div>

          <div className="login__apps">
            {PRODUCTS.map(p => (
              <div className="login__app" key={p.id}>
                <div className="login__app-ico" style={{ background: p.color }}><Icon name={p.icon} size={18} /></div>
                <div>
                  <div className="login__app-name">{p.name}</div>
                  <div className="login__app-tag">{p.tag}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="login__trust">
            <div className="login__avs">
              {['Priya Nair','Diego Santos','Mei Lin','Hana Kim'].map(n => <Avatar key={n} name={n} size={30} />)}
              <div className="login__avs-more">1.2k+</div>
            </div>
            <span className="login__trust-txt">Trusted by <b>1,200+</b> people teams worldwide</span>
          </div>
          <div className="login__rating">
            <span className="login__stars">{[0,1,2,3,4].map(i => <Icon key={i} name="star" size={14} />)}</span>
            <span className="login__rating-txt"><b>4.9 / 5</b> · 2,400+ reviews on G2</span>
          </div>
          <div className="login__compliance">
            {['SOC 2 Type II','GDPR','ISO 27001'].map(c => (
              <span className="login__badge" key={c}><Icon name="shield-check" size={13} />{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="login__form-wrap">
        <div className="login__form">
          <h2 className="login__form-h">Welcome back</h2>
          <p className="login__form-sub">Sign in to your Acme Robotics workspace.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 26 }}>
            <Field label="Work email" icon="mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            <Field label="Password" icon="lock" type="password" value={pw} onChange={e => setPw(e.target.value)} />
          </div>

          <div className="login__row">
            <button className="login__check" onClick={() => setRemember(r => !r)}>
              <span className={`tbl-check ${remember ? 'is-on' : ''}`}><Icon name="check" size={12} /></span>
              Remember me
            </button>
            <a className="link">Forgot password?</a>
          </div>

          <Button variant="primary" size="lg" className="btn--block" onClick={onLogin} iconRight="arrow-right">Sign in</Button>

          <div className="login__or"><span>or continue with</span></div>
          <div className="login__sso">
            <Button variant="ghost" className="btn--block">SSO</Button>
            <Button variant="ghost" className="btn--block">Google</Button>
            <Button variant="ghost" className="btn--block">Microsoft</Button>
          </div>

          <p className="login__foot">New to Acme? <a className="link">Contact your administrator</a></p>
        </div>
        <div className="login__legal">© 2026 NULogic Technologies · Enterprise SSO secured</div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginPage });
