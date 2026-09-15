import { useState } from 'react';
import { Announcement, CORRECTABLE_FIELDS, FIELD_LABELS, FieldKey, NoticeType } from '../types';

const TYPES: NoticeType[] = ['公告', '补充通知', '更正公告', '访客须知'];
const ID_REQS = ['原件', '复印件', '原件+复印件', '未说明'] as const;

interface Props {
  initial: Announcement;
  targets: Announcement[]; // 可被指向的非更正公告
  onSave: (a: Announcement) => void;
  onCancel: () => void;
}

export function NoticeForm({ initial, targets, onSave, onCancel }: Props) {
  const [a, setA] = useState<Announcement>(initial);
  const set = <K extends keyof Announcement>(k: K, v: Announcement[K]) => setA((p) => ({ ...p, [k]: v }));
  const isCorrection = a.type === '更正公告';

  const toggleField = (f: FieldKey) =>
    set('correctsFields', a.correctsFields.includes(f) ? a.correctsFields.filter((x) => x !== f) : [...a.correctsFields, f]);

  return (
    <form className="notice-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...a, createdAt: a.createdAt || Date.now() }); }}>
      <div className="grid">
        <label>类型
          <select value={a.type} onChange={(e) => set('type', e.target.value as NoticeType)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>发布日期
          <input type="date" value={a.publishDate} onChange={(e) => set('publishDate', e.target.value)} />
        </label>
        <label>案号
          <input required value={a.caseNo} onChange={(e) => set('caseNo', e.target.value)} placeholder="(2026)京01民初123号" />
        </label>
        <label>院区
          <input value={a.campus} onChange={(e) => set('campus', e.target.value)} placeholder="本部院区" />
        </label>
        <label>法庭
          <input value={a.courtroom} onChange={(e) => set('courtroom', e.target.value)} placeholder="第三法庭" />
        </label>
        <label>开庭日期
          <input type="date" value={a.sessionDate} onChange={(e) => set('sessionDate', e.target.value)} />
        </label>
        <label>开始时刻
          <input type="time" value={a.sessionStart} onChange={(e) => set('sessionStart', e.target.value)} />
        </label>
        <label>结束时刻
          <input type="time" value={a.sessionEnd} onChange={(e) => set('sessionEnd', e.target.value)} />
        </label>
        <label>允许对象
          <input value={a.allowedAudience} onChange={(e) => set('allowedAudience', e.target.value)} placeholder="年满18周岁公民…" />
        </label>
        <label>年龄门槛
          <input type="number" min={0} max={120} value={a.minAge ?? ''} onChange={(e) => set('minAge', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
        <label>证件要求
          <select value={a.idRequirement} onChange={(e) => set('idRequirement', e.target.value as Announcement['idRequirement'])}>
            {ID_REQS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label>复印件份数
          <input type="number" min={0} value={a.idCopies} onChange={(e) => set('idCopies', Number(e.target.value))} />
        </label>
        <label>入场截止
          <input type="time" value={a.entryDeadline} onChange={(e) => set('entryDeadline', e.target.value)} />
        </label>
        <label>安检入口
          <input value={a.securityGate} onChange={(e) => set('securityGate', e.target.value)} placeholder="东门安检" />
        </label>
        <label>步行分钟
          <input type="number" min={0} value={a.walkMinutes ?? ''} onChange={(e) => set('walkMinutes', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
      </div>

      {isCorrection && (
        <fieldset className="correction-box">
          <legend>更正指向（不明确则保留待核实，不覆盖旧条款）</legend>
          <label>被更正的公告
            <select value={a.correctsTargetId ?? ''} onChange={(e) => set('correctsTargetId', e.target.value || null)}>
              <option value="">— 未指向 —</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.type}] {t.caseNo} · {t.publishDate || '无日期'} · {t.campus}
                </option>
              ))}
            </select>
          </label>
          <div className="field-chips">
            {CORRECTABLE_FIELDS.map((f) => (
              <button type="button" key={f}
                className={a.correctsFields.includes(f) ? 'chip on' : 'chip'}
                onClick={() => toggleField(f)}>
                {FIELD_LABELS[f]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block">关联原文片段
        <textarea rows={3} value={a.snippet} onChange={(e) => set('snippet', e.target.value)}
          placeholder="粘贴公告中对应条款的原文，供结论依据回看" />
      </label>

      <div className="row">
        <button type="submit" className="primary">保存公告</button>
        <button type="button" onClick={onCancel}>取消</button>
      </div>
    </form>
  );
}
