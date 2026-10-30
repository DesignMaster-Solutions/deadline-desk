import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plannedIssues } from '../scripts/seed-demo.mjs';
import { auditIssues } from '../src/deadline.js';

test('demo seed covers every audit status', () => {
  const rows = auditIssues(plannedIssues().map((i, n) => ({ key: `LEG-${n + 1}`, ...i, done: false })), '2026-11-01');
  const statuses = new Set(rows.map((r) => r.status));
  for (const s of ['OK', 'DUE_DATE_TOO_LATE', 'MISSING_DUE_DATE', 'INCOMPLETE']) assert.ok(statuses.has(s), `${s} missing: ${[...statuses]}`);
});
