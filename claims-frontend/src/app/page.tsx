'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Claim, ClaimState } from '@/lib/types';
import StateBadge from '@/components/StateBadge';
import WorkflowDiagram from '@/components/WorkflowDiagram';

const ALL_STATES: ClaimState[] = [
  'SUBMITTED', 'DOCUMENTS_VERIFIED', 'UNDER_ASSESSMENT', 'PENDING_INFO',
  'APPROVED', 'REJECTED', 'PAYMENT_INITIATED', 'CLOSED',
];

function countByState(claims: Claim[]): Record<string, number> {
  return claims.reduce<Record<string, number>>((acc, c) => {
    acc[c.currentState] = (acc[c.currentState] ?? 0) + 1;
    return acc;
  }, {});
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const [claims, setClaims]     = useState<Claim[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listClaims();
      setClaims(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const stateCount = countByState(claims);
  const activeClaims = claims.filter(
    (c) => c.currentState !== 'CLOSED'
  ).length;
  const cycleWarning = claims.filter((c) => c.cycleCount >= 2).length;

  const recent = [...claims]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>Claims lifecycle overview — AI Challenge 14</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadClaims}
            id="dashboard-refresh-btn"
          >
            ↻ Refresh
          </button>
          <Link href="/claims" className="btn btn-primary btn-sm">
            + New Claim
          </Link>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            ⚠ {error}{' '}
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              — Is the backend running on port 3001?
            </span>
          </div>
        )}

        {/* ─── Stat tiles ─────────────────────────────────────── */}
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-label">Total Claims</div>
            <div className="stat-value">{loading ? '—' : claims.length}</div>
            <div className="stat-sub">all time</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Active</div>
            <div className="stat-value" style={{ background: 'linear-gradient(135deg, #818cf8, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {loading ? '—' : activeClaims}
            </div>
            <div className="stat-sub">in-progress</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Approved</div>
            <div className="stat-value" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {loading ? '—' : (stateCount['APPROVED'] ?? 0) + (stateCount['PAYMENT_INITIATED'] ?? 0) + (stateCount['CLOSED'] ?? 0)}
            </div>
            <div className="stat-sub">approved or closed</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Cycle Warnings</div>
            <div className="stat-value" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {loading ? '—' : cycleWarning}
            </div>
            <div className="stat-sub">≥ 2 info cycles</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Pending Info</div>
            <div className="stat-value" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {loading ? '—' : stateCount['PENDING_INFO'] ?? 0}
            </div>
            <div className="stat-sub">awaiting member</div>
          </div>
        </div>

        {/* ─── Workflow Diagram ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">🗺️ State Machine Overview</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              8 states · 9 transitions · role-gated
            </span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <WorkflowDiagram />
          </div>
        </div>

        {/* ─── Two-column: state distribution + recent claims ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          {/* State distribution */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📊 By State</div>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ALL_STATES.map((state) => {
                  const count = stateCount[state] ?? 0;
                  const pct   = claims.length ? (count / claims.length) * 100 : 0;
                  return (
                    <div key={state}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <StateBadge state={state} size="sm" />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {count}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'var(--accent)',
                            borderRadius: 2,
                            transition: 'width 600ms ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent claims */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🕐 Recent Claims</div>
              <Link href="/claims" className="btn btn-ghost btn-sm">
                View all →
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <div className="skeleton" style={{ width: 200, height: 20, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: 160, height: 16 }} />
                </div>
              ) : recent.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No claims yet</div>
                  <div className="empty-desc">
                    Create your first claim or run a scenario.
                  </div>
                  <Link href="/scenarios" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                    Run a Scenario
                  </Link>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>State</th>
                      <th>Cycles</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((claim) => (
                      <tr key={claim.claimId}>
                        <td>
                          <Link
                            href={`/claims/${claim.claimId}`}
                            className="link-cell"
                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                          >
                            {claim.claimId}
                          </Link>
                        </td>
                        <td><StateBadge state={claim.currentState} size="sm" /></td>
                        <td>
                          <span
                            style={{
                              fontSize: 12,
                              color: claim.cycleCount >= 3 ? 'var(--danger)' : claim.cycleCount >= 2 ? 'var(--warning)' : 'var(--text-muted)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {claim.cycleCount}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{relativeTime(claim.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
