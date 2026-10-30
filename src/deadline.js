// Brazilian civil procedure deadlines (CPC/2015), pure and deterministic.
// art. 219: only business days count · art. 224: start day excluded, end day included,
// both moved to the next business day · art. 220: Dec 20 - Jan 20 suspended ·
// Lei 11.419/2006 art. 4 §3-4: DJe publication = first business day after availability.

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

function easter(y) { // Anonymous Gregorian algorithm
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

export function holidays(year) {
  const e = easter(year);
  const fixed = { '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho',
    '09-07': 'Independência', '10-12': 'Nossa Senhora Aparecida', '11-02': 'Finados',
    '11-15': 'Proclamação da República', '11-20': 'Consciência Negra', '12-25': 'Natal' };
  const map = new Map(Object.entries(fixed).map(([md, n]) => [`${year}-${md}`, n]));
  map.set(iso(addDays(e, -48)), 'Carnaval (segunda)');
  map.set(iso(addDays(e, -47)), 'Carnaval (terça)');
  map.set(iso(addDays(e, -2)), 'Sexta-feira Santa');
  map.set(iso(addDays(e, 60)), 'Corpus Christi');
  return map;
}

// Why a day does not count, or null if it is a business day. extra = court-specific closures {date: reason}.
export function skipReason(date, extra = {}) {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : date;
  const key = iso(d), md = key.slice(5), wd = d.getUTCDay();
  if (extra[key]) return extra[key];
  if (md >= '12-20' || md <= '01-20') return 'Recesso forense (CPC art. 220)';
  if (wd === 0 || wd === 6) return wd === 0 ? 'Domingo' : 'Sábado';
  return holidays(d.getUTCFullYear()).get(key) ?? null;
}

const nextBusiness = (d, extra, skipped) => {
  let x = d;
  for (let r; (r = skipReason(x, extra)); x = addDays(x, 1)) skipped.push({ date: iso(x), reason: r });
  return x;
};

/**
 * @param {{start: string, days: number, djeAvailability?: boolean, doubled?: boolean, extraClosures?: object}} p
 * start = intimation date (or DJe availability date when djeAvailability is true).
 * doubled = Fazenda Pública / Defensoria / litisconsortes com procuradores distintos (arts. 180, 183, 186, 229).
 */
export function computeDeadline({ start, days, djeAvailability = false, doubled = false, extraClosures = {} }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) throw new Error('start must be YYYY-MM-DD');
  const n = Number(days) * (doubled ? 2 : 1);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('days must be an integer from 1 to 365');
  const skipped = [];
  let base = new Date(`${start}T00:00:00Z`);
  let publication = null;
  if (djeAvailability) { base = nextBusiness(addDays(base, 1), extraClosures, skipped); publication = iso(base); }
  let d = nextBusiness(addDays(base, 1), extraClosures, skipped); // art. 224 §3: counting starts next business day
  const firstDay = iso(d);
  for (let counted = 1; counted < n; counted++) d = nextBusiness(addDays(d, 1), extraClosures, skipped);
  return { start, publication, firstDay, dueDate: iso(d), businessDays: n, doubled, skipped };
}

// Compare what Jira says against the law. issues: [{key, summary, duedate, labels, done}]
// Convention: label prazo<N> (e.g. prazo15), label intimacao-YYYY-MM-DD, optional labels dje, dobro.
export function auditIssues(issues, today) {
  return issues.map((i) => {
    const days = i.labels.map((l) => /^prazo(\d+)$/.exec(l)?.[1]).find(Boolean);
    const start = i.labels.map((l) => /^intimacao-(\d{4}-\d{2}-\d{2})$/.exec(l)?.[1]).find(Boolean);
    if (!days || !start) return { key: i.key, status: 'INCOMPLETE', why: 'needs labels prazo<N> and intimacao-YYYY-MM-DD' };
    const r = computeDeadline({ start, days: Number(days), djeAvailability: i.labels.includes('dje'), doubled: i.labels.includes('dobro') });
    let status = 'OK';
    if (!i.duedate) status = 'MISSING_DUE_DATE';
    else if (i.duedate > r.dueDate) status = 'DUE_DATE_TOO_LATE';
    else if (i.duedate < r.dueDate) status = 'DUE_DATE_EARLY';
    if (!i.done && r.dueDate < today) status = 'OVERDUE';
    return { key: i.key, summary: i.summary, status, jiraDue: i.duedate ?? null, legalDue: r.dueDate, firstDay: r.firstDay };
  });
}
