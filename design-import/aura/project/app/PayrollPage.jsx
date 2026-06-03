/* NU-AURA Aura — Payroll */
const RUN_STEPS = [
  { label:'Inputs locked', done:true },
  { label:'Calculated', done:true },
  { label:'Review', done:false, current:true },
  { label:'Approved', done:false },
  { label:'Paid', done:false },
];

function PayrollPage() {
  const cur = NU.payrollRuns[0];
  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Payroll</h1>
          <p className="psub">April 2026 cycle is being processed · pays Apr 30</p>
        </div>
        <div className="pactions">
          <Button variant="ghost" icon="download">Export</Button>
          <Button variant="ghost" icon="settings-2">Configure</Button>
          <Button variant="primary" icon="play">Run Payroll</Button>
        </div>
      </div>

      {/* Current run banner */}
      <Card pad={false} style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface) 60%)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Badge variant="primary" dot>Processing</Badge>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{cur.id}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>{cur.period}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{cur.employees.toLocaleString()} employees · pay date {cur.pay}</div>
            </div>
            <Button variant="primary" size="lg" icon="shield-check">Review &amp; approve</Button>
          </div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 20 }}>
            <div><div className="micro">Gross</div><div className="mono" style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{cur.gross}</div></div>
            <div><div className="micro">Net pay</div><div className="mono" style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{cur.net}</div></div>
            <div><div className="micro">Taxes &amp; deductions</div><div className="mono" style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>$1,075,660</div></div>
          </div>
        </div>
        {/* pipeline */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)', gap: 0, flexWrap: 'wrap', rowGap: 12 }}>
          {RUN_STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: s.done ? 'var(--ok-fg)' : s.current ? 'var(--accent)' : 'var(--surface-sunken)',
                  color: (s.done || s.current) ? '#fff' : 'var(--text-3)',
                  boxShadow: s.current ? '0 0 0 4px var(--accent-soft)' : 'none' }}>
                  {s.done ? <Icon name="check" size={14} /> : <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{i+1}</span>}
                </span>
                <span style={{ fontSize: 13, fontWeight: s.current ? 700 : 500, color: s.done || s.current ? 'var(--text-1)' : 'var(--text-3)' }}>{s.label}</span>
              </div>
              {i < RUN_STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 14px', background: s.done ? 'var(--ok-fg)' : 'var(--border)', borderRadius: 2 }} />}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon="wallet" label="YTD gross" value="$16.4M" delta="3.1%" deltaDir="up" foot="Jan – Apr 2026" />
        <Stat icon="banknote" label="Avg cost / employee" value="$3,380" delta="1.4%" deltaDir="up" iconBg="#0ea5a3" foot="Monthly, fully loaded" />
        <Stat icon="percent" label="Effective tax rate" value="25.5%" delta="0.2%" deltaDir="flat" iconBg="#d97706" foot="Blended, all regions" />
        <Stat icon="users" label="On this run" value="1,248" delta="22 new" deltaDir="up" iconBg="#8b5cf6" foot="vs. March 1,226" />
      </div>

      <div className="grid g-21" style={{ marginBottom: 16 }}>
        <Card>
          <SectionHead title="Cost by department" sub="April 2026 gross, share of total" action={<a className="link">Breakdown <Icon name="arrow-right" size={14} /></a>} />
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Department</th><th style={{ textAlign:'right' }}>Headcount</th><th style={{ textAlign:'right' }}>Gross</th><th style={{ width: 200 }}>Share</th></tr></thead>
              <tbody>
                {NU.payrollByDept.map((d, i) => (
                  <tr key={d.dept}>
                    <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{d.dept}</td>
                    <td className="mono" style={{ textAlign:'right' }}>{d.headcount}</td>
                    <td className="mono" style={{ textAlign:'right', fontWeight: 600, color: 'var(--text-1)' }}>{d.gross}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="progress" style={{ flex:1 }}><div className="progress__fill" style={{ width:d.pct+'%', background: i===0?'var(--chart-1)':'var(--chart-2)' }} /></div>
                        <span className="mono" style={{ fontSize:12, color:'var(--text-3)', width:42, textAlign:'right' }}>{d.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionHead title="Pay composition" sub="Where the money goes" />
          <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 14px' }}>
            <Donut size={156} thickness={24} center={{ value:'74%', label:'net pay' }} data={[
              { label:'Net pay', value:3142880, color:'var(--chart-1)' },
              { label:'Taxes', value:712000, color:'var(--chart-4)' },
              { label:'Benefits', value:248000, color:'var(--chart-3)' },
              { label:'Deductions', value:115660, color:'var(--chart-5)' },
            ]} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[['Net pay','$3.14M','var(--chart-1)'],['Taxes','$712K','var(--chart-4)'],['Benefits','$248K','var(--chart-3)'],['Deductions','$116K','var(--chart-5)']].map(([l,v,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12.5 }}>
                <span className="dot-status" style={{ background:c }} />
                <span style={{ color:'var(--text-2)', fontWeight:500 }}>{l}</span>
                <span className="mono" style={{ marginLeft:'auto', fontWeight:600, color:'var(--text-1)' }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div style={{ padding: '18px 20px 0' }}>
          <SectionHead title="Run history" action={<Button variant="ghost" size="sm" icon="download">Export all</Button>} />
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Run</th><th>Period</th><th>Pay date</th><th style={{ textAlign:'right' }}>Employees</th><th style={{ textAlign:'right' }}>Gross</th><th style={{ textAlign:'right' }}>Net</th><th>Status</th><th style={{ width: 48 }}></th></tr></thead>
            <tbody>
              {NU.payrollRuns.map(r => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.id}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{r.period}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{r.pay}</td>
                  <td className="mono" style={{ textAlign:'right' }}>{r.employees.toLocaleString()}</td>
                  <td className="mono" style={{ textAlign:'right' }}>{r.gross}</td>
                  <td className="mono" style={{ textAlign:'right', fontWeight: 600, color: 'var(--text-1)' }}>{r.net}</td>
                  <td><StatusBadge value={r.status} /></td>
                  <td><IconButton icon="more-horizontal" label="Actions" className="iconbtn" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { PayrollPage });
