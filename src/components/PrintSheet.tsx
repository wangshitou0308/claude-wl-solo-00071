import { EffectiveClause, Finding, MaterialCard, Profile } from '../types';

interface Props {
  profile: Profile;
  clauses: EffectiveClause[];
  cards: MaterialCard[];
  findings: Finding[];
  stateMap: Record<string, { done: boolean; stamp: string }>;
}

/** 线下核对卡：仅打印区，屏幕隐藏 */
export function PrintSheet({ profile, clauses, cards, findings, stateMap }: Props) {
  const selected = clauses.filter((c) => profile.selectedCaseNos.includes(c.caseNo));
  if (selected.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div id="print-sheet">
      <h1>庭审旁听线下核对卡</h1>
      <p>打印日期：{today} ｜ 年龄：{profile.age ?? '—'} ｜ 同行：{profile.companion} ｜ 预计到达：{profile.arrivalTime || '—'}</p>

      {selected.map((c) => {
        const v = c.values;
        const list = cards.filter((k) => k.caseNo === c.caseNo).sort((a, b) => a.order - b.order);
        const problems = findings.filter((f) => f.caseNo === c.caseNo && f.severity !== 'ok');
        return (
          <section key={c.caseNo} className="print-session">
            <h2>{c.caseNo}</h2>
            <p>
              {v.sessionDate} {v.sessionStart}–{v.sessionEnd} ｜ {v.campus} {v.courtroom} ｜
              入场截止 {v.entryDeadline || '—'} ｜ {v.securityGate || '—'} ｜ 步行约 {v.walkMinutes ?? '—'} 分钟
            </p>
            <h3>装袋清单（按顺序装袋，逐项打勾）</h3>
            <ul>
              {list.map((k) => {
                const st = stateMap[k.id];
                const done = !!st && st.stamp === k.stamp && st.done;
                return <li key={k.id}>{done ? '☑' : '☐'} #{k.order} {k.title} —— {k.detail}</li>;
              })}
            </ul>
            {problems.length > 0 && (
              <>
                <h3>待处理 / 待核实</h3>
                <ul>
                  {problems.map((f) => <li key={f.id}>[{f.severity === 'error' ? '须处理' : '待核实'}] {f.bandLabel} {f.message}</li>)}
                </ul>
              </>
            )}
          </section>
        );
      })}
      <p className="print-foot">本卡由浏览器本地数据生成，未上传任何信息；以法院现场公告为准。</p>
    </div>
  );
}
