import { useState } from 'react';
import { MaterialCard } from '../types';

interface Props {
  cards: MaterialCard[];
  stateMap: Record<string, { done: boolean; stamp: string }>;
  onToggle: (id: string, done: boolean, stamp: string) => void;
}

/** 材料卡：按场次分组、装袋顺序排列；来源变化自动作废旧勾选 */
export function CardsPanel({ cards, stateMap, onToggle }: Props) {
  const [openBasis, setOpenBasis] = useState<string | null>(null);
  if (cards.length === 0) return <p className="meta">勾选拟旁听场次后生成材料卡。</p>;

  const byCase = new Map<string, MaterialCard[]>();
  for (const c of cards) {
    if (!byCase.has(c.caseNo)) byCase.set(c.caseNo, []);
    byCase.get(c.caseNo)!.push(c);
  }

  return (
    <section>
      {[...byCase.entries()].map(([caseNo, list]) => (
        <div key={caseNo} className="card-group">
          <h3>{caseNo}</h3>
          <ol className="material-list">
            {list.sort((a, b) => a.order - b.order).map((c) => {
              const st = stateMap[c.id];
              const done = !!st && st.stamp === c.stamp && st.done;
              const stale = !!st && st.stamp !== c.stamp;
              return (
                <li key={c.id} className={`material ${done ? 'done' : ''}`}>
                  <label className="check">
                    <input type="checkbox" checked={done} onChange={(e) => onToggle(c.id, e.target.checked, c.stamp)} />
                    <span className="order">#{c.order}</span> <strong>{c.title}</strong>
                  </label>
                  <p className="meta">{c.detail}</p>
                  {stale && <p className="stale">来源已更新，旧勾选作废，请重新核对。</p>}
                  {c.basis.length > 0 && (
                    <div>
                      <button className="link" onClick={() => setOpenBasis(openBasis === c.id ? null : c.id)}>
                        {openBasis === c.id ? '收起依据 ▲' : '依据 ▼'}
                      </button>
                      {openBasis === c.id && (
                        <ul className="basis-list">
                          {c.basis.map((b, i) => <li key={i}><strong>{b.label}</strong>：{b.snippet}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
