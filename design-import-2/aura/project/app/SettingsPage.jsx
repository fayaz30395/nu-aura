/* NU-AURA Aura — Settings */
const { useState: useStateSe } = React;

const SETTINGS_NAV = [
  { id:'general', label:'General', icon:'sliders-horizontal' },
  { id:'roles', label:'Roles & permissions', icon:'shield-check' },
  { id:'integrations', label:'Integrations', icon:'plug' },
  { id:'notifications', label:'Notifications', icon:'bell' },
  { id:'billing', label:'Billing', icon:'credit-card' },
];

const LEVEL_META = [
  { label:'None',   seg:{ background:'transparent', color:'var(--text-3)' } },
  { label:'View',   seg:{ background:'color-mix(in srgb, var(--accent) 12%, transparent)', color:'var(--accent-text)' } },
  { label:'Edit',   seg:{ background:'color-mix(in srgb, var(--accent) 24%, transparent)', color:'var(--accent-text)' } },
  { label:'Manage', seg:{ background:'var(--accent)', color:'#fff' } },
];
function toneColor(t) { return t==='primary'?'var(--accent)':t==='err'?'var(--err-fg)':t==='warn'?'var(--warn-fg)':'var(--text-3)'; }

function LevelBar({ level }) {
  return (
    <div style={{ display:'flex', gap:3 }}>
      {LEVEL_META.map((m, i) => (
        <span key={i} title={m.label}
          style={{ width:30, height:22, borderRadius:6, display:'grid', placeItems:'center', fontSize:10, fontWeight:700,
            ...(i===level
              ? { border:'1px solid var(--border)', ...m.seg }
              : { border:'1px solid var(--border-soft)', background:'var(--surface-2)', color:'transparent' }) }}>
          {i===level ? m.label[0] : ''}
        </span>
      ))}
    </div>
  );
}

