import test from 'node:test';
import assert from 'node:assert/strict';
import { auditIssues } from '../src/deadline.js';
import { pageRows, summaryText } from '../src/view.js';

const lab = ['prazo15', 'intimacao-2026-10-29']; // legal due 2026-11-23

const audit = (today) => {
  const rows = auditIssues([
    { key: 'LEG-1', summary: 'Contestação', duedate: '2026-11-23', labels: lab, done: false },
    { key: 'LEG-2', summary: 'Recurso', duedate: '2026-11-25', labels: lab, done: false },
    { key: 'LEG-3', summary: 'Réplica', duedate: null, labels: lab, done: false },
    { key: 'LEG-4', summary: 'Sem etiqueta', duedate: null, labels: [], done: false },
    { key: 'LEG-5', summary: 'Embargos', duedate: '2026-11-20', labels: [...lab, 'dobro'], done: false },
  ], today);
  return { project: 'LEG', today, problems: rows.filter((r) => r.status !== 'OK').length, rows };
};

test('page rows: worst first, each with its lozenge, both dates and the smallest fix', () => {
  const rows = pageRows(audit('2026-11-04'));
  assert.deepEqual(rows.map((r) => [r.key, r.label, r.appearance]), [
    ['LEG-2', 'Jira date too late', 'danger'],
    ['LEG-3', 'No due date', 'warning'],
    ['LEG-4', 'Missing labels', 'warning'],
    ['LEG-5', 'Jira date early', 'information'],
    ['LEG-1', 'OK', 'success'],
  ]);
  const late = rows[0];
  assert.equal(late.issue, 'LEG-2 Recurso');
  assert.equal(late.term, '15 business days from intimation 2026-10-29');
  assert.equal(late.jira, '2026-11-25');
  assert.equal(late.legal, '2026-11-23 (19 days left)');
  assert.equal(late.fix, 'Move the Jira due date back to 2026-11-23');
  assert.equal(rows[1].fix, 'Set the Jira due date to 2026-11-23');
  assert.equal(rows[2].legal, '-');
  assert.match(rows[2].fix, /prazo<N> and intimacao-YYYY-MM-DD/);
  assert.equal(rows[3].term, '15 business days, doubled to 30, from intimation 2026-10-29');
  assert.equal(rows[4].fix, 'none');
});

test('an open deadline past the legal date is the first row and says how late it is', () => {
  const rows = pageRows(audit('2026-11-26'));
  assert.equal(rows[0].label, 'Overdue');
  assert.equal(rows[0].appearance, 'danger');
  assert.equal(rows[0].legal, '2026-11-23 (3 days overdue)');
});

test('summary counts every status in the project', () => {
  assert.equal(summaryText(audit('2026-11-04')),
    '5 deadlines in LEG: 1 Jira date too late, 1 No due date, 1 Missing labels, 1 Jira date early, 1 OK.');
});
