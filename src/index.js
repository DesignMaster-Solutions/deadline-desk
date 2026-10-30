import api, { route } from '@forge/api';
import { computeDeadline, auditIssues } from './deadline.js';

export async function computeDeadlineAction(payload) {
  try {
    return computeDeadline({
      start: payload.startDate,
      days: Number(payload.days),
      djeAvailability: payload.djeAvailability === true || payload.djeAvailability === 'true',
      doubled: payload.doubled === true || payload.doubled === 'true',
    });
  } catch (e) {
    return { error: e.message };
  }
}

export async function auditDeadlines(payload) {
  const projectKey = (payload.projectKey ?? payload.context?.jira?.projectKey ?? '').toUpperCase();
  if (!/^[A-Z][A-Z0-9_]+$/.test(projectKey)) return { error: 'Ask the user for the Jira project key.' };
  try {
    const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql: `project = ${projectKey} AND labels ~ "prazo*" ORDER BY duedate`, fields: ['summary', 'duedate', 'labels', 'status'], maxResults: 100 }),
    });
    if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
    const { issues } = await res.json(); // shortcut: first 100 deadline issues, paginate if a team tracks more
    const today = new Date().toISOString().slice(0, 10);
    const rows = auditIssues(issues.map((i) => ({ key: i.key, summary: i.fields.summary, duedate: i.fields.duedate,
      labels: i.fields.labels ?? [], done: i.fields.status?.statusCategory?.key === 'done' })), today);
    return { project: projectKey, today, problems: rows.filter((r) => r.status !== 'OK').length, rows };
  } catch (e) {
    return { error: e.message };
  }
}
