import { useState } from 'react';
import { Finding } from '../types';

interface Props {
  findings: Finding[];
  earliestId: string | null;
  ackMap: Record<string, boolean>;
  onAck: (id: string, ack: boolean) => void;
}

const ORDER: Record<Finding['severity'], number> = { error: 0, warn: 1, ok: 2 };
const ICON: Record<Finding['severity'], string> = { error: '⛔', warn: '⚠️', ok: '✅' };

export function FindingsPanel({ findings, earliestId, ackMap, onAck }: Props) {
  const [openBasis, setOpenBasis] = useState<string | null>(null);
  const sorted = [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.bandStart - b.bandStart);
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warns = findings.filter((f) => f.severity === 'warn').length;

  if (findings.length === 0) {
    return <p className="meta">录入公告并在“我的准备”勾选拟旁听场次后，这里会给出核对结论。</p>;
  }

  return (
    <section>
      <p className="summary">
        共 {findings.length} 项结论：⛔ {errors} 项须处理，⚠️ {warns} 项待核实。
        {earliestId && <> 最早问题已用红框标出。</>}
      </p>
      {sorted.map((f) => {
        const ack = !!ackMap[f.id];
        return (
          <article key={f.id} className={`finding ${f.severity} ${f.id === earliestId ? 'earliest' : ''} ${ack ? 'ack' : ''}`}>
            <header>
              <span className="icon">{ICON[f.severity]}</span>
              <span className="cat">{f.category}</span>
              <span className="band">{f.bandLabel}</span>
              {f.id === earliestId && <span className="tag-earliest">最早问题时间带</span>}
              <span className="spacer" />
              <label className="check">
                <input type="checkbox" checked={ack} onChange={(e) => onAck(f.id, e.target.checked)} /> 已知悉
              </label>
            </header>
            <p className="msg">{f.message}</p>
            <p className="meta">{f.detail}{f.caseNo ? `（${f.caseNo}）` : ''}</p>
            {f.basis.length > 0 && (
              <div>
                <button className="link" onClick={() => setOpenBasis(openBasis === f.id ? null : f.id)}>
                  {openBasis === f.id ? '收起依据 ▲' : `回看依据（${f.basis.length}）▼`}
                </button>
                {openBasis === f.id && (
                  <ul className="basis-list">
                    {f.basis.map((b, i) => (
                      <li key={i}><strong>{b.label}</strong>：{b.snippet}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
