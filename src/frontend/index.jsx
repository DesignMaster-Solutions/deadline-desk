import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  DynamicTable, Heading, Lozenge, SectionMessage, Spinner, Stack, Text,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { pageRows, summaryText } from '../view.js';

const HEAD = {
  cells: [
    { key: 'issue', content: 'Deadline' },
    { key: 'status', content: 'Status' },
    { key: 'term', content: 'Term (CPC/2015)' },
    { key: 'jira', content: 'Jira due date' },
    { key: 'legal', content: 'Legal due date' },
    { key: 'fix', content: 'Smallest fix' },
  ],
};

function App() {
  const [audit, setAudit] = useState(null);
  useEffect(() => {
    invoke('overview').then(setAudit, (e) => setAudit({ error: String(e?.message ?? e) }));
  }, []);

  if (!audit) return <Spinner label="Checking every deadline in this project" />;
  if (audit.error) {
    return (
      <SectionMessage appearance="warning" title="Deadline Desk could not audit this project">
        <Text>{audit.error}</Text>
      </SectionMessage>
    );
  }
  if (!audit.rows.length) {
    return (
      <SectionMessage appearance="information" title="No deadlines to audit yet">
        <Text>Label an issue prazo15 and intimacao-2026-10-29 (optional dje, dobro, jf) and set its due date.</Text>
      </SectionMessage>
    );
  }

  const rows = pageRows(audit).map((r) => ({
    key: r.key,
    cells: [
      { key: 'issue', content: r.issue },
      { key: 'status', content: <Lozenge appearance={r.appearance}>{r.label}</Lozenge> },
      { key: 'term', content: r.term },
      { key: 'jira', content: r.jira },
      { key: 'legal', content: r.legal },
      { key: 'fix', content: r.fix },
    ],
  }));

  return (
    <Stack space="space.200">
      <Heading as="h2" size="medium">Are the legal deadlines in this project right?</Heading>
      <Text>
        {`${summaryText(audit)} `}
        Legal dates come from the same rules as the Deadline Desk MCP tools: business days only, national holidays,
        the Dec 20 to Jan 20 recess and DJe publication. Ask Rovo to explain any row.
      </Text>
      <DynamicTable caption={`Deadlines on ${audit.today}, worst first`} head={HEAD} rows={rows} />
    </Stack>
  );
}

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
