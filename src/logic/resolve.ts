import {
  Announcement, EffectiveClause, FieldKey, FieldSource, PendingItem,
  ClauseValues, CORRECTABLE_FIELDS, FIELD_LABELS,
} from '../types';

function byPublish(a: Announcement, b: Announcement): number {
  const da = a.publishDate || '9999';
  const db = b.publishDate || '9999';
  if (da !== db) return da < db ? -1 : 1;
  return a.createdAt - b.createdAt;
}

function baseValues(a: Announcement): ClauseValues {
  return {
    campus: a.campus, courtroom: a.courtroom,
    sessionDate: a.sessionDate, sessionStart: a.sessionStart, sessionEnd: a.sessionEnd,
    allowedAudience: a.allowedAudience, minAge: a.minAge,
    idRequirement: a.idRequirement, idCopies: a.idCopies,
    entryDeadline: a.entryDeadline, securityGate: a.securityGate, walkMinutes: a.walkMinutes,
  };
}

/**
 * 条款解析：同一案号下，以最新原始公告为底稿；
 * 更正公告只有在「明确指向目标公告 + 明确指向条款 + 范围相交（同案号同院区）+ 发布日期不早于底稿」
 * 时才覆盖对应条款；冲突或生效信息不足的更正保留为“待核实”，不改动任何条款。
 */
export function resolveCase(caseNo: string, group: Announcement[]): EffectiveClause {
  const bases = group.filter((a) => a.type !== '更正公告').sort(byPublish);
  const corrections = group.filter((a) => a.type === '更正公告').sort(byPublish);
  const pending: PendingItem[] = [];
  const conflicted: FieldKey[] = [];

  const base = bases[bases.length - 1] ?? null;
  const values: ClauseValues = base
    ? baseValues(base)
    : { campus: '', courtroom: '', sessionDate: '', sessionStart: '', sessionEnd: '',
        allowedAudience: '', minAge: null, idRequirement: '未说明', idCopies: 0,
        entryDeadline: '', securityGate: '', walkMinutes: null };

  const sources: Partial<Record<FieldKey, FieldSource>> = {};
  if (base) {
    for (const f of CORRECTABLE_FIELDS) {
      sources[f] = { noticeId: base.id, noticeType: base.type, publishDate: base.publishDate, snippet: base.snippet };
    }
  } else if (corrections.length > 0) {
    pending.push({ correctionId: corrections[0].id, field: null, reason: '只有更正公告，缺少被更正的原始公告，全部条款待核实' });
  }

  // field -> 已应用更正的取值签名，用于冲突检测
  const appliedBy: Partial<Record<FieldKey, { correctionId: string; signature: string }>> = {};

  for (const c of corrections) {
    const fail = (reason: string, field: FieldKey | null = null) => {
      pending.push({ correctionId: c.id, field, reason });
    };
    if (!c.publishDate) { fail('更正公告缺少发布日期，无法确定生效顺序'); continue; }
    if (!c.correctsTargetId) { fail('未明确指向被更正的公告，不覆盖任何条款'); continue; }
    const target = group.find((g) => g.id === c.correctsTargetId);
    if (!target) { fail('指向的公告不在本卷（可能已删除），无法核实'); continue; }
    if (target.type === '更正公告') { fail('指向的是另一则更正公告，更正链条不明'); continue; }
    if (target.caseNo !== c.caseNo) { fail('更正与被更正公告案号不一致，范围不相交'); continue; }
    if (target.campus && c.campus && target.campus !== c.campus) { fail('更正与被更正公告院区不一致，范围不相交'); continue; }
    if (base && c.publishDate < base.publishDate) { fail('更正发布日期早于现行底稿，生效顺序存疑'); continue; }
    const fields = (c.correctsFields ?? []).filter((f) => CORRECTABLE_FIELDS.includes(f));
    if (fields.length === 0) { fail('未指明具体更正条款，不覆盖任何条款'); continue; }

    for (const f of fields) {
      const signature = JSON.stringify(c[f as keyof Announcement] ?? null);
      const prev = appliedBy[f];
      if (prev && prev.correctionId !== c.id) {
        if (prev.signature !== signature) {
          // 两则更正对同一条款给出不同取值：冲突，保留待核实，不采用任何一方
          if (!conflicted.includes(f)) conflicted.push(f);
          pending.push({
            correctionId: c.id, field: f,
            reason: `条款「${FIELD_LABELS[f]}」被多则更正给出不同取值，互相冲突，保留待核实`,
          });
          continue;
        }
        continue; // 取值一致，视为重复确认
      }
      appliedBy[f] = { correctionId: c.id, signature };
      (values as unknown as Record<string, unknown>)[f] = c[f as keyof Announcement];
      sources[f] = { noticeId: c.id, noticeType: c.type, publishDate: c.publishDate, snippet: c.snippet };
    }
  }

  // 冲突条款的出处标记为待核实
  for (const f of conflicted) delete sources[f];

  return {
    caseNo,
    baseId: base?.id ?? null,
    values,
    sources,
    conflicted,
    pending,
    involvedIds: group.map((g) => g.id),
  };
}

export function resolveAll(anns: Announcement[]): EffectiveClause[] {
  const caseNos = [...new Set(anns.map((a) => a.caseNo).filter(Boolean))];
  return caseNos.map((cn) => resolveCase(cn, anns.filter((a) => a.caseNo === cn)));
}
