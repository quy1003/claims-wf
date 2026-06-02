import type { AuditLog } from '@/lib/types';
import StateBadge from './StateBadge';
import type { ClaimState } from '@/lib/types';

const ROLE_COLORS: Record<string, string> = {
  document_clerk: '#06b6d4',
  team_lead:      '#8b5cf6',
  assessor:       '#f59e0b',
  finance:        '#10b981',
  system:         '#6b7280',
};

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return ts;
  }
}

interface Props {
  logs: AuditLog[];
}

export default function AuditTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div className="empty-title">No audit entries yet</div>
        <div className="empty-desc">Transition history will appear here once state changes occur.</div>
      </div>
    );
  }

  return (
    <div className="audit-timeline">
      <div className="audit-timeline-line" />
      {logs.map((log, idx) => {
        const roleColor = ROLE_COLORS[log.triggeredByRole] ?? '#6b7280';
        const isFirst   = idx === 0;

        return (
          <div key={log.id} className="audit-entry">
            {/* Dot */}
            <div className="audit-dot-wrap">
              <div
                className="audit-dot"
                style={{
                  background: roleColor,
                  color: roleColor,
                  width: isFirst ? 12 : 10,
                  height: isFirst ? 12 : 10,
                  marginTop: 15,
                }}
              />
            </div>

            {/* Card */}
            <div className="audit-card">
              <div className="audit-card-top">
                <div className="audit-transition">
                  {log.fromState ? (
                    <StateBadge state={log.fromState as ClaimState} size="sm" />
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                  )}
                  <span className="audit-arrow">→</span>
                  <StateBadge state={log.toState as ClaimState} size="sm" />
                </div>
                <div className="audit-time">{formatTs(log.timestamp)}</div>
              </div>

              {log.reason && (
                <div className="audit-reason">&ldquo;{log.reason}&rdquo;</div>
              )}

              <div className="audit-footer">
                <span
                  className="badge"
                  style={{
                    color: roleColor,
                    background: `${roleColor}20`,
                    border: `1px solid ${roleColor}40`,
                    fontSize: 10,
                    padding: '2px 7px',
                  }}
                >
                  {log.triggeredByRole}
                </span>
                <span className="audit-user">@{log.triggeredByUserId}</span>
              </div>

              {/* Context snapshot */}
              {log.context && Object.keys(log.context).length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    context ({Object.keys(log.context).length} fields)
                  </summary>
                  <div className="code-block" style={{ marginTop: 6, fontSize: 11 }}>
                    {JSON.stringify(log.context, null, 2)}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
