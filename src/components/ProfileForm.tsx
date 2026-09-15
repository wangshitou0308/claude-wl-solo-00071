import { Profile } from '../types';

interface Props {
  profile: Profile;
  caseNos: string[];
  onChange: (p: Profile) => void;
}

export function ProfileForm({ profile, caseNos, onChange }: Props) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...profile, [k]: v });
  const toggleCase = (cn: string) =>
    set('selectedCaseNos', profile.selectedCaseNos.includes(cn)
      ? profile.selectedCaseNos.filter((x) => x !== cn)
      : [...profile.selectedCaseNos, cn]);

  return (
    <section className="profile-form">
      <div className="grid">
        <label>年龄
          <input type="number" min={0} max={120} value={profile.age ?? ''}
            onChange={(e) => set('age', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
        <label>同行关系
          <select value={profile.companion} onChange={(e) => set('companion', e.target.value as Profile['companion'])}>
            {['无', '监护人', '亲友', '律师', '其他'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>到达院区时刻
          <input type="time" value={profile.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} />
        </label>
        <label>已有证件原件（份）
          <input type="number" min={0} value={profile.paperOriginals}
            onChange={(e) => set('paperOriginals', Number(e.target.value))} />
        </label>
        <label>已有复印件（份）
          <input type="number" min={0} value={profile.paperCopies}
            onChange={(e) => set('paperCopies', Number(e.target.value))} />
        </label>
      </div>
      <fieldset>
        <legend>拟旁听场次</legend>
        {caseNos.length === 0 && <p className="meta">先在“公告管理”录入公告。</p>}
        {caseNos.map((cn) => (
          <label key={cn} className="check">
            <input type="checkbox" checked={profile.selectedCaseNos.includes(cn)} onChange={() => toggleCase(cn)} />
            {cn}
          </label>
        ))}
      </fieldset>
    </section>
  );
}
