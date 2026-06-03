/* NU-AURA Aura — Reports */
const { useState: useStateR } = React;

const SCHEDULED = [
  { name:'Monthly headcount', freq:'Monthly · 1st', owner:'Fayaz Ahmed', next:'Jun 1', fmt:'PDF' },
  { name:'Payroll reconciliation', freq:'Monthly · 28th', owner:'Mei Lin', next:'Jun 28', fmt:'XLSX' },
  { name:'Attrition watch', freq:'Weekly · Mon', owner:'Aisha Bello', next:'Jun 9', fmt:'PDF' },
  { name:'Comp benchmarking', freq:'Quarterly', owner:'Robert Cole', next:'Jul 1', fmt:'XLSX' },
];

function ReportsPage() {
  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Reports</h1>
          <p className="psub">Analytics across people, payroll and operations · 6 saved · 4 scheduled</p>
        </div>
        <div className="pactions">
          <Button variant="ghost" icon="calendar-clock">Schedule</Button>
          <Button variant="primary" icon="plus">New Report</Button>
        </div>
      </div>

      <SectionHead title="Saved reports" sub="Click to open the full analysis" />
      <div className="grid g-3" style={{ marginBottom: 16 }}>
        {NU.reports.map(r => (
          <Card key={r.name} hover className="card--hover">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ width:38, height:38, borderRadius:10, display:'grid', placeItems:'center', background:`color-mix(in srgb, ${r.color} 14%, transparent)`, color:r.color }}><Icon name={r.icon} size={19} /></div>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--text-1)' }}>{r.name}</div>
                  <Badge variant="neutral">{r.cat}</Badge>
                </div>
              </div>
              <IconButton icon="more-horizontal" label="Actions" className="iconbtn" />
            </div>
            <div style={{ height: 52 }}><Sparkline data={r.spark} color={r.color} height={52} /></div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border-soft)' }}>
              <span style={{ fontSize:11.5, color:'var(--text-3)' }}>Updated {r.run}</span>
              <a className="link">Open <Icon name="arrow-right" size={14} /></a>
            </div>
          </Card>
        ))}
      </div>

      <Card pad={false}>
        <div style={{ padding:'18px 20px 0' }}>
          <SectionHead title="Scheduled deliveries" sub="Auto-generated and emailed to owners" action={<Button variant="ghost" size="sm" icon="plus">Add schedule</Button>} />
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Report</th><th>Frequency</th><th>Owner</th><th>Next run</th><th>Format</th><th style={{ width:48 }}></th></tr></thead>
            <tbody>
              {SCHEDULED.map(s => (
                <tr key={s.name}>
                  <td style={{ fontWeight:600, color:'var(--text-1)' }}>{s.name}</td>
                  <td>{s.freq}</td>
                  <td><div className="cell-user"><Avatar name={s.owner} size={26} /><span style={{ fontWeight:500, color:'var(--text-1)' }}>{s.owner}</span></div></td>
                  <td className="mono" style={{ fontSize:12.5 }}>{s.next}</td>
                  <td><Badge variant="primary">{s.fmt}</Badge></td>
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

Object.assign(window, { ReportsPage });
