import {
  EffectiveClause, MaterialCard, Profile, BasisItem, FieldKey, FIELD_LABELS, hashStr,
} from '../types';

function basisOf(clause: EffectiveClause, fields: FieldKey[]): BasisItem[] {
  const out: BasisItem[] = [];
  for (const f of fields) {
    const s = clause.sources[f];
    if (s) out.push({ noticeId: s.noticeId, label: FIELD_LABELS[f], snippet: s.snippet || '（未填写原文片段）' });
  }
  return out;
}

/** 按场次与装袋顺序生成材料卡；stamp 记录来源内容，来源不变则勾选状态保留 */
export function buildCards(profile: Profile, clauses: EffectiveClause[]): MaterialCard[] {
  const selected = clauses
    .filter((c) => profile.selectedCaseNos.includes(c.caseNo))
    .sort((a, b) => (a.values.sessionDate + a.values.sessionStart).localeCompare(b.values.sessionDate + b.values.sessionStart));

  const cards: MaterialCard[] = [];
  for (const c of selected) {
    const v = c.values;
    let order = 1;
    const push = (slot: string, title: string, detail: string, basisFields: FieldKey[], extra = '') => {
      const stamp = hashStr(JSON.stringify([c.caseNo, slot, title, detail, extra]));
      cards.push({ id: `${c.caseNo}:${slot}`, caseNo: c.caseNo, slot, order: order++, title, detail, stamp, basis: basisOf(c, basisFields) });
    };

    if (c.pending.length > 0 || c.conflicted.length > 0) {
      push('pending', '待核实事项确认',
        `${c.pending.length + c.conflicted.length} 项更正未生效或冲突，到院后先向导诉台核实。`,
        [], JSON.stringify([c.pending, c.conflicted]));
    }
    const needOriginal = v.idRequirement === '原件' || v.idRequirement === '原件+复印件';
    const needCopies = v.idRequirement === '复印件' || v.idRequirement === '原件+复印件' ? Math.max(v.idCopies, 1) : v.idCopies;
    if (needOriginal) push('id-original', '证件原件', '本人有效身份证件原件。', ['idRequirement']);
    if (needCopies > 0) push('id-copies', `证件复印件 × ${needCopies}`, `按公告要求准备 ${needCopies} 份。`, ['idRequirement', 'idCopies']);
    push('notice-print', '公告原文打印件', `「${c.caseNo}」公告及已生效更正的打印件，供入口核验。`, ['courtroom']);
    if (v.entryDeadline || v.securityGate) {
      push('time-card', '到场时间卡',
        `${v.sessionDate} ${v.sessionStart} 开庭；${v.entryDeadline || '—'} 前经 ${v.securityGate || '—'} 安检，步行约 ${v.walkMinutes ?? '—'} 分钟到 ${v.courtroom || '—'}。`,
        ['sessionDate', 'sessionStart', 'entryDeadline', 'securityGate', 'walkMinutes', 'courtroom']);
    }
    if (profile.companion !== '无') {
      push('companion', '同行人证件', `同行关系「${profile.companion}」：同行人证件及关系说明材料。`, ['allowedAudience'], profile.companion);
    }
  }
  return cards;
}
