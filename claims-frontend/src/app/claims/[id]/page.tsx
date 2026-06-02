'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Claim, AuditLog, ClaimState } from '@/lib/types';
import StateBadge from '@/components/StateBadge';
import AuditTimeline from '@/components/AuditTimeline';
import TransitionModal from '@/components/TransitionModal';
import WorkflowDiagram from '@/components/WorkflowDiagram';

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [claim, setClaim]           = useState<Claim | null>(null);
  const [auditLogs, setAuditLogs]   = useState<AuditLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showTransition, setShowTransition] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [claimData, logs] = await Promise.all([
        api.getClaim(id),
        api.getAuditTrail(id),
      ]);
      setClaim(claimData);
      setAuditLogs(logs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTransitionSuccess = () => {
    setShowTransition(false);
    setLoading(true);
    loadData();
  };

  // Build visited states from audit trail
  const visitedStates = [
    ...new Set(auditLogs.flatMap((l) => [l.fromState, l.toState].filter(Boolean) as string[])),
  ];

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="page-title">
            <div className="skeleton" style={{ height: 30, width: 200, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: 300 }} />
          </div>
        </div>
        <div className="page-body">
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        </div>
      </>
    );
  }

  if (error || !claim) {
    return (
      <>
        <div className="page-header">
          <div className="page-title">
            <h1>Claim Not Found</h1>
          </div>
        </div>
        <div className="page-body">
          <div className="alert alert-error">⚠ {error ?? 'Claim not found'}</div>
          <Link href="/claims" className="btn btn-secondary" style={{ marginTop: 16 }}>
            ← Back to Claims
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Link href="/claims" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
              Claims
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent-bright)' }}>{claim.claimId}</span>
          </div>
          <h1 style={{ fontSize: 22 }}>{String(claim.metadata?.description ?? claim.claimId)}</h1>
          <p>{String(claim.metadata?.patientName ?? '')} · Cycle count: {claim.cycleCount}/3</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); loadData(); }}>
            ↻ Refresh
          </button>
          {claim.currentState !== 'CLOSED' && (
            <button
              className="btn btn-primary"
              onClick={() => setShowTransition(true)}
              id="trigger-transition-btn"
            >
              ⚡ Trigger Transition
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* ─── Info tiles ─────────────────────────────────────────── */}
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-label">Current State</div>
            <div style={{ marginTop: 8 }}>
              <StateBadge state={claim.currentState} size="lg" />
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Cycle Count</div>
            <div className="stat-value" style={{
              color: claim.cycleCount >= 3 ? 'var(--danger)' : claim.cycleCount >= 2 ? 'var(--warning)' : undefined
            }}>
              {claim.cycleCount}
            </div>
            <div className="stat-sub">/ 3 max</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Audit Entries</div>
            <div className="stat-value">{auditLogs.length}</div>
            <div className="stat-sub">immutable logs</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Pending Transitions</div>
            <div className="stat-value">{claim.availableTransitions?.length ?? 0}</div>
            <div className="stat-sub">from current state</div>
          </div>
        </div>

        {/* Cycle warning */}
        {claim.cycleCount >= 3 && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            ⛔ This claim has reached the maximum info request cycle limit (3/3).
            Any further PENDING_INFO requests will be blocked and escalated.
          </div>
        )}
        {claim.cycleCount === 2 && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            ⚠ This claim is at 2/3 info request cycles. One more request will hit the limit.
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }}>
          {/* Left column */}
          <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {/* Workflow diagram */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🗺️ Workflow Position</div>
                <StateBadge state={claim.currentState} />
              </div>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                <WorkflowDiagram
                  activeState={claim.currentState as ClaimState}
                  visitedStates={visitedStates}
                />
              </div>
            </div>

            {/* Available Transitions */}
            {claim.availableTransitions && claim.availableTransitions.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">→ Available Transitions</div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {claim.availableTransitions.map((t) => (
                      <div
                        key={t.to}
                        style={{
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
                          <StateBadge state={t.to as ClaimState} size="sm" />
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            {t.authorizedRoles.map((r) => (
                              <span key={r} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-bright)', borderRadius: 4, border: '1px solid rgba(99,102,241,0.2)' }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        {t.preconditions.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Preconditions: {t.preconditions.map((p) => p.field ?? 'or-group').join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audit trail */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📜 Audit Trail</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>immutable · {auditLogs.length} entries</span>
              </div>
              <div className="card-body">
                <AuditTimeline logs={auditLogs} />
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ flex: '1 1 320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Claim metadata */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📄 Metadata</div>
              </div>
              <div className="card-body" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Claim ID', value: claim.claimId },
                    { label: 'Created', value: new Date(claim.createdAt).toLocaleString('vi-VN') },
                    { label: 'Updated', value: new Date(claim.updatedAt).toLocaleString('vi-VN') },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {value}
                      </div>
                    </div>
                  ))}

                  {Object.keys(claim.metadata ?? {}).length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                        User Metadata
                      </div>
                      <div className="code-block" style={{ fontSize: 11 }}>
                        {JSON.stringify(claim.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action */}
            {claim.currentState !== 'CLOSED' && (
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => setShowTransition(true)}
                id="quick-transition-btn"
              >
                ⚡ Trigger Transition
              </button>
            )}
            {claim.currentState === 'CLOSED' && (
              <div className="alert alert-info">
                ✓ This claim is CLOSED. No further transitions are possible.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transition Modal */}
      {showTransition && claim && (
        <TransitionModal
          claim={claim}
          onSuccess={handleTransitionSuccess}
          onClose={() => setShowTransition(false)}
        />
      )}
    </>
  );
}
