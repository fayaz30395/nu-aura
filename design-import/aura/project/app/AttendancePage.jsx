/* NU-AURA Aura — Attendance & Leave */
const { useState: useStateAt } = React;

const ATT_STATUS = {
  P: { c:'var(--chart-1)', label:'Present' },
  R: { c:'var(--chart-3)', label:'Remote' },
  L: { c:'var(--chart-4)', label:'Leave' },
  A: { c:'var(--chart-5)', label:'Absent' },
  O: { c:'var(--border)', label:'Off' },
};
const WEEK = [
  { name:'Priya Nair', days:['P','P','R','P','P'], in:'09:02', hrs:'8.4' },
  { name:'James Okafor', days:['P','P','P','P','L'], in:'08:48', hrs:'8.1' },
  { name:'Sana Rahman', days:['L','L','P','P','P'], in:'09:14', hrs:'7.9' },
  { name:'Diego Santos', days:['R','R','R','P','P'], in:'08:30', hrs:'8.6' },
  { name:'Mei Lin', days:['P','P','P','R','P'], in:'09:05', hrs:'8.2' },
  { name:'Tomas Becker', days:['P','P','P','P','P'], in:'08:22', hrs:'9.0' },
  { name:'Noah Bennett', days:['P','A','P','P','R'], in:'09:30', hrs:'7.6' },
];
const DAYNAMES = ['Mon','Tue','Wed','Thu','Fri'];

// leave calendar events (May 2026, starts Friday)
const LEAVE_EVENTS = {
  1:[{n:'Sana Rahman',t:'L'}], 2:[{n:'Sana Rahman',t:'L'}],
  5:[{n:'Priya Nair',t:'L'}], 6:[{n:'Priya Nair',t:'L'}], 7:[{n:'Priya Nair',t:'L'},{n:'Hana Kim',t:'R'}], 8:[{n:'Priya Nair',t:'L'}], 9:[{n:'Priya Nair',t:'L'}],
  14:[{n:'James Okafor',t:'L'}], 15:[{n:'James Okafor',t:'L'}],
  20:[{n:'Omar Haddad',t:'L'}], 21:[{n:'Carlos Vega',t:'R'}], 26:[{n:'Mei Lin',t:'L'},{n:'Elena Rossi',t:'L'}],
};

function AttToggle({ view, setView }) {
  return <Segmented value={view} onChange={setView} options={[{value:'attendance',label:'Attendance',icon:'fingerprint'},{value:'leave',label:'Leave',icon:'palmtree'}]} />;
}

