import { Announcement } from '../types';

/** 示例数据：一则公告 + 一则范围相交的更正 + 一则信息不足的更正（演示“待核实”） */
export function sampleAnnouncements(): Announcement[] {
  const now = Date.now();
  return [
    {
      id: crypto.randomUUID(), type: '公告', publishDate: '2026-09-01',
      caseNo: '(2026)京01民初123号', campus: '本部院区', courtroom: '第三法庭',
      sessionDate: '2026-09-22', sessionStart: '09:30', sessionEnd: '11:00',
      allowedAudience: '年满18周岁公民；未成年人须由监护人陪同', minAge: 18,
      idRequirement: '原件+复印件', idCopies: 2,
      entryDeadline: '09:10', securityGate: '东门安检', walkMinutes: 8,
      snippet: '旁听人员须持本人有效身份证件原件及两份复印件，于开庭前20分钟经东门安检入场。',
      correctsTargetId: null, correctsFields: [], createdAt: now,
    },
    {
      id: crypto.randomUUID(), type: '访客须知', publishDate: '2026-09-01',
      caseNo: '(2026)京01民初123号', campus: '本部院区', courtroom: '第三法庭',
      sessionDate: '2026-09-22', sessionStart: '09:30', sessionEnd: '11:00',
      allowedAudience: '年满18周岁公民；未成年人须由监护人陪同', minAge: 18,
      idRequirement: '原件+复印件', idCopies: 2,
      entryDeadline: '09:10', securityGate: '东门安检', walkMinutes: 8,
      snippet: '访客请从东门安检通道进入，大件行李寄存于东门储物柜。',
      correctsTargetId: null, correctsFields: [], createdAt: now + 1,
    },
  ];
}

export function sampleCorrections(baseId: string): Announcement[] {
  const now = Date.now();
  return [
    {
      id: crypto.randomUUID(), type: '更正公告', publishDate: '2026-09-10',
      caseNo: '(2026)京01民初123号', campus: '本部院区', courtroom: '第五法庭',
      sessionDate: '2026-09-22', sessionStart: '09:30', sessionEnd: '11:00',
      allowedAudience: '', minAge: null,
      idRequirement: '未说明', idCopies: 0,
      entryDeadline: '09:05', securityGate: '西门安检', walkMinutes: 12,
      snippet: '原公告安检入口由东门更正为西门，入场截止更正为09:05。',
      correctsTargetId: baseId, correctsFields: ['securityGate', 'entryDeadline', 'walkMinutes'],
      createdAt: now,
    },
    {
      id: crypto.randomUUID(), type: '更正公告', publishDate: '',
      caseNo: '(2026)京01民初123号', campus: '本部院区', courtroom: '',
      sessionDate: '', sessionStart: '10:00', sessionEnd: '',
      allowedAudience: '', minAge: null,
      idRequirement: '未说明', idCopies: 0,
      entryDeadline: '', securityGate: '', walkMinutes: null,
      snippet: '开庭时间拟调整（未注明发布日期与指向）。',
      correctsTargetId: null, correctsFields: [],
      createdAt: now + 1,
    },
  ];
}
