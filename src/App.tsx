import { useEffect, useMemo, useState } from 'react';
import {
  Announcement, CardState, FindingState, Profile, defaultProfile, emptyAnnouncement,
} from './types';
import { idbClear, idbDelete, idbGetAll, idbPut } from './db';
import { resolveAll } from './logic/resolve';
import { earliestProblem, runChecks } from './logic/checks';
import { buildCards } from './logic/cards';
import { sampleAnnouncements, sampleCorrections } from './logic/sample';
import { NoticeForm } from './components/NoticeForm';
import { NoticeList } from './components/NoticeList';
import { ProfileForm } from './components/ProfileForm';
import { FindingsPanel } from './components/FindingsPanel';
import { Timeline } from './components/Timeline';
import { CardsPanel } from './components/CardsPanel';
import { PrintSheet } from './components/PrintSheet';

type Tab = 'notices' | 'profile' | 'findings' | 'cards';

export default function App() {
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [cardState, setCardState] = useState<Record<string, CardState>>({});
  const [findState, setFindState] = useState<Record<string, FindingState>>({});
  const [tab, setTab] = useState<Tab>('notices');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 启动时从 IndexedDB 恢复
  useEffect(() => {
    (async () => {
      const [a, p, cs, fs] = await Promise.all([
        idbGetAll<Announcement>('ann'),
        idbGetAll<Profile & { key: string }>('kv'),
        idbGetAll<CardState & { key: string }>('cardState'),
        idbGetAll<FindingState & { key: string }>('findingState'),
      ]);
      setAnns(a);
      const prof = p.find((x) => (x as unknown as { k?: string }).k === 'profile');
      if (prof) setProfile({ ...defaultProfile, ...(prof as unknown as Profile) });
      const csMap: Record<string, CardState> = {};
      for (const c of cs) {
        const k = (c as unknown as { k?: string }).k;
        if (k) csMap[k] = { done: c.done, stamp: c.stamp };
      }
      setCardState(csMap);
      const fsMap: Record<string, FindingState> = {};
      for (const f of fs) {
        const k = (f as unknown as { k?: string }).k;
        if (k) fsMap[k] = { ack: f.ack };
      }
      setFindState(fsMap);
      setLoaded(true);
    })().catch((e) => { console.error('IndexedDB 读取失败', e); setLoaded(true); });
  }, []);

  // 变更即写回 IndexedDB（仅存浏览器）
  useEffect(() => { if (loaded) for (const a of anns) void idbPut('ann', a); }, [anns, loaded]);
  useEffect(() => { if (loaded) void idbPut('kv', { ...profile, k: 'profile' }, 'profile'); }, [profile, loaded]);

  const clauses = useMemo(() => resolveAll(anns), [anns]);
  const findings = useMemo(() => runChecks(profile, clauses), [profile, clauses]);
  const cards = useMemo(() => buildCards(profile, clauses), [profile, clauses]);
  const earliest = useMemo(() => earliestProblem(findings), [findings]);
  const caseNos = useMemo(() => clauses.map((c) => c.caseNo), [clauses]);
  const ackMap = useMemo(() => Object.fromEntries(Object.entries(findState).map(([k, v]) => [k, v.ack])), [findState]);

  const saveAnn = (a: Announcement) => {
    setAnns((prev) => {
      const i = prev.findIndex((x) => x.id === a.id);
      return i >= 0 ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a];
    });
    setEditing(null);
  };

  const deleteAnn = (id: string) => {
    if (!confirm('删除该公告？相关结论与材料卡将重新计算。')) return;
    setAnns((prev) => prev.filter((x) => x.id !== id));
    void idbDelete('ann', id);
  };

  const seed = () => {
    const bases = sampleAnnouncements();
    const all = [...bases, ...sampleCorrections(bases[0].id)];
    setAnns(all);
    setProfile((p) => ({ ...p, selectedCaseNos: [bases[0].caseNo] }));
  };

  const toggleCard = (id: string, done: boolean, stamp: string) => {
    setCardState((prev) => {
      const next = { ...prev, [id]: { done, stamp } };
      void idbPut('cardState', { k: id, done, stamp }, id);
      return next;
    });
  };

  const ackFinding = (id: string, ack: boolean) => {
    setFindState((prev) => {
      const next = { ...prev, [id]: { ack } };
      void idbPut('findingState', { k: id, ack }, id);
      return next;
    });
  };

  const clearAll = async () => {
    if (!confirm('清空本浏览器中的全部公告、准备状态与勾选？')) return;
    await Promise.all([idbClear('ann'), idbClear('kv'), idbClear('cardState'), idbClear('findingState')]);
    setAnns([]); setProfile(defaultProfile); setCardState({}); setFindState({});
  };

  const TABS: [Tab, string][] = [['notices', '公告管理'], ['profile', '我的准备'], ['findings', '核对结论'], ['cards', '材料卡']];

  return (
    <div className="app">
      <header className="topbar">
        <h1>庭审旁听准备页</h1>
        <span className="meta">数据仅存本机浏览器（IndexedDB），不上传</span>
        <span className="spacer" />
        <button onClick={() => window.print()}>打印线下核对卡</button>
        <button className="danger" onClick={() => void clearAll()}>清空数据</button>
      </header>

      <nav className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>

      <main>
        {tab === 'notices' && (
          editing ? (
            <NoticeForm
              initial={editing}
              targets={anns.filter((a) => a.type !== '更正公告' && a.id !== editing.id)}
              onSave={saveAnn}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <NoticeList anns={anns} clauses={clauses}
              onEdit={setEditing} onDelete={deleteAnn}
              onAdd={() => setEditing(emptyAnnouncement())} onSeed={seed} />
          )
        )}

        {tab === 'profile' && <ProfileForm profile={profile} caseNos={caseNos} onChange={setProfile} />}

        {tab === 'findings' && (
          <>
            <Timeline clauses={clauses} findings={findings} profile={profile} earliestId={earliest?.id ?? null} />
            <FindingsPanel findings={findings} earliestId={earliest?.id ?? null} ackMap={ackMap} onAck={ackFinding} />
          </>
        )}

        {tab === 'cards' && <CardsPanel cards={cards} stateMap={cardState} onToggle={toggleCard} />}
      </main>

      <PrintSheet profile={profile} clauses={clauses} cards={cards} findings={findings} stateMap={cardState} />
    </div>
  );
}
