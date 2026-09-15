import { Announcement, EffectiveClause, FIELD_LABELS } from '../types';

interface Props {
  anns: Announcement[];
  clauses: EffectiveClause[];
  onEdit: (a: Announcement) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onSeed: () => void;
}

export function NoticeList({ anns, clauses, onEdit, onDelete, onAdd, onSeed }: Props) {
  const sorted = [...anns].sort((a, b) => (a.caseNo + a.publishDate).localeCompare(b.caseNo + b.publishDate));
  return (
    <section>
      <div className="row">
        <button className="primary" onClick={onAdd}>＋ 录入公告</button>
        {anns.length === 0 && <button onClick={onSeed}>载入示例数据</button>}
      </div>

      {clauses.map((c) => (
        <div key={c.caseNo} className="clause-box">
          <h3>现行条款 · {c.caseNo}</h3>
          <table className="clause-table">
            <tbody>
              {(['campus','courtroom','sessionDate','sessionStart','sessionEnd','allowedAudience','minAge','idRequirement','idCopies','entryDeadline','securityGate','walkMinutes'] as const).map((f) => {
                const conflicted = c.conflicted.includes(f);
                const src = c.sources[f];
                const val = c.values[f];
                return (
                  <tr key={f} className={conflicted ? 'conflicted' : ''}>
                    <th>{FIELD_LABELS[f]}</th>
                    <td>{conflicted ? '⚠ 待核实（更正冲突）' : val === null || val === '' ? '—' : String(val)}</td>
                    <td className="src">{src ? `${src.noticeType} ${src.publishDate}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {c.pending.length > 0 && (
            <ul className="pending-list">
              {c.pending.map((p, i) => <li key={i}>⏳ {p.reason}</li>)}
            </ul>
          )}
        </div>
      ))}

      {sorted.map((a) => (
        <article key={a.id} className={`notice-card type-${a.type}`}>
          <header>
            <strong>[{a.type}]</strong> {a.caseNo}
            <span className="meta">发布 {a.publishDate || '未填'} · {a.campus || '—'} · {a.courtroom || '—'}</span>
            <span className="spacer" />
            <button onClick={() => onEdit(a)}>编辑</button>
            <button className="danger" onClick={() => onDelete(a.id)}>删除</button>
          </header>
          <p className="meta">
            开庭 {a.sessionDate || '—'} {a.sessionStart}–{a.sessionEnd} · 截止 {a.entryDeadline || '—'} · {a.securityGate || '—'} · 步行 {a.walkMinutes ?? '—'} 分钟 · 证件 {a.idRequirement}{a.idCopies ? ` ×${a.idCopies}` : ''}
          </p>
          {a.type === '更正公告' && (
            <p className="meta">
              更正指向：{a.correctsTargetId ? '已指定公告' : '未指向'} · 条款：{a.correctsFields.length ? a.correctsFields.map((f) => FIELD_LABELS[f]).join('、') : '未指明'}
            </p>
          )}
          {a.snippet && <blockquote>{a.snippet}</blockquote>}
        </article>
      ))}
    </section>
  );
}
