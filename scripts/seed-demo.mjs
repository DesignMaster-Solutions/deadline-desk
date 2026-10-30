// Seeds a Jira Cloud project "LEG" with litigation deadlines for the demo: some right,
// some with the classic mistakes (calendar days instead of business days, recess ignored,
// doubled term forgotten, no due date, missing labels). Real issues, created through the REST API.
// Usage: JIRA_SITE=https://x.atlassian.net JIRA_EMAIL=... JIRA_TOKEN=... node scripts/seed-demo.mjs [LEG]
import { computeDeadline } from '../src/deadline.js';

const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);

// due: 'legal' = the correct date; a number = calendar days after the intimation (the human error);
// { legalPlus: n } = n days after the legal date (counted from the wrong event); null = no due date.
export const PLAN = [
  { summary: 'Contestação - Silva x Banco Horizonte (0801234-55.2026.8.26.0100)', start: '2026-11-03', days: 15, due: 'legal' },
  { summary: 'Apelação - Construtora Alvorada x Prefeitura de Campinas', start: '2026-11-05', days: 15, due: { legalPlus: 3 } },
  { summary: 'Embargos de declaração - Ferreira x Ferreira', start: '2026-12-15', days: 5, due: 'legal' },
  { summary: 'Réplica - Oliveira Comércio x Transportes Rota Sul', start: '2026-12-10', days: 15, due: 25 },
  { summary: 'Recurso inominado - Município de Santos (prazo em dobro)', start: '2026-11-09', days: 10, doubled: true, due: 10 },
  { summary: 'Contrarrazões - Mendes x Seguradora Atlântica', start: '2026-11-06', days: 15, dje: true, due: null },
  { summary: 'Manifestação sobre laudo pericial - Costa x Hospital Vida', start: '2026-11-11', days: 15, dje: true, due: 'legal' },
  { summary: 'Cumprimento de sentença - impugnação (sem etiqueta de intimação)', days: 15, due: 21, noStart: true },
];

export function plannedIssues() {
  return PLAN.map((p) => {
    const labels = [`prazo${p.days}`];
    if (!p.noStart) labels.push(`intimacao-${p.start}`);
    if (p.dje) labels.push('dje');
    if (p.doubled) labels.push('dobro');
    const legal = p.noStart ? null : computeDeadline({ start: p.start, days: p.days, djeAvailability: !!p.dje, doubled: !!p.doubled }).dueDate;
    const duedate = p.due === 'legal' ? legal : p.due === null ? null : p.due.legalPlus ? addDays(legal, p.due.legalPlus)
      : addDays(p.start ?? '2026-11-03', p.due);
    return { summary: p.summary, labels, duedate };
  });
}

async function main([projectKey = 'LEG']) {
  const { JIRA_SITE, JIRA_EMAIL, JIRA_TOKEN } = process.env;
  if (!JIRA_SITE || !JIRA_EMAIL || !JIRA_TOKEN) throw new Error('usage: JIRA_SITE JIRA_EMAIL JIRA_TOKEN node scripts/seed-demo.mjs [PROJECT]');
  const auth = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
  const jira = async (method, path, body) => {
    const r = await fetch(`${JIRA_SITE}/rest/api/3${path}`, {
      method, headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (!r.ok && !(method === 'GET' && r.status === 404)) throw new Error(`${method} ${path} -> ${r.status} ${await r.text()}`);
    return r.status === 204 || r.status === 404 ? null : r.json();
  };
  const me = await jira('GET', '/myself');
  let project = await jira('GET', `/project/${projectKey}`);
  if (!project) {
    await jira('POST', '/project', {
      key: projectKey, name: 'Litígios - prazos', leadAccountId: me.accountId, projectTypeKey: 'software',
      projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-simplified-kanban-classic', assigneeType: 'PROJECT_LEAD',
    });
    project = await jira('GET', `/project/${projectKey}`);
  }
  const type = project.issueTypes.find((t) => t.name === 'Task' || t.name === 'Tarefa') ?? project.issueTypes.find((t) => !t.subtask);
  for (const i of plannedIssues()) {
    const fields = { project: { id: project.id }, summary: i.summary, issuetype: { id: type.id }, labels: i.labels };
    if (i.duedate) fields.duedate = i.duedate;
    const created = await jira('POST', '/issue', { fields });
    console.log(created.key, i.duedate ?? '-', i.labels.join(' '), i.summary);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
