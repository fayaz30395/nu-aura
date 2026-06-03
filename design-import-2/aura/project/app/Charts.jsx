/* NU-AURA Aura — SVG chart primitives */
const { useState: useStateC, useId: useIdC } = React;

// ── Sparkline ──
function Sparkline({ data, color = 'var(--accent)', height = 34, fill = true }) {
  const w = 120, h = height, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (d - min) / rng) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${pts[pts.length-1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`;
  const gid = useIdC();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={'sg'+gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#sg${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Area chart with axis + hover ──
function AreaChart({ data, labels, height = 260, color = 'var(--chart-1)' }) {
  const [hover, setHover] = useStateC(null);
  const w = 720, h = height, padL = 44, padR = 16, padT = 16, padB = 30;
  const iw = w - padL - padR, ih = h - padT - padB;
  const min = Math.min(...data) * 0.985, max = Math.max(...data) * 1.01;
  const rng = max - min || 1;
  const X = i => padL + (i / (data.length - 1)) * iw;
  const Y = v => padT + (1 - (v - min) / rng) * ih;
  const pts = data.map((d, i) => [X(i), Y(d)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${X(data.length-1).toFixed(1)} ${padT+ih} L ${padL} ${padT+ih} Z`;
  const gid = useIdC();
  const ticks = 4;
  const gridVals = Array.from({length: ticks+1}, (_,i) => min + (rng) * i / ticks);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * w;
        const i = Math.round(((x - padL) / iw) * (data.length - 1));
        if (i >= 0 && i < data.length) setHover(i);
      }}>
      <defs>
        <linearGradient id={'ag'+gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={Y(v)} x2={w-padR} y2={Y(v)} stroke="var(--chart-grid)" strokeWidth="1" />
          <text x={padL-10} y={Y(v)+3.5} textAnchor="end" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--chart-axis)">{Math.round(v).toLocaleString()}</text>
        </g>
      ))}
      <path d={area} fill={`url(#ag${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {labels.map((l, i) => (i % 2 === 0 || i === labels.length-1) && (
        <text key={i} x={X(i)} y={h-9} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-body)" fill="var(--chart-axis)">{l}</text>
      ))}
      {hover != null && (
        <g>
          <line x1={X(hover)} y1={padT} x2={X(hover)} y2={padT+ih} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <circle cx={X(hover)} cy={Y(data[hover])} r="5" fill={color} stroke="var(--surface)" strokeWidth="2.5" />
          <g transform={`translate(${Math.min(Math.max(X(hover), padL+44), w-padR-44)}, ${Y(data[hover])-34})`}>
            <rect x="-42" y="-16" width="84" height="30" rx="7" fill="var(--text-1)" />
            <text x="0" y="-3" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--surface)">{data[hover].toLocaleString()}</text>
            <text x="0" y="9" textAnchor="middle" fontSize="8.5" fill="var(--chart-axis)">{labels[hover]} 2026</text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ── Donut ──
function Donut({ data, size = 150, thickness = 22, center }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2, c = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * circ;
        const el = (
          <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${c} ${c})`} strokeLinecap="butt" />
        );
        acc += frac;
        return el;
      })}
      {center && (
        <text x={c} y={c-2} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="var(--font-display)" fill="var(--text-1)">{center.value}</text>
      )}
      {center && (
        <text x={c} y={c+15} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-body)" fill="var(--text-3)">{center.label}</text>
      )}
    </svg>
  );
}

// ── Horizontal bars ──
function BarsH({ data, color = 'var(--chart-2)' }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{d.value}</span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <div className="progress__fill" style={{ width: (d.value / max * 100) + '%', background: i === 0 ? 'var(--chart-1)' : color, animationDelay: (i*60)+'ms' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Progress ring ──
function Ring({ value, size = 54, thickness = 6, color = 'var(--accent)', label }) {
  const r = (size - thickness) / 2, c = size / 2, circ = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
        strokeDasharray={`${value/100*circ} ${circ}`} transform={`rotate(-90 ${c} ${c})`} />
      {label && <text x={c} y={c+4} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--text-1)">{label}</text>}
    </svg>
  );
}

Object.assign(window, { Sparkline, AreaChart, Donut, BarsH, Ring });
