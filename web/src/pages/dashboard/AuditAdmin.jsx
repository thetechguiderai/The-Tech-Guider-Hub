import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon, timeAgo } from '../../components/ui';

const TONE = { success: 'green', failed: 'red', blocked: 'amber', locked: 'red' };

export default function AuditAdmin() {
  const [state, setState] = useState({ loading: true, logs: [], error: null });
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    (async () => {
      try {
        const d = await ownerApi.auditLogs(limit);
        setState({ loading: false, logs: d.logs, error: null });
      } catch {
        setState({ loading: false, logs: [], error: 'Unable to load audit logs.' });
      }
    })();
  }, [limit]);

  async function clear() {
    if (!window.confirm('Clear all audit logs? This cannot be undone.')) return;
    try {
      await ownerApi.clearAudit();
      setState((s) => ({ ...s, logs: [] }));
    } catch {
      /* ignore */
    }
  }

  if (state.loading) return <Spinner label="Loading audit logs…" />;
  if (state.error) return <ErrorState title="Audit logs unavailable" desc={state.error} />;

  return (
    <div>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">A record of important owner actions. Secrets are never logged.</p>
        <div className="flex gap-2">
          {[50, 100, 200].map((n) => (
            <button key={n} className={`chip${limit === n ? ' on' : ''}`} onClick={() => setLimit(n)}>{n}</button>
          ))}
          <button className="btn btn-danger btn-sm" onClick={clear}>
            <Icon.trash size={13} /> Clear
          </button>
        </div>
      </div>

      {state.logs.length === 0 && <EmptyState title="No audit events" desc="Actions taken by the owner will be recorded here." />}

      {state.logs.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Result</th>
                <th>Target / detail</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {state.logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{l.action.replace(/_/g, ' ')}</td>
                  <td><Badge tone={TONE[l.result] || 'gray'}>{l.result}</Badge></td>
                  <td className="text-sm muted">{l.detail || l.target || '—'}</td>
                  <td className="text-sm muted nowrap">{timeAgo(l.created_at + 'Z')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}