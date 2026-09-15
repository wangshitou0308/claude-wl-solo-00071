import { EffectiveClause, Finding, Profile, toMin, fmtMin } from '../types';

interface Props {
  clauses: EffectiveClause[];
  findings: Finding[];
  profile: Profile;
  earliestId: string | null;
}

const W = 760;
const ROW_H = 46;
const PAD_L = 150;
const PAD_R = 20;

/** SVG 时间带：每个选中场次一行（开庭段、步行段、入场截止刻度），最底一行为问题时间带 */
export function Timeline({ clauses, findings, profile, earliestId }: Props) {
  const selected = clauses.filter((c) => profile.selectedCaseNos.includes(c.caseNo));
  const rows = selected
    .map((c) => ({
      c,
      date: c.values.sessionDate,
      s: toMin(c.values.sessionStart),
      e: toMin(c.values.sessionEnd),
      deadline: toMin(c.values.entryDeadline),
      walk: c.values.walkMinutes ?? 0,
    }))
    .filter((r): r is { c: EffectiveClause; date: string; s: number; e: number; deadline: number | null; walk: number } =>
      !!r.date && r.s != null && r.e != null);

  if (rows.length === 0) return <p className="meta">暂无带完整时间的场次，无法绘制时间带。</p>;

  // 只画最早一个开庭日
  const day = rows.map((r) => r.date).sort()[0];
  const dayRows = rows.filter((r) => r.date === day);
  const arrival = toMin(profile.arrivalTime);

  const dayFindings = findings.filter((f) => f.severity !== 'ok' && dayRows.some((r) => r.c.caseNo === f.caseNo));

  let lo = Infinity, hi = -Infinity;
  for (const r of dayRows) {
    lo = Math.min(lo, (arrival ?? r.s) - r.walk, r.deadline ?? r.s, r.s);
    hi = Math.max(hi, r.e, r.deadline ?? r.e);
  }
  for (const f of dayFindings) { lo = Math.min(lo, f.bandStart); hi = Math.max(hi, f.bandEnd); }
  lo = Math.max(0, lo - 15); hi = hi + 15;

  const x = (m: number) => PAD_L + ((m - lo) / (hi - lo)) * (W - PAD_L - PAD_R);
  const totalH = (dayRows.length + (dayFindings.length ? 1 : 0)) * ROW_H + 34;

  const ticks: number[] = [];
  for (let m = Math.ceil(lo / 30) * 30; m <= hi; m += 30) ticks.push(m);

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="timeline" role="img" aria-label="旁听时间带">
      <text x={8} y={16} className="tl-title">{day} 时间带（分钟刻度每 30 分钟）</text>
      {ticks.map((m) => (
        <g key={m}>
          <line x1={x(m)} y1={24} x2={x(m)} y2={totalH - 8} className="tl-grid" />
          <text x={x(m)} y={totalH - 0} className="tl-tick" textAnchor="middle">{fmtMin(m)}</text>
        </g>
      ))}

      {dayRows.map((r, i) => {
        const y = 28 + i * ROW_H;
        const gateArrive = arrival != null ? arrival : null;
        return (
          <g key={r.c.caseNo}>
            <text x={8} y={y + 18} className="tl-label">{r.c.caseNo.length > 14 ? r.c.caseNo.slice(0, 14) + '…' : r.c.caseNo}</text>
            <text x={8} y={y + 32} className="tl-sub">{r.c.values.campus} · {r.c.values.courtroom}</text>
            {/* 步行段 */}
            {gateArrive != null && (
              <rect x={x(gateArrive)} y={y + 10} width={Math.max(2, x(gateArrive + r.walk) - x(gateArrive))} height={10} className="tl-walk" />
            )}
            {/* 开庭段 */}
            <rect x={x(r.s!)} y={y + 6} width={Math.max(2, x(r.e!) - x(r.s!))} height={18} rx={3} className="tl-session" />
            <text x={x(r.s!) + 4} y={y + 19} className="tl-intext">{r.c.values.sessionStart}–{r.c.values.sessionEnd}</text>
            {/* 入场截止 */}
            {r.deadline != null && (
              <g>
                <line x1={x(r.deadline)} y1={y + 2} x2={x(r.deadline)} y2={y + 28} className="tl-deadline" />
                <text x={x(r.deadline)} y={y - 1} className="tl-deadline-text" textAnchor="middle">截止{r.c.values.entryDeadline}</text>
              </g>
            )}
            {/* 到达标记 */}
            {gateArrive != null && (
              <g>
                <line x1={x(gateArrive)} y1={y + 2} x2={x(gateArrive)} y2={y + 28} className="tl-arrival" />
                <text x={x(gateArrive)} y={y + 40} className="tl-arrival-text" textAnchor="middle">到达{profile.arrivalTime}</text>
              </g>
            )}
          </g>
        );
      })}

      {dayFindings.length > 0 && (
        <g>
          {(() => {
            const y = 28 + dayRows.length * ROW_H;
            return (
              <>
                <text x={8} y={y + 18} className="tl-label">问题时间带</text>
                {dayFindings.map((f) => (
                  <g key={f.id}>
                    <rect x={x(f.bandStart)} y={y + 6} width={Math.max(3, x(f.bandEnd) - x(f.bandStart))} height={18} rx={3}
                      className={`tl-band ${f.severity} ${f.id === earliestId ? 'earliest' : ''}`} />
                    {f.id === earliestId && (
                      <text x={x(f.bandStart)} y={y + 40} className="tl-earliest-text">◀ 最早问题 {f.bandLabel}：{f.category}</text>
                    )}
                  </g>
                ))}
              </>
            );
          })()}
        </g>
      )}
    </svg>
  );
}
