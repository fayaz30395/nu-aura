/* NU-AURA Aura — Approvals inbox (split master-detail) */
const { useState: useStateA } = React;

const TYPE_ICON = { Leave:'palmtree', Expense:'receipt', Offer:'file-signature', Asset:'package' };

function ApprovalsPage() {
  const [tab, setTab] = useStateA('all');
  const [sel, setSel] = useStateA(NU.approvals[0].id);
  const [done, setDone] = useStateA({}); // id -> 'approved'|'declined'

  const types = ['all','Leave','Expense','Offer','Asset'];
  const counts = {}; NU.approvals.forEach(a => counts[a.type] = (counts[a.type]||0)+1);
  const list = NU.approvals.filter(a => tab === 'all' || a.type === tab);
  const cur = NU.approvals.find(a => a.id === sel) || list[0];

  function act(id, v) { setDone(d => ({ ...d, [id]: v })); }

  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Approvals</h1>
          <p className="psub">{NU.approvals.length} requests awaiting your decision · oldest 5h ago</p>
        </div>
        <div className="pactions">
          <Button variant="ghost" icon="check-check">Approve all leave</Button>
          <Button variant="ghost" icon="sliders-horizontal">Filters</Button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs value={tab} onChange={t => { setTab(t); }} tabs={[
          { id:'all', label:'All', count: NU.approvals.length },
          { id:'Leave', label:'Leave', count: counts.Leave },
          { id:'Expense', label:'Expense', count: counts.Expense },
          { id:'Offer', label:'Offers', count: counts.Offer },
          { id:'Asset', label:'Assets', count: counts.Asset },
        ]} />
      </div>

      <div className="g-12 grid">
        {/* list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(a => {
            const st = done[a.id];
            return (
              <button key={a.id} onClick={() => setSel(a.id)}
                className="card card--hover" style={{ padding: 14, textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start',
                  borderColor: sel === a.id ? 'var(--accent)' : undefined, boxShadow: sel === a.id ? '0 0 0 1px var(--accent), var(--sh-sm)' : undefined, opacity: st ? 0.6 : 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  <Icon name={TYPE_ICON[a.type]} size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{a.who}</span>
                    {a.priority === 'High' && <Badge variant="err">High</Badge>}
                    <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{a.when}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.summary}</div>
                  <div style={{ marginTop: 8 }}>
                    {st ? <Badge variant={st === 'approved' ? 'ok' : 'err'} dot>{st === 'approved' ? 'Approved' : 'Declined'}</Badge>
                       : <Badge variant="neutral">{a.type} · {a.id}</Badge>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* detail */}
        {cur && (
          <Card pad={false} style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={cur.who} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>{cur.who}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{cur.role} · {cur.dept}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge variant="primary" dot>{cur.type}</Badge>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>{cur.id}</div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 className="sec-title">Request details</h3>
                <Badge variant={cur.priority === 'High' ? 'err' : cur.priority === 'Low' ? 'neutral' : 'warn'}>{cur.priority} priority</Badge>
              </div>
              <div>
                {Object.entries(cur.detail).map(([k, v]) => (
                  <div className="kv" key={k}><span className="kv__k">{k}</span><span className="kv__v">{v}</span></div>
                ))}
              </div>

              <div className="micro" style={{ margin: '22px 0 12px' }}>Approval chain</div>
              <div className="timeline" style={{ paddingLeft: 26 }}>
                <div className="timeline__row"><span className="timeline__node" style={{ background: 'var(--ok-fg)' }}><Icon name="check" size={10} /></span><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{cur.who} submitted</div><div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{cur.when}</div></div>
                <div className="timeline__row"><span className="timeline__node" style={{ background: 'var(--ok-fg)' }}><Icon name="check" size={10} /></span><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Manager endorsed</div><div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Auto-routed</div></div>
                <div className="timeline__row"><span className="timeline__node" style={{ background: 'var(--accent)' }}><Icon name="clock" size={10} /></span><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Your approval <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· pending</span></div></div>
              </div>

              <div style={{ marginTop: 22 }}>
                <textarea className="input" rows="2" placeholder="Add a note (optional)…" style={{ resize: 'none' }} />
              </div>

              {done[cur.id] ? (
                <div style={{ marginTop: 16 }}>
                  <Badge variant={done[cur.id] === 'approved' ? 'ok' : 'err'} dot>Request {done[cur.id]}</Badge>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <Button variant="ok" size="md" icon="check" className="btn--block" onClick={() => act(cur.id, 'approved')}>Approve</Button>
                  <Button variant="danger" size="md" icon="x" className="btn--block" onClick={() => act(cur.id, 'declined')}>Decline</Button>
                  <Button variant="ghost" size="md" icon="corner-up-right">Delegate</Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ApprovalsPage });
