/* NU-AURA Aura — Assets */
const { useState: useStateAs } = React;

const ASSET_CATS = ['All','Laptop','Monitor','Phone','Tablet','Peripheral'];
const ASSET_STATUS = { Assigned:'ok', Available:'neutral', 'In repair':'warn', Retired:'err' };

function AssetsPage() {
  const [cat, setCat] = useStateAs('All');
  const rows = NU.assets.filter(a => cat === 'All' || a.cat === cat);
  return (
    <div className="page">
      <div className="phead">
        <div>
          <h1 className="ptitle">Assets</h1>
          <p className="psub">1,284 tracked assets · 96% assigned · $2.1M book value</p>
        </div>
        <div className="pactions">
          <Button variant="ghost" icon="download">Export</Button>
          <Button variant="primary" icon="plus">Assign Asset</Button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon="package" label="Total assets" value="1,284" delta="2.4%" deltaDir="up" foot="Across 4 locations" />
        <Stat icon="user-check" label="Assigned" value="1,232" delta="96%" deltaDir="up" iconBg="#0ea5a3" foot="of all inventory" />
        <Stat icon="box" label="Available" value="38" delta="14 reserved" deltaDir="flat" iconBg="#d97706" foot="Ready to deploy" />
        <Stat icon="wrench" label="In repair" value="14" delta="3 overdue" deltaDir="down" iconBg="#8b5cf6" foot="Avg 6-day turnaround" />
      </div>

      <div className="grid g-31">
        <Card pad={false} style={{ alignSelf: 'flex-start' }}>
          <div className="toolbar">
            <div className="chips">
              {ASSET_CATS.map(c => <button key={c} className={`chip ${cat===c?'is-active':''}`} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <div className="search" style={{ marginLeft: 'auto', width: 200 }}><Icon name="search" size={16} /><input placeholder="Search serial, name…" /></div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Asset</th><th>Serial</th><th>Assigned to</th><th>Location</th><th>Status</th><th>Purchased</th></tr></thead>
              <tbody>
                {rows.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-user">
                        <div style={{ width:36, height:36, borderRadius:9, background:'var(--accent-soft)', color:'var(--accent-text)', display:'grid', placeItems:'center', flexShrink:0 }}><Icon name={a.icon} size={18} /></div>
                        <div><div className="cell-user__name">{a.name}</div><div className="cell-user__sub mono">{a.id}</div></div>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{a.serial}</td>
                    <td>{a.assignee === '—' ? <span style={{ color:'var(--text-3)' }}>Unassigned</span> : <div className="cell-user"><Avatar name={a.assignee} size={26} /><span style={{ fontWeight:500, color:'var(--text-1)' }}>{a.assignee}</span></div>}</td>
                    <td>{a.loc}</td>
                    <td><Badge variant={ASSET_STATUS[a.status]} dot>{a.status}</Badge></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{a.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionHead title="By category" sub="Inventory mix" />
          <BarsH data={NU.assetCats} />
          <hr className="divider" style={{ margin: '18px 0' }} />
          <SectionHead title="Lifecycle" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Healthy','78%','var(--ok-fg)'],['Aging (3y+)','16%','var(--warn-fg)'],['End of life','6%','var(--err-fg)']].map(([l,v,c]) => (
              <div key={l}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}><span style={{ color:'var(--text-2)', fontWeight:600 }}>{l}</span><span className="mono" style={{ color:'var(--text-3)' }}>{v}</span></div>
                <div className="progress"><div className="progress__fill" style={{ width:v, background:c }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { AssetsPage });
