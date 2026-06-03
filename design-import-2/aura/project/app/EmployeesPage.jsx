/* NU-AURA Aura — Employees directory + profile slide-over */
const { useState: useStateE, useMemo: useMemoE } = React;

const DEPTS = ['All', 'Engineering', 'Sales', 'Design', 'Operations', 'Finance', 'People'];

function ProfileSheet({ emp, onClose }) {
  const [tab, setTab] = useStateE('overview');
  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const bg = NU.colorFor(emp.name);
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <aside className="sheet">
        <button className="sheet__close" onClick={onClose}><Icon name="x" size={18} /></button>
        <div className="sheet__scroll">
          {/* header */}
          <div style={{ padding: '28px 28px 20px', background: `linear-gradient(160deg, color-mix(in srgb, ${bg} 16%, var(--surface)), var(--surface) 70%)`, borderBottom: '1px solid var(--border)' }}>
            <Avatar name={emp.name} size={68} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: '16px 0 4px' }}>{emp.name}</h2>
            <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 12 }}>{emp.role} · {emp.dept}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge value={emp.status} />
              <Badge variant="neutral">{emp.type}</Badge>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{emp.id}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <Button variant="primary" size="sm" icon="message-square" onClick={() => window.nuToast('Message', { msg: `New message to ${emp.name}.`, type:'info' })}>Message</Button>
              <Button variant="ghost" size="sm" icon="pencil" onClick={() => window.nuToast('Edit profile', { msg: `Editing ${emp.name}'s profile.`, type:'info' })}>Edit</Button>
              <Button variant="ghost" size="sm" icon="more-horizontal" />
            </div>
          </div>
          {/* tabs */}
          <div style={{ padding: '0 28px' }}>
            <Tabs value={tab} onChange={setTab} tabs={[{id:'overview',label:'Overview'},{id:'documents',label:'Documents'},{id:'timeline',label:'Timeline'}]} />
          </div>
          {/* body */}
          <div style={{ padding: '20px 28px 40px' }}>
            {tab === 'overview' && <>
              <div className="micro" style={{ marginBottom: 4 }}>Contact</div>
              <div className="kv"><span className="kv__k">Email</span><span className="kv__v">{emp.email}</span></div>
              <div className="kv"><span className="kv__k">Phone</span><span className="kv__v mono">{emp.phone}</span></div>
              <div className="kv"><span className="kv__k">Location</span><span className="kv__v">{emp.loc}</span></div>
              <div className="micro" style={{ margin: '22px 0 4px' }}>Employment</div>
              <div className="kv"><span className="kv__k">Manager</span><span className="kv__v" style={{ display:'flex', alignItems:'center', gap:8 }}><Avatar name={emp.mgr} size={22} />{emp.mgr}</span></div>
              <div className="kv"><span className="kv__k">Department</span><span className="kv__v">{emp.dept}</span></div>
              <div className="kv"><span className="kv__k">Type</span><span className="kv__v">{emp.type}</span></div>
              <div className="kv"><span className="kv__k">Joined</span><span className="kv__v">{emp.joined}</span></div>
              <div className="kv"><span className="kv__k">Compensation</span><span className="kv__v mono">{emp.comp} / yr</span></div>
              <div className="micro" style={{ margin: '22px 0 10px' }}>Time off balance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NU.leaveBalances.slice(0,3).map(b => (
                  <div key={b.type}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
                      <span style={{ color:'var(--text-2)', fontWeight:600 }}>{b.type}</span>
                      <span className="mono" style={{ color:'var(--text-3)' }}>{b.total-b.used} / {b.total} d</span>
                    </div>
                    <div className="progress"><div className="progress__fill" style={{ width: ((b.total-b.used)/b.total*100)+'%', background:b.color }} /></div>
                  </div>
                ))}
              </div>
            </>}
            {tab === 'documents' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {['Offer letter.pdf','ID verification.pdf','Tax W-4.pdf','Equipment policy.pdf'].map(d => (
                  <div key={d} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:'1px solid var(--border)', borderRadius:'var(--r-md)' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'var(--accent-soft)', color:'var(--accent-text)', display:'grid', placeItems:'center' }}><Icon name="file-text" size={17} /></div>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{d}</span>
                    <IconButton icon="download" label="Download" />
                  </div>
                ))}
              </div>
            )}
            {tab === 'timeline' && (
              <ul className="timeline" style={{ listStyle:'none', margin:0, padding:0, paddingLeft:26 }}>
                {[{i:'user-plus',k:'ok',t:'Joined Acme Robotics',w:emp.joined},{i:'trending-up',k:'primary',t:'Promoted to '+emp.role,w:'Jan 2024'},{i:'award',k:'ok',t:'Peer recognition received',w:'Nov 2025'},{i:'palmtree',k:'warn',t:'Annual leave · 5 days',w:'Mar 2026'}].map((e,i)=>{
                  const col={ok:'var(--ok-fg)',primary:'var(--accent)',warn:'var(--warn-fg)'}[e.k];
                  return <li key={i} className="timeline__row"><span className="timeline__node" style={{background:col}}><Icon name={e.i} size={10}/></span><div style={{fontSize:13,color:'var(--text-2)',fontWeight:500}}>{e.t}</div><div style={{fontSize:11.5,color:'var(--text-3)',marginTop:3}}>{e.w}</div></li>;
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function EmployeesPage() {
  const [dept, setDept] = useStateE('All');
  const [q, setQ] = useStateE('');
  const [sel, setSel] = useStateE(new Set());
  const [open, setOpen] = useStateE(null);

  const rows = useMemoE(() => NU.employees.filter(e =>
    (dept === 'All' || e.dept === dept) &&
    (q === '' || (e.name + e.email + e.role).toLowerCase().includes(q.toLowerCase()))
  ), [dept, q]);

  const allSel = rows.length > 0 && rows.every(r => sel.has(r.id));
  function toggle(id) { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); }
  function toggleAll() { setSel(allSel ? new Set() : new Set(rows.map(r => r.id))); }

  const deptCounts = {}; NU.employees.forEach(e => { deptCounts[e.dept] = (deptCounts[e.dept]||0)+1; });

  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Employees</h1>
          <p className="psub">{NU.employees.length.toLocaleString()} people across 6 departments · 4 locations</p>
        </div>
        <div className="pactions">
          <Button variant="ghost" icon="sliders-horizontal">Filters</Button>
          <Button variant="ghost" icon="download">Export</Button>
          <Button variant="primary" icon="user-plus" onClick={() => window.nuToast('New employee', { msg: 'Opening the add-employee form…', type:'info' })}>Add Employee</Button>
        </div>
      </div>

      <Card pad={false}>
        {sel.size > 0 ? (
          <div className="bulkbar">
            <span className="bulkbar__count">{sel.size} selected</span>
            <span className="bulkbar__sep" />
            <button className="btn btn--ghostdark btn--sm" onClick={() => { window.nuToast('Message sent', { msg: `Message drafted to ${sel.size} ${sel.size===1?'person':'people'}.`, type:'ok' }); }}><Icon name="mail" size={14} />Message</button>
            <button className="btn btn--ghostdark btn--sm" onClick={() => { window.nuToast('Moved to new team', { msg: `${sel.size} ${sel.size===1?'employee':'employees'} reassigned.`, type:'ok' }); setSel(new Set()); }}><Icon name="folder-input" size={14} />Move team</button>
            <button className="btn btn--ghostdark btn--sm" onClick={() => { window.nuToast('Export started', { msg: `Preparing CSV for ${sel.size} ${sel.size===1?'record':'records'}…`, type:'info' }); }}><Icon name="download" size={14} />Export</button>
            <button className="btn btn--ghostdark btn--sm" onClick={() => { window.nuToast('Offboarding initiated', { msg: `${sel.size} ${sel.size===1?'employee':'employees'} queued for offboarding.`, type:'warn' }); setSel(new Set()); }}><Icon name="user-x" size={14} />Offboard</button>
            <button className="bulkbar__x" onClick={() => setSel(new Set())}><Icon name="x" size={16} /></button>
          </div>
        ) : (
          <div className="toolbar">
            <div className="search" style={{ width: 260 }}>
              <Icon name="search" size={16} />
              <input placeholder="Search name, role, email…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="chips">
              {DEPTS.map(d => (
                <button key={d} className={`chip ${dept === d ? 'is-active' : ''}`} onClick={() => setDept(d)}>
                  {d}{d !== 'All' && <span className="chip__n">{deptCounts[d]||0}</span>}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" icon="arrow-up-down">Sort</Button>
            </div>
          </div>
        )}

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 44 }}><Check on={allSel} onClick={toggleAll} /></th>
                <th>Employee</th>
                <th className="sortable">Role</th>
                <th className="sortable">Department</th>
                <th>Location</th>
                <th className="sortable">Joined</th>
                <th>Status</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.id} className={sel.has(e.id) ? 'is-selected' : ''} onClick={() => setOpen(e)} style={{ cursor: 'pointer' }}>
                  <td onClick={ev => { ev.stopPropagation(); toggle(e.id); }}><Check on={sel.has(e.id)} onClick={() => {}} /></td>
                  <td>
                    <div className="cell-user">
                      <Avatar name={e.name} size={38} />
                      <div>
                        <div className="cell-user__name">{e.name}</div>
                        <div className="cell-user__sub">{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{e.role}</td>
                  <td>{e.dept}</td>
                  <td>{e.loc}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{e.joined}</td>
                  <td><StatusBadge value={e.status} /></td>
                  <td onClick={ev => ev.stopPropagation()}><IconButton icon="more-horizontal" label="Actions" className="iconbtn" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tbl-foot">
          <span>Showing <b style={{ color: 'var(--text-1)' }}>{rows.length}</b> of {NU.employees.length} employees</span>
          <div className="pager">
            <button><Icon name="chevron-left" size={15} /></button>
            <button className="is-active">1</button>
            <button>2</button>
            <button>3</button>
            <button><Icon name="chevron-right" size={15} /></button>
          </div>
        </div>
      </Card>

      {open && <ProfileSheet emp={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

Object.assign(window, { EmployeesPage });
