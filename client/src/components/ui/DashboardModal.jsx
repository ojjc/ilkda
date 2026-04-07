import { useEffect, useMemo } from 'react'
import { TYPE_META, STATUS_META, MEDIA_TYPES } from '@/lib/constants'
import styles from './DashboardModal.module.css'

// dashboard modal when a statcell is clicked

function fmtScore(raw) {
  if (!raw || raw === '—') return '—'
  const n = Number(raw)
  return isNaN(n) ? '—' : (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1))
}

function useEscClose(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

// subcharts 

/** donut charge for entry status breakdown */
function DonutChart({ entries }) {
  const STATUS_ORDER = ['completed', 'in-progress', 'planning', 'on-hold', 'dropped']
  const total = entries.length
  const slices = STATUS_ORDER.map((s) => ({
    key: s,
    label: STATUS_META[s]?.label ?? s,
    color: STATUS_META[s]?.color ?? 'var(--muted)',
    count: entries.filter((e) => e.status === s).length,
  })).filter((s) => s.count > 0)

  const R = 54, CX = 70, CY = 70, STROKE = 18
  const circumference = 2 * Math.PI * R
  let offset = 0

  const arcs = slices.map((s) => {
    const pct  = s.count / total
    const dash = pct * circumference
    const arc  = { ...s, pct, dash, offset }
    offset += dash
    return arc
  })

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donutSvg}>
        {/* background ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeDashoffset={-arc.offset + circumference * 0.25}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        ))}
        {/* center label */}
        <text x={CX} y={CY - 6} textAnchor="middle" className={styles.donutBig}>{total}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" className={styles.donutSub}>total</text>
      </svg>
      <div className={styles.donutLegend}>
        {arcs.map((arc) => (
          <div key={arc.key} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: arc.color }} />
            <span className={styles.legendLabel}>{arc.label}</span>
            <span className={styles.legendVal}>{arc.count}</span>
            <span className={styles.legendPct}>{Math.round(arc.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** horizontal bar chart for category breakdown */
function CategoryBars({ entries }) {
  const rows = MEDIA_TYPES.map((t) => ({
    type: t,
    label: TYPE_META[t].label,
    emoji: TYPE_META[t].emoji,
    color: TYPE_META[t].color,
    count: entries.filter((e) => e.type === t).length,
  })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count)

  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className={styles.catBars}>
      {rows.map((r) => (
        <div key={r.type} className={styles.catRow}>
          <span className={styles.catEmoji}>{r.emoji}</span>
          <span className={styles.catLabel}>{r.label}</span>
          <div className={styles.catTrack}>
            <div
              className={styles.catFill}
              style={{ width: `${(r.count / max) * 100}%`, background: r.color }}
            />
          </div>
          <span className={styles.catCount}>{r.count}</span>
        </div>
      ))}
    </div>
  )
}

/** score distribution - vertical bar chart, bins 1-10 */
function ScoreHistogram({ entries }) {
  const scored = entries.filter((e) => e.score > 0)
  if (scored.length === 0) {
    return <div className={styles.empty}>No scored entries yet.</div>
  }

  const bins = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    label: ((i + 1) / 2).toFixed((i + 1) % 2 === 0 ? 0 : 1),
    count: scored.filter((e) => e.score === i + 1).length,
  }))
  const maxBin = Math.max(1, ...bins.map((b) => b.count))

  return (
    <div className={styles.histogram}>
      {bins.map((b) => (
        <div key={b.score} className={styles.histCol}>
          <span className={styles.histCount}>{b.count > 0 ? b.count : ''}</span>
          <div className={styles.histTrack}>
            <div
              className={styles.histFill}
              style={{ height: `${(b.count / maxBin) * 100}%` }}
            />
          </div>
          <span className={styles.histLabel}>{b.label}</span>
        </div>
      ))}
    </div>
  )
}

/** monthly activity - tracking entries added per month in a 12-month time period */
function ActivityChart({ entries }) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      year:  d.getFullYear(),
      month: d.getMonth(),
      count: 0,
    }
  })

  entries.forEach((e) => {
    const d = new Date(e.createdAt)
    const m = months.find((mo) => mo.year === d.getFullYear() && mo.month === d.getMonth())
    if (m) m.count++
  })

  const maxCount = Math.max(1, ...months.map((m) => m.count))

  // svg line chart
  // wtf it works
  const W = 460, H = 80, PAD = { t: 8, b: 24, l: 8, r: 8 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const stepX  = innerW / (months.length - 1)

  const pts = months.map((m, i) => ({
    x: PAD.l + i * stepX,
    y: PAD.t + innerH - (m.count / maxCount) * innerH,
    ...m,
  }))

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = [
    `${pts[0].x},${PAD.t + innerH}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${PAD.t + innerH}`,
  ].join(' ')

  return (
    <div className={styles.activityWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.activitySvg} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--note)" stopOpacity="0.25" />

            <stop offset="100%" stopColor="var(--note)" stopOpacity="0"    />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#areaGrad)" />
        <polyline points={polyline} fill="none" stroke="var(--note)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p) => p.count > 0 && (
          <circle key={p.key} cx={p.x} cy={p.y} r="2.5" fill="var(--note)" />
        ))}
      </svg>
      <div className={styles.activityLabels}>
        {months.map((m) => (
          <span key={m.key} className={styles.activityLabel}>{m.label}</span>
        ))}
      </div>
    </div>
  )
}

