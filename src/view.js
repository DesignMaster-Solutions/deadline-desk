// Pure view model for the project page: the same audit rows the MCP tool returns, as table rows.

// Worst first: this order is the table order and the summary order.
const STATUS = {
  OVERDUE: { label: 'Overdue', appearance: 'danger' },
  DUE_DATE_TOO_LATE: { label: 'Jira date too late', appearance: 'danger' },
  MISSING_DUE_DATE: { label: 'No due date', appearance: 'warning' },
  INCOMPLETE: { label: 'Missing labels', appearance: 'warning' },
  DUE_DATE_EARLY: { label: 'Jira date early', appearance: 'information' },
  OK: { label: 'OK', appearance: 'success' },
};
const RANK = Object.keys(STATUS);
const DAY = 86400000;

function legal(r, today) {
  if (!r.legalDue) return '-';
  const d = Math.round((Date.parse(r.legalDue) - Date.parse(today)) / DAY);
  if (d === 0) return `${r.legalDue} (due today)`;
  if (d < 0) return `${r.legalDue} (${-d} day${d === -1 ? '' : 's'} overdue)`;
  return `${r.legalDue} (${d} day${d === 1 ? '' : 's'} left)`;
}

function term(t) {
  if (!t) return '-';
  const days = t.doubled ? `${t.days} business days, doubled to ${t.days * 2},` : `${t.days} business days`;
  const from = t.dje ? `from DJe availability ${t.start}` : `from intimation ${t.start}`;
  return `${days} ${from}${t.federal ? ', federal court' : ''}`;
}

function fix(r) {
  switch (r.status) {
    case 'OVERDUE': return `Legal due date passed on ${r.legalDue} and the issue is still open`;
    case 'DUE_DATE_TOO_LATE': return `Move the Jira due date back to ${r.legalDue}`;
    case 'MISSING_DUE_DATE': return `Set the Jira due date to ${r.legalDue}`;
    case 'INCOMPLETE': return 'Add labels prazo<N> and intimacao-YYYY-MM-DD';
    case 'DUE_DATE_EARLY': return `Safe, earlier than the legal limit ${r.legalDue}`;
    default: return 'none';
  }
}

/** @param {{today: string, rows: Array<object>}} audit result of auditDeadlines */
export function pageRows(audit) {
  return [...audit.rows]
    .sort((a, b) => RANK.indexOf(a.status) - RANK.indexOf(b.status)
      || (a.legalDue ?? '9999').localeCompare(b.legalDue ?? '9999') || a.key.localeCompare(b.key))
    .map((r) => ({
      key: r.key,
      issue: r.summary ? `${r.key} ${r.summary}` : r.key,
      label: STATUS[r.status].label,
      appearance: STATUS[r.status].appearance,
      term: term(r.term),
      jira: r.jiraDue ?? 'none',
      legal: legal(r, audit.today),
      fix: fix(r),
    }));
}

export function summaryText(audit) {
  const counts = RANK.map((s) => [s, audit.rows.filter((r) => r.status === s).length]).filter(([, n]) => n);
  return `${audit.rows.length} deadline${audit.rows.length === 1 ? '' : 's'} in ${audit.project}: `
    + `${counts.map(([s, n]) => `${n} ${STATUS[s].label}`).join(', ')}.`;
}
