import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDeadline, skipReason, holidays, auditIssues } from '../src/deadline.js';

test('movable holidays 2027 (Easter 28/03)', () => {
  const h = holidays(2027);
  assert.equal(h.get('2027-02-08'), 'Carnaval (segunda)');
  assert.equal(h.get('2027-03-26'), 'Sexta-feira Santa');
  assert.equal(h.get('2027-05-27'), 'Corpus Christi');
});

test('15 business days from a Thursday intimation skip weekends and Finados/Proclamação/Consciência', () => {
  // Intimation Thu 29/10/2026 -> first day Fri 30/10; 02/11, 15/11(Sun), 20/11 are off.
  const r = computeDeadline({ start: '2026-10-29', days: 15 });
  assert.equal(r.firstDay, '2026-10-30');
  assert.equal(r.dueDate, '2026-11-23');
  assert.ok(r.skipped.some((s) => s.reason === 'Finados'));
  assert.ok(r.skipped.some((s) => s.reason === 'Consciência Negra'));
});

test('DJe availability on Friday: publication Monday, counting from Tuesday', () => {
  const r = computeDeadline({ start: '2026-10-23', days: 5, djeAvailability: true });
  assert.equal(r.publication, '2026-10-26');
  assert.equal(r.firstDay, '2026-10-27');
  assert.equal(r.dueDate, '2026-11-03'); // 27,28,29,30, (02/11 Finados) 03
});

test('recess Dec 20 - Jan 20 suspends the count', () => {
  const r = computeDeadline({ start: '2026-12-17', days: 5 });
  assert.equal(r.firstDay, '2026-12-18');
  assert.equal(r.dueDate, '2027-01-26'); // 18/12, then 21,22,25,26/01
  assert.equal(skipReason('2027-01-20'), 'Recesso forense (CPC art. 220)');
});

test('doubled term for Fazenda Pública', () => {
  assert.equal(computeDeadline({ start: '2026-10-29', days: 15, doubled: true }).businessDays, 30);
});

test('rejects bad input', () => {
  assert.throws(() => computeDeadline({ start: '29/10/2026', days: 15 }));
  assert.throws(() => computeDeadline({ start: '2026-10-29', days: 0 }));
});

test('audit flags late, missing, incomplete and overdue', () => {
  const lab = ['prazo15', 'intimacao-2026-10-29'];
  const out = auditIssues([
    { key: 'LEG-1', summary: 'Contestação', duedate: '2026-11-23', labels: lab, done: false },
    { key: 'LEG-2', summary: 'Recurso', duedate: '2026-11-25', labels: lab, done: false },
    { key: 'LEG-3', summary: 'Réplica', duedate: null, labels: lab, done: false },
    { key: 'LEG-4', summary: 'Sem etiqueta', duedate: null, labels: [], done: false },
    { key: 'LEG-5', summary: 'Embargos', duedate: '2026-11-23', labels: lab, done: false },
  ], '2026-11-01');
  assert.deepEqual(out.map((o) => o.status), ['OK', 'DUE_DATE_TOO_LATE', 'MISSING_DUE_DATE', 'INCOMPLETE', 'OK']);
  assert.equal(auditIssues([{ key: 'X', duedate: '2026-11-23', labels: lab, done: false }], '2026-11-24')[0].status, 'OVERDUE');
});
