// ---------- 公告 ----------
export type NoticeType = '公告' | '补充通知' | '更正公告' | '访客须知';
export type IdRequirement = '原件' | '复印件' | '原件+复印件' | '未说明';

export const CORRECTABLE_FIELDS = [
  'campus', 'courtroom', 'sessionDate', 'sessionStart', 'sessionEnd',
  'allowedAudience', 'minAge', 'idRequirement', 'idCopies',
  'entryDeadline', 'securityGate', 'walkMinutes',
] as const;
export type FieldKey = (typeof CORRECTABLE_FIELDS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  campus: '院区',
  courtroom: '法庭',
  sessionDate: '开庭日期',
  sessionStart: '开始时刻',
  sessionEnd: '结束时刻',
  allowedAudience: '允许对象',
  minAge: '年龄门槛',
  idRequirement: '证件要求',
  idCopies: '复印件份数',
  entryDeadline: '入场截止',
  securityGate: '安检入口',
  walkMinutes: '步行分钟',
};

export interface Announcement {
  id: string;
  type: NoticeType;
  publishDate: string;      // YYYY-MM-DD
  caseNo: string;           // 案号
  campus: string;           // 院区
  courtroom: string;        // 法庭
  sessionDate: string;      // 开庭日期
  sessionStart: string;     // HH:mm
  sessionEnd: string;       // HH:mm
  allowedAudience: string;  // 允许对象（原文措辞）
  minAge: number | null;    // 年龄门槛
  idRequirement: IdRequirement;
  idCopies: number;         // 复印件份数
  entryDeadline: string;    // HH:mm 入场截止
  securityGate: string;     // 安检入口
  walkMinutes: number | null; // 安检入口到法庭步行分钟
  snippet: string;          // 关联原文片段
  // 更正公告专用
  correctsTargetId: string | null; // 明确指向的被更正公告
  correctsFields: FieldKey[];      // 明确指向的条款
  createdAt: number;
}

export function emptyAnnouncement(): Announcement {
  return {
    id: crypto.randomUUID(),
    type: '公告',
    publishDate: '',
    caseNo: '',
    campus: '',
    courtroom: '',
    sessionDate: '',
    sessionStart: '',
    sessionEnd: '',
    allowedAudience: '',
    minAge: null,
    idRequirement: '未说明',
    idCopies: 0,
    entryDeadline: '',
    securityGate: '',
    walkMinutes: null,
    snippet: '',
    correctsTargetId: null,
    correctsFields: [],
    createdAt: Date.now(),
  };
}

// ---------- 个人准备 ----------
export interface Profile {
  age: number | null;
  companion: '无' | '监护人' | '亲友' | '律师' | '其他';
  arrivalTime: string;        // HH:mm 到达院区时刻
  paperOriginals: number;     // 已有证件原件数
  paperCopies: number;        // 已有复印件份数
  selectedCaseNos: string[];  // 拟旁听场次（案号）
}

export const defaultProfile: Profile = {
  age: null,
  companion: '无',
  arrivalTime: '',
  paperOriginals: 0,
  paperCopies: 0,
  selectedCaseNos: [],
};

// ---------- 条款解析（更正覆盖） ----------
export interface ClauseValues {
  campus: string;
  courtroom: string;
  sessionDate: string;
  sessionStart: string;
  sessionEnd: string;
  allowedAudience: string;
  minAge: number | null;
  idRequirement: IdRequirement;
  idCopies: number;
  entryDeadline: string;
  securityGate: string;
  walkMinutes: number | null;
}

export interface FieldSource {
  noticeId: string;
  noticeType: NoticeType;
  publishDate: string;
  snippet: string;
}

export interface PendingItem {
  correctionId: string;
  field: FieldKey | null;
  reason: string;
}

export interface EffectiveClause {
  caseNo: string;
  baseId: string | null;          // 生效的原始公告
  values: ClauseValues;
  sources: Partial<Record<FieldKey, FieldSource>>; // 每个条款的出处
  conflicted: FieldKey[];         // 更正冲突、保留待核实的条款
  pending: PendingItem[];         // 未能生效的更正
  involvedIds: string[];          // 参与解析的公告 id（用于作废判断）
}

// ---------- 核对结论 ----------
export type Severity = 'error' | 'warn' | 'ok';

export interface BasisItem {
  noticeId: string;
  label: string;    // 条款名
  snippet: string;  // 原文片段
}

export interface Finding {
  id: string;            // 内容哈希：内容不变则 id 不变，勾选状态得以保留
  category: '身份条件' | '纸件份数' | '场次重叠' | '跨院区步行' | '入场截止' | '更正待核实';
  severity: Severity;
  message: string;
  detail: string;
  caseNo: string;
  bandStart: number;     // 分钟，用于“最早问题时间带”定位
  bandEnd: number;
  bandLabel: string;
  basis: BasisItem[];
  dependsOn: string[];   // 依赖的公告 id + 'profile'
}

// ---------- 材料卡 ----------
export interface MaterialCard {
  id: string;       // `${caseNo}:${slot}`
  caseNo: string;
  slot: string;
  order: number;    // 装袋顺序
  title: string;
  detail: string;
  stamp: string;    // 来源内容哈希：来源变了才作废勾选
  basis: BasisItem[];
}

export interface CardState { done: boolean; stamp: string; }
export interface FindingState { ack: boolean; }

// ---------- 工具 ----------
export function toMin(hhmm: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
