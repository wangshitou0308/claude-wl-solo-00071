import {
  EffectiveClause, Finding, Profile, BasisItem, FieldKey, FIELD_LABELS, toMin, fmtMin, hashStr,
} from '../types';

const MIN = 10; // 入场缓冲分钟

function basisOf(clause: EffectiveClause, fields: FieldKey[]): BasisItem[] {
  const out: BasisItem[] = [];
  for (const f of fields) {
    const s = clause.sources[f];
    if (s) out.push({ noticeId: s.noticeId, label: FIELD_LABELS[f], snippet: s.snippet || '（未填写原文片段）' });
  }
  return out;
}

function mk(
  clause: EffectiveClause | null,
  category: Finding['category'],
  severity: Finding['severity'],
  message: string,
  detail: string,
  bandStart: number,
  bandEnd: number,
  basis: BasisItem[],
  dependsOn: string[],
): Finding {
  const caseNo = clause?.caseNo ?? '';
  const f: Omit<Finding, 'id'> = {
    category, severity, message, detail, caseNo,
    bandStart, bandEnd,
    bandLabel: `${fmtMin(bandStart)}–${fmtMin(bandEnd)}`,
    basis, dependsOn,
  };
  return { ...f, id: hashStr(JSON.stringify(f)) };
}

const FALLBACK_BAND = 8 * 60;

