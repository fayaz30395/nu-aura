/* NU-AURA Aura — Settings */
const { useState: useStateSe } = React;

const SETTINGS_NAV = [
  { id:'general', label:'General', icon:'sliders-horizontal' },
  { id:'roles', label:'Roles & permissions', icon:'shield-check' },
  { id:'integrations', label:'Integrations', icon:'plug' },
  { id:'notifications', label:'Notifications', icon:'bell' },
  { id:'billing', label:'Billing', icon:'credit-card' },
];

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
          {sec === 'roles' && (
            <Card pad={false}>
              <div style={{ padding:'18px 20px 0' }}>
                <SectionHead title="Roles & permissions" sub="9 RBAC roles · 1,283 users · 512 permissions" action={<Button variant="primary" size="sm" icon="plus">New role</Button>} />
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Role</th><th style={{ textAlign:'right' }}>Users</th><th style={{ textAlign:'right' }}>Permissions</th><th>Scope</th><th style={{ width:48 }}></th></tr></thead>
                  <tbody>
                    {NU.roles.map(r => (
                      <tr key={r.name}>
                        <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><span className="dot-status" style={{ background:`var(--${r.tone==='primary'?'accent':r.tone==='err'?'err-fg':r.tone==='warn'?'warn-fg':'text-3'})` }} /><span style={{ fontWeight:600, color:'var(--text-1)' }}>{r.name}</span></div></td>
                        <td className="mono" style={{ textAlign:'right' }}>{r.users.toLocaleString()}</td>
                        <td className="mono" style={{ textAlign:'right', fontWeight:600, color:'var(--text-1)' }}>{r.perms}</td>
                        <td style={{ color:'var(--text-3)' }}>{r.scope}</td>
                        <td><IconButton icon="pencil" label="Edit role" className="iconbtn" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

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
                    <Switch on={ints[i]} onClick={() => setInts(a => a.map((v,j) => j===i?!v:v))} />
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
                <div><Button variant="primary" icon="check">Save changes</Button></div>
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