/** top scoring entry list */
function TopScored({ entries }) {
  const top = [...entries]
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)

  if (top.length === 0) return <div className={styles.empty}>No scored entries yet.</div>

  return (
    <div className={styles.topList}>
      {top.map((e, i) => {
        const tm = TYPE_META[e.type] || { color: 'var(--muted)', emoji: '◌', label: e.type }
        const score = (e.score / 2).toFixed(e.score % 2 === 0 ? 0 : 1)
        return (
          <div key={e.id} className={styles.topRow}>
            <span className={styles.topRank}>#{i + 1}</span>
            {e.image ? <img className={styles.topThumb} src={e.image} alt="" /> : <div className={styles.topThumbPh}>{tm.emoji}</div>}
            <div className={styles.topInfo}>
              <span className={styles.topTitle}>{e.title}</span>
              <span className={styles.topType} style={{ color: tm.color }}>{tm.label}</span>
            </div>
            <span className={styles.topScore}>
              {score} ★
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** completion rate per category */
function CompletionRates({ entries }) {
  const rows = MEDIA_TYPES.map((t) => {
    const sub = entries.filter((e) => e.type === t)
    const done = sub.filter((e) => e.status === 'completed').length
    const pct = sub.length > 0 ? Math.round((done / sub.length) * 100) : null
    return { type: t, label: TYPE_META[t].label, emoji: TYPE_META[t].emoji, color: TYPE_META[t].color, total: sub.length, done, pct }
  }).filter((r) => r.total > 0).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

  if (rows.length === 0) return <div className={styles.empty}>No entries yet.</div>

  return (
    <div className={styles.compRates}>
      {rows.map((r) => (
        <div key={r.type} className={styles.compRow}>
          <span className={styles.catEmoji}>{r.emoji}</span>
          <span className={styles.catLabel}>{r.label}</span>
          <div className={styles.catTrack}>
            <div className={styles.catFill} style={{ width: `${r.pct}%`, background: r.color }} />
          </div>
          <span className={styles.compPct}>{r.pct}%</span>
        </div>
      ))}
    </div>
  )
}

// main model

export function DashboardModal({ entries, scopeLabel, onClose }) {
  useEscClose(onClose)

  const scored = entries.filter((e) => e.score > 0)
  const avgScore = scored.length ? fmtScore((scored.reduce((s, e) => s + e.score, 0) / scored.length / 2).toFixed(2)) : '—'
  const completed  = entries.filter((e) => e.status === 'completed').length
  const completePct = entries.length > 0 ? Math.round((completed / entries.length) * 100) : 0

  const title = scopeLabel ? `${scopeLabel} Dashboard` : 'Library Dashboard'

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>

        {/* header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            {scopeLabel && <p className={styles.subtitle}>Filtered to {scopeLabel}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>

          {/* kpi strip */}
          <div className={styles.kpiStrip}>
            <div className={styles.kpi}>
              <span className={styles.kpiNum}>{entries.length}</span>
              <span className={styles.kpiLabel}>Logged</span>
            </div>
            <div className={styles.kpiDivider} />
            <div className={styles.kpi}>
              <span className={styles.kpiNum}>{completed}</span>
              <span className={styles.kpiLabel}>Completed</span>
            </div>
            <div className={styles.kpiDivider} />
            <div className={styles.kpi}>
              <span className={styles.kpiNum}>{completePct}%</span>
              <span className={styles.kpiLabel}>Done rate</span>
            </div>
            <div className={styles.kpiDivider} />
            <div className={styles.kpi}>
              <span className={styles.kpiNum}>{avgScore}</span>
              <span className={styles.kpiLabel}>Avg score</span>
            </div>
            <div className={styles.kpiDivider} />
            <div className={styles.kpi}>
              <span className={styles.kpiNum}>{scored.length}</span>
              <span className={styles.kpiLabel}>Scored</span>
            </div>
          </div>

          {/* row 1: donut + category bars */}
          <div className={styles.row2}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Status Breakdown</h3>
              {entries.length > 0
                ? <DonutChart entries={entries} />
                : <div className={styles.empty}>No entries yet.</div>
              }
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>By Category</h3>
              {entries.length > 0
                ? <CategoryBars entries={entries} />
                : <div className={styles.empty}>No entries yet.</div>
              }
            </div>
          </div>

          {/* row 2: activity line chart */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Activity — Last 12 Months</h3>
            <ActivityChart entries={entries} />
          </div>

          {/* row 3: score histogram + top scored */}
          <div className={styles.row2}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Score Distribution</h3>
              <ScoreHistogram entries={entries} />
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Top Rated</h3>
              <TopScored entries={entries} />
            </div>
          </div>

          {/* row 4: completion rates */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Completion Rate by Category</h3>
            <CompletionRates entries={entries} />
          </div>

        </div>
      </div>
    </div>
  )
}