function RbacPanel() {
  const [sel, setSel] = useStateSe('HR Administrator');
  const role = NU.roles.find(r => r.name === sel);
  const perms = NU.rolePerms[sel] || [];
  const modulesWith = perms.filter(l => l > 0).length;

  return (
    <Card pad={false}>
      <div style={{ padding:'18px 20px' }}>
        <SectionHead title="Roles & permissions"
          sub="9 RBAC roles · 1,283 users · 512 granular permissions across 9 modules"
          action={<div style={{ display:'flex', gap:8 }}><Button variant="ghost" size="sm" icon="scroll-text">Audit log</Button><Button variant="primary" size="sm" icon="plus">New role</Button></div>} />
      </div>
      <div className="rbac">
        {/* roles list */}
        <div className="rbac__list">
          {NU.roles.map(r => (
            <button key={r.name} onClick={() => setSel(r.name)} className={`rbac__role ${sel===r.name?'is-active':''}`}>
              <span className="rbac__dot" style={{ background:toneColor(r.tone), boxShadow:`0 0 0 3px color-mix(in srgb, ${toneColor(r.tone)} 16%, transparent)` }} />
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:'block', fontSize:13, fontWeight:600, color: sel===r.name?'var(--accent-text)':'var(--text-1)' }}>{r.name}</span>
                <span className="mono" style={{ fontSize:11, color:'var(--text-3)' }}>{r.users.toLocaleString()} users · {r.perms} perms</span>
              </span>
              {sel===r.name && <Icon name="chevron-right" size={15} style={{ color:'var(--accent-text)' }} />}
            </button>
          ))}
        </div>
        {/* role detail + matrix */}
        <div style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:11, height:11, borderRadius:'50%', background:toneColor(role.tone) }} />
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:19, letterSpacing:'-0.01em', color:'var(--text-1)', margin:0 }}>{role.name}</h3>
                <Badge variant="neutral">{role.scope}</Badge>
              </div>
              <p style={{ fontSize:13, color:'var(--text-3)', margin:'7px 0 0', maxWidth:440, lineHeight:1.5 }}>{role.desc}</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Button variant="ghost" size="sm" icon="copy">Clone</Button>
              <Button variant="ghost" size="sm" icon="pencil">Edit</Button>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, margin:'18px 0 4px', flexWrap:'wrap' }}>
            {[['Users', role.users.toLocaleString()],['Permissions', role.perms],['Modules', `${modulesWith} / 9`]].map(([k,v]) => (
              <div key={k} style={{ flex:1, minWidth:120, padding:'12px 14px', border:'1px solid var(--border)', borderRadius:10, background:'var(--surface-2)' }}>
                <div className="micro">{k}</div>
                <div className="mono" style={{ fontSize:18, fontWeight:700, color:'var(--text-1)', marginTop:3 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'22px 0 12px', flexWrap:'wrap', gap:8 }}>
            <div className="micro">Module access</div>
            <div style={{ display:'flex', gap:14 }}>
              {LEVEL_META.map((m,i) => (
                <span key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-3)' }}>
                  <span style={{ width:10, height:10, borderRadius:3, border:'1px solid var(--border)', ...m.seg }} />{m.label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column' }}>
            {NU.rbacModules.map((m, i) => (
              <div key={m.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 2px', borderTop: i?'1px solid var(--border-soft)':'0' }}>
                <span style={{ width:30, height:30, borderRadius:8, display:'grid', placeItems:'center', background:'var(--surface-2)', color:'var(--text-2)', flexShrink:0 }}><Icon name={m.icon} size={16} /></span>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{m.key}</span>
                <span style={{ fontSize:12, fontWeight:600, color: perms[i]>0?'var(--accent-text)':'var(--text-3)', width:54, textAlign:'right' }}>{NU.accessLevels[perms[i]]}</span>
                <LevelBar level={perms[i]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SettingsPage() {
  const [sec, setSec] = useStateSe('roles');
  const [ints, setInts] = useStateSe(() => NU.integrations.map(i => i.on));

  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Settings</h1>
          <p className="psub">Workspace configuration for {NU.tenant.name}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '212px minmax(0,1fr)', gap: 20, alignItems: 'flex-start' }}>
        <Card pad={false} style={{ padding: 8, position: 'sticky', top: 16 }}>
          {SETTINGS_NAV.map(s => (
            <button key={s.id} className="nav__item" onClick={() => setSec(s.id)}
              style={{ color: sec===s.id?'var(--accent-text)':'var(--text-2)', background: sec===s.id?'var(--accent-soft)':'transparent', fontWeight: sec===s.id?600:500, marginBottom:2 }}>
              <span style={{ display:'grid', placeItems:'center', color: sec===s.id?'var(--accent-text)':'var(--text-3)' }}><Icon name={s.icon} size={17} /></span>
              <span style={{ flex:1, textAlign:'left' }}>{s.label}</span>
            </button>
          ))}
        </Card>

        <div>
          {sec === 'roles' && <RbacPanel />}

          {sec === 'integrations' && (
            <Card pad={false}>
              <div style={{ padding:'18px 20px 0' }}><SectionHead title="Integrations" sub="Connect NU-AURA to the rest of your stack" /></div>
              <div>
                {NU.integrations.map((it, i) => (
                  <div key={it.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderTop: i?'1px solid var(--border-soft)':'0' }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:'var(--surface-2)', border:'1px solid var(--border)', display:'grid', placeItems:'center', color:'var(--text-2)' }}><Icon name={it.icon} size={20} /></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--text-1)' }}>{it.name}</div>
                      <div style={{ fontSize:12.5, color:'var(--text-3)' }}>{it.desc}</div>
                    </div>
                    {ints[i] && <Badge variant="ok" dot>Connected</Badge>}
                    <Switch on={ints[i]} onClick={() => { const next=!ints[i]; setInts(a => a.map((v,j) => j===i?next:v)); window.nuToast(next?`${it.name} connected`:`${it.name} disconnected`, { msg: next?it.desc:'Integration turned off.', type: next?'ok':'warn' }); }} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {sec === 'general' && (
            <Card>
              <SectionHead title="Workspace" sub="Organization-wide defaults" />
              <div style={{ display:'flex', flexDirection:'column', gap:18, maxWidth:460 }}>
                <Field label="Organization name" defaultValue="Acme Robotics" />
                <Field label="Primary domain" icon="globe" defaultValue="acme.co" />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <Field label="Default currency" defaultValue="USD ($)" />
                  <Field label="Fiscal year start" defaultValue="January" />
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderTop:'1px solid var(--border-soft)' }}>
                  <div><div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>Enforce SSO</div><div style={{ fontSize:12, color:'var(--text-3)' }}>Require Okta sign-in for all members</div></div>
                  <Switch on={true} onClick={()=>{}} />
                </div>
                <div><Button variant="primary" icon="check" onClick={() => window.nuToast('Settings saved', { msg: 'Workspace configuration updated.', type:'ok' })}>Save changes</Button></div>
              </div>
            </Card>
          )}

          {(sec === 'notifications' || sec === 'billing') && (
            <Card>
              <div className="empty">
                <div className="empty__ico"><Icon name={sec==='billing'?'credit-card':'bell'} size={28} /></div>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--text-1)', margin:'0 0 6px' }}>{sec==='billing'?'Billing':'Notifications'}</h3>
                <p style={{ fontSize:13.5, maxWidth:360, lineHeight:1.6 }}>{sec==='billing'?'Enterprise plan · 1,248 seats · renews Jan 2027. Invoices and payment methods would appear here.':'Per-channel notification preferences for approvals, payroll, and reminders would appear here.'}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsPage });
