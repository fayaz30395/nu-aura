/* NU-AURA Aura — Benefits */
function BenefitsPage() {
  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Benefits</h1>
          <p className="psub">Open enrollment closes in 12 days · 94% of employees enrolled</p>
        </div>
        <div className="pactions">
          <Button variant="ghost" icon="file-text">Plan documents</Button>
          <Button variant="primary" icon="settings-2">Manage plans</Button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon="users" label="Enrolled" value="1,186" delta="94%" deltaDir="up" foot="of 1,248 eligible" />
        <Stat icon="layers" label="Active plans" value="6" delta="2 new" deltaDir="up" iconBg="#0ea5a3" foot="Across 5 carriers" />
        <Stat icon="wallet" label="Monthly cost" value="$612K" delta="3.8%" deltaDir="down" iconBg="#d97706" foot="Employer share 72%" />
        <Stat icon="user" label="Avg / employee" value="$516" delta="On budget" deltaDir="flat" iconBg="#8b5cf6" foot="Fully loaded / mo" />
      </div>

      <SectionHead title="Plans" sub="Enrollment and coverage by program" />
      <div className="grid g-3" style={{ marginBottom: 16 }}>
        {NU.benefitPlans.map(p => (
          <Card key={p.name} hover className="card--hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width:44, height:44, borderRadius:12, display:'grid', placeItems:'center', background:`color-mix(in srgb, ${p.color} 14%, transparent)`, color:p.color }}><Icon name={p.icon} size={22} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-1)' }}>{p.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>{p.provider}</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:6 }}>
              <span style={{ color:'var(--text-3)' }}>Enrolled</span>
              <span className="mono" style={{ fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap' }}>{p.enrolled.toLocaleString()} <span style={{ color:'var(--text-3)' }}>/ {p.total.toLocaleString()}</span></span>
            </div>
            <div className="progress"><div className="progress__fill" style={{ width:(p.enrolled/p.total*100)+'%', background:p.color }} /></div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, paddingTop:14, borderTop:'1px solid var(--border-soft)' }}>
              <div><div className="micro">Tier</div><div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-1)', marginTop:3 }}>{p.tier}</div></div>
              <div style={{ textAlign:'right' }}><div className="micro">Cost</div><div className="mono" style={{ fontSize:12.5, fontWeight:600, color:'var(--text-1)', marginTop:3 }}>{p.cost}</div></div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHead title="Open enrollment progress" sub="Spring 2026 window · closes May 15" action={<Badge variant="warn" dot>12 days left</Badge>} />
        <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
          <Ring value={94} size={92} thickness={10} label="94%" />
          <div style={{ flex:1, minWidth:240, display:'flex', flexDirection:'column', gap:12 }}>
            {[['Completed enrollment','1,186','var(--ok-fg)',94],['In progress','38','var(--warn-fg)',3],['Not started','24','var(--err-fg)',2]].map(([l,n,c,pct]) => (
              <div key={l}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}><span style={{ color:'var(--text-2)', fontWeight:600 }}>{l}</span><span className="mono" style={{ color:'var(--text-3)' }}>{n} · {pct}%</span></div>
                <div className="progress"><div className="progress__fill" style={{ width:pct+'%', background:c }} /></div>
              </div>
            ))}
          </div>
          <Button variant="ghost" icon="bell">Remind 62 employees</Button>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { BenefitsPage });