function AttendanceView() {
  return (
    <>
      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon="user-check" label="Present today" value="1,104" delta="88.5%" deltaDir="up" foot="of 1,248 employees" />
        <Stat icon="clock" label="Avg check-in" value="09:04" delta="On time" deltaDir="flat" iconBg="#0ea5a3" foot="Target 09:15" />
        <Stat icon="timer" label="Avg hours / day" value="8.3h" delta="1.2%" deltaDir="up" iconBg="#d97706" foot="This week" />
        <Stat icon="moon" label="Overtime logged" value="214h" delta="6.0%" deltaDir="down" iconBg="#8b5cf6" foot="42 employees" />
      </div>

      <Card pad={false} style={{ marginBottom: 16 }}>
        <div style={{ padding: '18px 20px 0' }}>
          <SectionHead title="Team attendance" sub="This week · May 4 – May 8"
            action={<div style={{ display:'flex', gap:14, alignItems:'center' }}>{Object.entries(ATT_STATUS).filter(([k])=>k!=='O').map(([k,v])=>(<span key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--text-3)' }}><span className="dot-status" style={{ background:v.c }} />{v.label}</span>))}</div>} />
        </div>
        <div style={{ overflowX: 'auto', padding: '4px 8px 12px' }}>
          <table className="tbl heat">
            <thead><tr><th style={{ paddingLeft: 12 }}>Employee</th>{DAYNAMES.map(d => <th key={d} style={{ textAlign:'center' }}>{d}</th>)}<th style={{ textAlign:'center' }}>Check-in</th><th style={{ textAlign:'center' }}>Avg hrs</th></tr></thead>
            <tbody>
              {WEEK.map(w => (
                <tr key={w.name}>
                  <td style={{ paddingLeft: 12 }}><div className="cell-user"><Avatar name={w.name} size={32} /><span className="cell-user__name">{w.name}</span></div></td>
                  {w.days.map((d, i) => (
                    <td key={i} style={{ textAlign:'center' }}>
                      <span className="heatcell" style={{ background: `color-mix(in srgb, ${ATT_STATUS[d].c} ${d==='O'?100:18}%, transparent)`, color: ATT_STATUS[d].c, borderColor: `color-mix(in srgb, ${ATT_STATUS[d].c} 36%, transparent)` }} title={ATT_STATUS[d].label}>{d}</span>
                    </td>
                  ))}
                  <td className="mono" style={{ textAlign:'center', fontSize:12.5 }}>{w.in}</td>
                  <td className="mono" style={{ textAlign:'center', fontSize:12.5, fontWeight:600, color:'var(--text-1)' }}>{w.hrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function LeaveView() {
  // build May 2026 grid; May 1 2026 is a Friday → offset 4 (Mon=0)
  const offset = 4, daysIn = 31;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  return (
    <div className="g-12 grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SectionHead title="My balance" sub="Resets Jan 2027" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {NU.leaveBalances.map(b => (
              <div key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Ring value={(b.total-b.used)/b.total*100} size={52} thickness={6} color={b.color} label={`${b.total-b.used}`} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{b.type}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{b.used} used · {b.total} total</div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="primary" size="sm" icon="calendar-plus" className="btn--block" style={{ marginTop: 18 }}>Request time off</Button>
        </Card>
        <Card>
          <SectionHead title="Pending requests" action={<Badge variant="warn">3</Badge>} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {NU.approvals.filter(a=>a.type==='Leave').map((a,i) => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 0', borderTop: i?'1px solid var(--border-soft)':'0' }}>
                <Avatar name={a.who} size={32} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{a.who}</div>
                  <div style={{ fontSize:11.5, color:'var(--text-3)' }}>{a.summary}</div>
                </div>
                <Badge variant="warn" dot>Pending</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHead title="May 2026" sub="Team time off & remote days"
          action={<div style={{ display:'flex', gap:6 }}><IconButton icon="chevron-left" label="Prev" className="iconbtn" /><IconButton icon="chevron-right" label="Next" className="iconbtn" /></div>} />
        <div className="cal">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="cal__dow">{d}</div>)}
          {cells.map((d, i) => {
            const ev = d && LEAVE_EVENTS[d];
            const weekend = d && ((i % 7) >= 5);
            return (
              <div key={i} className={`cal__cell ${!d ? 'is-empty' : ''} ${weekend ? 'is-weekend' : ''}`}>
                {d && <span className="cal__num">{d}</span>}
                {ev && <div className="cal__events">
                  {ev.slice(0,3).map((e, j) => (
                    <span key={j} className="cal__ev" style={{ background:`color-mix(in srgb, ${ATT_STATUS[e.t].c} 16%, transparent)`, color:ATT_STATUS[e.t].c }}>
                      <span className="dot-status" style={{ background:ATT_STATUS[e.t].c, width:5, height:5 }} />{e.n.split(' ')[0]}
                    </span>
                  ))}
                </div>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function AttendancePage({ tab }) {
  const [view, setView] = useStateAt(tab === 'leave' ? 'leave' : 'attendance');
  React.useEffect(() => { setView(tab === 'leave' ? 'leave' : 'attendance'); }, [tab]);
  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">{view === 'leave' ? 'Leave' : 'Attendance'}</h1>
          <p className="psub">{view === 'leave' ? 'Balances, requests and the team time-off calendar.' : 'Live attendance, check-ins and weekly patterns.'}</p>
        </div>
        <div className="pactions">
          <AttToggle view={view} setView={setView} />
          <Button variant="ghost" icon="download">Export</Button>
        </div>
      </div>
      {view === 'leave' ? <LeaveView /> : <AttendanceView />}
    </div>
  );
}

Object.assign(window, { AttendancePage });
