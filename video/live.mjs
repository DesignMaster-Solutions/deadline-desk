// Pulls project LEG from the demo Jira site and runs the same audit the MCP tool runs -> video/live.json
import { auditIssues, computeDeadline } from '../src/deadline.js';
import { writeFileSync } from 'node:fs';
const auth = 'Basic ' + Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`).toString('base64');
const r = await fetch('https://dms-release-gate.atlassian.net/rest/api/3/search/jql', { method: 'POST',
  headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ jql: 'project = LEG AND labels is not EMPTY ORDER BY key', fields: ['summary', 'duedate', 'labels', 'status'], maxResults: 100 }) });
if (!r.ok) throw new Error(`Jira ${r.status} ${await r.text()}`);
const issues = (await r.json()).issues.map((i) => ({ key: i.key, summary: i.fields.summary, duedate: i.fields.duedate,
  labels: i.fields.labels ?? [], done: i.fields.status?.statusCategory?.key === 'done' }));
const rows = auditIssues(issues.filter((i) => i.labels.some((l) => /^prazo\d+$/.test(l))), new Date().toISOString().slice(0, 10));
const example = computeDeadline({ start: '2026-10-29', days: 15 });
writeFileSync(new URL('live.json', import.meta.url), JSON.stringify({ issues, rows, example }, null, 1));
console.log(rows.map((x) => `${x.key} ${x.status} jira=${x.jiraDue ?? '-'} legal=${x.legalDue ?? '-'}`).join('\n'));
console.log(example.dueDate, example.skipped.length);
