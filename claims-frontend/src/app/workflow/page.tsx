'use client';

import WorkflowDiagram from '@/components/WorkflowDiagram';

const STATES = [
  { id: 'SUBMITTED',          label: 'Submitted',          desc: 'Claim received, awaiting document verification',              color: '#6366f1' },
  { id: 'DOCUMENTS_VERIFIED', label: 'Documents Verified', desc: 'All required documents confirmed present and valid',          color: '#06b6d4' },
  { id: 'UNDER_ASSESSMENT',   label: 'Under Assessment',   desc: 'Assessor is reviewing the claim details and evidence',        color: '#8b5cf6' },
  { id: 'PENDING_INFO',       label: 'Pending Info',       desc: 'Additional information requested from the member (max 3×)',   color: '#f59e0b' },
  { id: 'APPROVED',           label: 'Approved',           desc: 'Claim approved for payment processing',                       color: '#10b981' },
  { id: 'REJECTED',           label: 'Rejected',           desc: 'Claim denied with appeal instructions sent',                  color: '#ef4444' },
  { id: 'PAYMENT_INITIATED',  label: 'Payment Initiated',  desc: 'Payment transfer has been initiated in the banking system',   color: '#0d9488' },
  { id: 'CLOSED',             label: 'Closed',             desc: 'Claim lifecycle fully complete and archived',                  color: '#4b5563' },
];

const TRANSITIONS = [
  { from: 'SUBMITTED',          to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', condition: 'allDocumentsPresent = true' },
  { from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT',   role: 'team_lead',       condition: 'assessorAssigned = true' },
  { from: 'UNDER_ASSESSMENT',   to: 'APPROVED',           role: 'assessor',        condition: 'assessmentReportComplete = true & claimAmount ≤ policyLimit' },
  { from: 'UNDER_ASSESSMENT',   to: 'REJECTED',           role: 'assessor',        condition: 'assessmentReportComplete = true & rejectionReason ≠ empty' },
  { from: 'UNDER_ASSESSMENT',   to: 'PENDING_INFO',       role: 'assessor',        condition: 'missingInfoDescription ≠ empty' },
  { from: 'PENDING_INFO',       to: 'DOCUMENTS_VERIFIED', role: 'document_clerk',  condition: 'newInfoReceived = true' },
  { from: 'APPROVED',           to: 'PAYMENT_INITIATED',  role: 'finance',         condition: 'paymentRequestCreated = true' },
  { from: 'PAYMENT_INITIATED',  to: 'CLOSED',             role: 'finance',         condition: 'paymentConfirmed = true' },
  { from: 'REJECTED',           to: 'CLOSED',             role: 'system',          condition: 'appealPeriodExpired = true OR memberAcknowledged = true' },
];

const ROLE_COLORS: Record<string, string> = {
  document_clerk: '#06b6d4',
  team_lead:      '#8b5cf6',
  assessor:       '#f59e0b',
  finance:        '#10b981',
  system:         '#6b7280',
};

export default function WorkflowPage() {
  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>Workflow Map</h1>
          <p>Complete state machine definition · 8 states · 9 transitions · config-driven</p>
        </div>
      </div>

      <div className="page-body">
        {/* Full diagram */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <div className="card-title">🗺️ State Machine Diagram</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loaded from config/workflow-config.json</span>
          </div>
          <div className="card-body" style={{ padding: '16px 12px' }}>
            <WorkflowDiagram />
          </div>
        </div>

        {/* Role legend */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <div className="card-title">👥 Role Legend</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(ROLE_COLORS).map(([role, color]) => (
                <div
                  key={role}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px',
                    background: `${color}15`,
                    border: `1px solid ${color}40`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ width: 12, height: 12, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: 13, color, fontWeight: 600 }}>{role.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column: States + Transitions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* States table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⬡ States (8)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>State</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {STATES.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px',
                          background: `${s.color}15`,
                          border: `1px solid ${s.color}40`,
                          borderRadius: 6,
                          color: s.color,
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 6, height: 6, background: s.color, borderRadius: '50%', boxShadow: `0 0 4px ${s.color}` }} />
                          {s.id}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transitions table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">→ Transitions (9)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From → To</th>
                    <th>Role</th>
                    <th>Precondition</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSITIONS.map((t, i) => {
                    const roleColor = ROLE_COLORS[t.role] ?? '#6b7280';
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {t.from}<br />
                          <span style={{ color: 'var(--text-muted)' }}>→ {t.to}</span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: 10, padding: '2px 7px',
                            background: `${roleColor}15`,
                            border: `1px solid ${roleColor}40`,
                            color: roleColor, borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                            {t.role}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {t.condition}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Business rules */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-title">⚖️ Business Rules</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {[
                { icon: '🔒', title: 'Role-Based Access Control', desc: 'Every transition enforces role authorization. Unauthorized role attempts are immediately blocked with a 403 error.' },
                { icon: '📋', title: 'Precondition Guards', desc: 'Before any state change, all preconditions in the workflow config are evaluated. Missing context fields will fail the transition.' },
                { icon: '🔄', title: 'Cycle Limit (max 3)', desc: 'The UNDER_ASSESSMENT → PENDING_INFO transition can only occur up to 3 times. The 4th attempt is blocked and triggers escalation.' },
                { icon: '📜', title: 'Immutable Audit Logs', desc: 'Every successful transition writes an append-only audit log entry to the database. Logs are deeply frozen and cannot be modified.' },
                { icon: '🔀', title: 'Transaction Safety', desc: 'State update and audit log write are executed in a single database transaction. Failures at any point trigger a full rollback.' },
                { icon: '⚡', title: 'Side Effects', desc: 'Each transition may trigger configured side effects (notifications, payment requests, archive actions) after the transition commits.' },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    padding: '16px 18px',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