/** 对全部选中场次运行五项核对；结论带依据与时间带，供“最早问题”定位。 */
export function runChecks(profile: Profile, clauses: EffectiveClause[]): Finding[] {
  const selected = clauses.filter((c) => profile.selectedCaseNos.includes(c.caseNo));
  const findings: Finding[] = [];

  for (const c of selected) {
    const v = c.values;
    const start = toMin(v.sessionStart) ?? FALLBACK_BAND;
    const end = toMin(v.sessionEnd) ?? start + 60;
    const deps = [...c.involvedIds, 'profile'];

    // —— 更正待核实 ——
    for (const p of c.pending) {
      findings.push(mk(c, '更正待核实', 'warn',
        `「${c.caseNo}」有更正未生效`,
        p.reason + (p.field ? `（条款：${FIELD_LABELS[p.field]}）` : ''),
        start - 30, start,
        c.involvedIds.includes(p.correctionId)
          ? [{ noticeId: p.correctionId, label: '更正公告', snippet: '见公告列表中的原文片段' }]
          : [],
        c.involvedIds));
    }
    for (const f of c.conflicted) {
      findings.push(mk(c, '更正待核实', 'error',
        `「${c.caseNo}」${FIELD_LABELS[f]}存在冲突更正`,
        '多则更正对该条款给出不同取值，已保留待核实，请以法院现场公告为准。',
        start - 30, start, basisOf(c, [f]), c.involvedIds));
    }

    // —— 身份条件 ——
    const idBasis = basisOf(c, ['allowedAudience', 'minAge']);
    if (v.minAge != null && profile.age != null && profile.age < v.minAge) {
      findings.push(mk(c, '身份条件', 'error',
        `年龄 ${profile.age} 岁低于「${c.caseNo}」门槛 ${v.minAge} 岁`,
        '公告载明年龄门槛，当前身份条件不满足。',
        start, end, idBasis, deps));
    } else if (v.minAge != null && profile.age == null) {
      findings.push(mk(c, '身份条件', 'warn',
        `「${c.caseNo}」有年龄门槛 ${v.minAge} 岁，尚未填写年龄`,
        '补充年龄后才能核对身份条件。',
        start, end, idBasis, deps));
    }
    const needGuardian = v.allowedAudience.includes('监护');
    if (needGuardian && profile.age != null && profile.age < 18 && profile.companion !== '监护人') {
      findings.push(mk(c, '身份条件', 'error',
        `「${c.caseNo}」要求未成年人由监护人陪同`,
        `当前同行关系为「${profile.companion}」，与公告允许对象不符。`,
        start, end, idBasis, deps));
    } else if (needGuardian && profile.age == null) {
      findings.push(mk(c, '身份条件', 'warn',
        `「${c.caseNo}」允许对象含监护要求，尚未填写年龄`,
        '补充年龄与同行关系后才能核对。',
        start, end, idBasis, deps));
    }

    // —— 纸件份数 ——
    const paperBasis = basisOf(c, ['idRequirement', 'idCopies']);
    const needOriginal = v.idRequirement === '原件' || v.idRequirement === '原件+复印件';
    const needCopies = v.idRequirement === '复印件' || v.idRequirement === '原件+复印件' ? Math.max(v.idCopies, 1) : v.idCopies;
    if (v.idRequirement === '未说明') {
      findings.push(mk(c, '纸件份数', 'warn',
        `「${c.caseNo}」证件要求未说明`,
        '公告未写明需原件还是复印件，建议按原件+复印件准备并现场核实。',
        start - 60, start, paperBasis, deps));
    }
    if (needOriginal && profile.paperOriginals < 1) {
      findings.push(mk(c, '纸件份数', 'error',
        `「${c.caseNo}」要求证件原件，当前已有 ${profile.paperOriginals} 份`,
        '请补备证件原件。',
        start - 60, start, paperBasis, deps));
    }
    if (needCopies > 0 && profile.paperCopies < needCopies) {
      findings.push(mk(c, '纸件份数', 'error',
        `「${c.caseNo}」需复印件 ${needCopies} 份，当前已有 ${profile.paperCopies} 份`,
        `尚缺 ${needCopies - profile.paperCopies} 份复印件。`,
        start - 60, start, paperBasis, deps));
    }

    // —— 入场截止 ——
    const deadline = toMin(v.entryDeadline);
    const arrival = toMin(profile.arrivalTime);
    const timeBasis = basisOf(c, ['entryDeadline', 'securityGate', 'walkMinutes']);
    if (deadline == null) {
      findings.push(mk(c, '入场截止', 'warn',
        `「${c.caseNo}」未填入场截止时间`,
        '缺少入场截止，无法核对到达时刻，待核实。',
        start - 60, start, timeBasis, deps));
    } else if (arrival == null) {
      findings.push(mk(c, '入场截止', 'warn',
        `「${c.caseNo}」入场截止 ${v.entryDeadline}，尚未填写到达时刻`,
        '填写到达时刻后核对是否来得及。',
        deadline - 30, deadline, timeBasis, deps));
    } else {
      const atCourt = arrival + (v.walkMinutes ?? 0);
      if (arrival > deadline) {
        findings.push(mk(c, '入场截止', 'error',
          `到达 ${profile.arrivalTime} 晚于「${c.caseNo}」入场截止 ${v.entryDeadline}`,
          '到达院区时已过了入场截止时间。',
          deadline, arrival, timeBasis, deps));
      } else if (atCourt > deadline) {
        findings.push(mk(c, '入场截止', 'error',
          `到达+步行 ${fmtMin(atCourt)} 超过「${c.caseNo}」入场截止 ${v.entryDeadline}`,
          `到达 ${profile.arrivalTime}，自 ${v.securityGate || '安检入口'} 步行约 ${v.walkMinutes ?? '?'} 分钟，赶不上截止。`,
          deadline, atCourt, timeBasis, deps));
      } else if (deadline - atCourt < MIN) {
        findings.push(mk(c, '入场截止', 'warn',
          `「${c.caseNo}」入场缓冲不足 ${MIN} 分钟`,
          `预计 ${fmtMin(atCourt)} 到法庭，距截止 ${v.entryDeadline} 仅 ${deadline - atCourt} 分钟。`,
          atCourt, deadline, timeBasis, deps));
      }
    }
  }

  // —— 场次重叠（同日时间相交） ——
  const withTime = selected
    .map((c) => ({ c, date: c.values.sessionDate, s: toMin(c.values.sessionStart), e: toMin(c.values.sessionEnd) }))
    .filter((x): x is { c: EffectiveClause; date: string; s: number; e: number } => !!x.date && x.s != null && x.e != null);
  for (let i = 0; i < withTime.length; i++) {
    for (let j = i + 1; j < withTime.length; j++) {
      const a = withTime[i], b = withTime[j];
      if (a.date !== b.date) continue;
      const os = Math.max(a.s, b.s), oe = Math.min(a.e, b.e);
      if (os < oe) {
        findings.push(mk(a.c, '场次重叠', 'error',
          `「${a.c.caseNo}」与「${b.c.caseNo}」时间重叠`,
          `${a.date} ${fmtMin(os)}–${fmtMin(oe)} 两场同时进行，只能择一旁听。`,
          os, oe,
          [...basisOf(a.c, ['sessionDate', 'sessionStart', 'sessionEnd']), ...basisOf(b.c, ['sessionDate', 'sessionStart', 'sessionEnd'])],
          [...a.c.involvedIds, ...b.c.involvedIds]));
      }
    }
  }

  // —— 跨院区步行（同日相邻场次） ——
  const sorted = [...withTime].sort((x, y) => x.date === y.date ? x.s - y.s : x.date < y.date ? -1 : 1);
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (a.date !== b.date) continue;
    if (!a.c.values.campus || !b.c.values.campus || a.c.values.campus === b.c.values.campus) continue;
    const gap = b.s - a.e;
    if (gap < 0) continue; // 已被场次重叠捕获
    const need = (a.c.values.walkMinutes ?? 0) + (b.c.values.walkMinutes ?? 0) + 30; // 30 分钟为跨院区移动默认估计
    const walkBasis = [...basisOf(a.c, ['campus', 'walkMinutes']), ...basisOf(b.c, ['campus', 'walkMinutes'])];
    if (gap < need) {
      findings.push(mk(a.c, '跨院区步行', 'error',
        `「${a.c.caseNo}」→「${b.c.caseNo}」跨院区间隔不足`,
        `${a.c.values.campus}→${b.c.values.campus} 仅 ${gap} 分钟，估计需要约 ${need} 分钟（含两院步行与转场）。`,
        a.e, b.s, walkBasis, [...a.c.involvedIds, ...b.c.involvedIds]));
    } else if (gap - need < MIN) {
      findings.push(mk(a.c, '跨院区步行', 'warn',
        `「${a.c.caseNo}」→「${b.c.caseNo}」转场余量不足 ${MIN} 分钟`,
        `间隔 ${gap} 分钟，估计需要约 ${need} 分钟。`,
        a.e, b.s, walkBasis, [...a.c.involvedIds, ...b.c.involvedIds]));
    }
  }

  return findings;
}

/** 最早问题时间带：在 error/warn 中按时间带起点取最早 */
export function earliestProblem(findings: Finding[]): Finding | null {
  const bad = findings.filter((f) => f.severity !== 'ok');
  if (bad.length === 0) return null;
  return bad.reduce((m, f) => (f.bandStart < m.bandStart ? f : m));
}
