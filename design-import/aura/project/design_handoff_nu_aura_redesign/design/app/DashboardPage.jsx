/* NU-AURA Aura — Dashboard */
const { useState: useStateD } = React;

function GreetHead({ onNav }) {
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  return (
    <div className="phead">
      <div>
        <h1 className="ptitle">{greet}, {NU.user.name.split(' ')[0]}</h1>
        <p className="psub">{today} · Here's what's moving across Acme Robotics today.</p>
      </div>
      <div className="pactions">
        <Button variant="ghost" icon="download">Export</Button>
        <Button variant="primary" icon="user-plus" onClick={() => onNav('employees')}>New Hire</Button>
      </div>
    </div>
  );
}

function DashboardPage({ onNav }) {
  const [range, setRange] = useStateD('12m');
  const totalAtt = NU.attendance.reduce((s,d)=>s+d.value,0);
  return (
    <div className="page">
      <GreetHead onNav={onNav} />

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon="users" label="Headcount" value="1,248" delta="4.2%" deltaDir="up" spark={NU.sparks.headcount} foot="+52 this quarter" />
        <Stat icon="fingerprint" label="Present today" value="1,104" delta="2 late" deltaDir="flat" spark={NU.sparks.present} sparkColor="var(--chart-3)" iconBg="#0ea5a3" foot="88.5% of workforce" />
        <Stat icon="palmtree" label="On leave" value="42" delta="3.4%" deltaDir="down" spark={NU.sparks.leave} sparkColor="var(--chart-4)" iconBg="#d97706" foot="9 pending requests" />
        <Stat icon="banknote" label="April payroll" value="$4.2M" delta="On track" deltaDir="up" spark={NU.sparks.payroll} sparkColor="var(--chart-5)" iconBg="#8b5cf6" foot="Runs Apr 30" />
      </div>

      <div className="grid g-31" style={{ marginBottom: 16 }}>
        <Card pad={false} style={{ padding: '18px 18px 8px' }}>
          <SectionHead title="Headcount growth" sub="Net employees over the last 12 months"
            action={<Segmented value={range} onChange={setRange} options={[{value:'3m',label:'3M'},{value:'6m',label:'6M'},{value:'12m',label:'12M'}]} />} />
          <AreaChart data={NU.headcountTrend.slice(range==='3m'?-3:range==='6m'?-6:0)} labels={NU.months.slice(range==='3m'?-3:range==='6m'?-6:0)} height={252} />
        </Card>
        <Card>
          <SectionHead title="Attendance" sub="Today, live" action={<Badge variant="ok" dot>Live</Badge>} />
          <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 14px' }}>
            <Donut data={NU.attendance} size={160} thickness={24} center={{ value: '88%', label: 'present' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NU.attendance.map(a => (
              <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
                <span className="dot-status" style={{ background: a.color }} />
                <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{a.label}</span>
                <span className="mono" style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--text-1)' }}>{a.value.toLocaleString()}</span>
                <span className="mono" style={{ color: 'var(--text-3)', width: 38, textAlign: 'right' }}>{Math.round(a.value/totalAtt*100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g-21">
        <Card pad={false}>
          <div style={{ padding: '18px 20px 6px' }}>
            <SectionHead title="Pending approvals" sub="Items waiting on you" action={<a className="link" onClick={() => onNav('inbox')}>View all <Icon name="arrow-right" size={14} /></a>} />
          </div>
          <div>
            {NU.approvals.slice(0,4).map((a, i) => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 20px', borderTop: i? '1px solid var(--border-soft)':'0' }}>
                <Avatar name={a.who} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{a.who} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· {a.role}</span></div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
                    <Badge variant="primary">{a.type}</Badge> <span style={{ marginLeft: 6 }}>{a.summary} · {a.when}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="ghost" size="sm">Decline</Button>
                  <Button variant="primary" size="sm" icon="check">Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHead title="Activity" action={<IconButton icon="more-horizontal" label="More" className="iconbtn" />} />
          <ul className="timeline" style={{ listStyle: 'none', margin: 0, padding: 0, paddingLeft: 26 }}>
            {NU.activity.map((a, i) => {
              const col = { ok:'var(--ok-fg)', primary:'var(--accent)', warn:'var(--warn-fg)', neutral:'var(--text-3)' }[a.kind];
              return (
                <li key={i} className="timeline__row">
                  <span className="timeline__node" style={{ background: col }}><Icon name={a.icon} size={10} /></span>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: a.text }} />
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{a.when}</div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardPage });
