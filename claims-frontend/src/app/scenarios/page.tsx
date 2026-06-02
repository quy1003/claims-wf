'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ScenarioReport } from '@/lib/types';
import { SCENARIOS_META } from '@/lib/types';
import StateBadge from '@/components/StateBadge';
import AuditTimeline from '@/components/AuditTimeline';
import type { ClaimState } from '@/lib/types';

export default function ScenariosPage() {
  const [results, setResults] = useState<Record<number, ScenarioReport>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors]   = useState<Record<number, string>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  const runScenario = async (index: number) => {
    setLoading((prev) => ({ ...prev, [index]: true }));
    setErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setResults((prev) => { const n = { ...prev }; delete n[index]; return n; });
    try {
      const report = await api.runScenario(index);
      setResults((prev) => ({ ...prev, [index]: report }));
    } catch (e: unknown) {
      setErrors((prev) => ({ ...prev, [index]: e instanceof Error ? e.message : 'Scenario failed' }));
    } finally {
      setLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const runAll = async () => {
    for (const { index } of SCENARIOS_META) {
      await runScenario(index);
    }
  };

  const allRan    = SCENARIOS_META.every(({ index }) => results[index] !== undefined || errors[index] !== undefined);
  const allPassed = allRan && SCENARIOS_META.every(({ index }) => results[index]?.success === true);

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Scenario Runner</h1>
          <p>Execute the 6 pre-built business scenarios against the live backend</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {allRan && (
            <div
              className={`badge ${allPassed ? 'badge' : 'badge'}`}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 700,
                background: allPassed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: allPassed ? '#34d399' : '#f87171',
                border: `1px solid ${allPassed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              {allPassed ? '✅ All scenarios passed' : '⚠ Some scenarios need review'}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={runAll}
            disabled={Object.values(loading).some(Boolean)}
            id="run-all-scenarios-btn"
          >
            {Object.values(loading).some(Boolean) ? (
              <><span className="btn-spinner" /> Running…</>
            ) : '▶ Run All (1–6)'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Info */}
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          ℹ Each scenario runs programmatically against your backend, creates real claims in the database,
          and returns a full report with step-by-step execution and immutable audit logs.
        </div>

        {/* Scenario cards */}
        <div className="scenarios-grid">
          {SCENARIOS_META.map(({ index, name, icon, description, tags }) => {
            const isLoading = loading[index];
            const result    = results[index];
            const err       = errors[index];
            const hasResult = !!result || !!err;

            return (
              <div key={index} className="scenario-card">
                {/* Card header */}
                <div className="scenario-card-header">
                  <div className="scenario-icon">{icon}</div>
                  <div>
                    <div className="scenario-num">Scenario {index}</div>
                    <div className="scenario-name">{name}</div>
                  </div>
                  {hasResult && (
                    <div style={{ marginLeft: 'auto' }}>
                      {result?.success
                        ? <span style={{ fontSize: 18 }}>✅</span>
                        : err
                        ? <span style={{ fontSize: 18 }}>💥</span>
                        : <span style={{ fontSize: 18 }}>❌</span>}
                    </div>
                  )}
                </div>

                <div className="scenario-description">{description}</div>

                <div className="scenario-tags">
                  {tags.map((t) => <span key={t} className="scenario-tag">{t}</span>)}
                </div>

                {/* Run button */}
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => runScenario(index)}
                  disabled={isLoading}
                  id={`run-scenario-${index}-btn`}
                >
                  {isLoading ? (
                    <><span className="btn-spinner" /> Running scenario {index}…</>
                  ) : hasResult ? `↻ Re-run Scenario ${index}` : `▶ Run Scenario ${index}`}
                </button>

                {/* Error */}
                {err && (
                  <div className="alert alert-error" style={{ marginTop: 14 }}>
                    💥 {err}
                  </div>
                )}

                {/* Result */}
                {result && (
                  <div className="scenario-result">
                    {/* Pass/Fail badge */}
                    <div className="scenario-result-badge">
                      <span style={{
                        color: result.success ? '#34d399' : '#f87171',
                        background: result.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}>
                        {result.success ? '✅ PASSED' : '❌ FAILED'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Final: <StateBadge state={result.finalState as ClaimState} size="sm" />
                      </span>
                      {result.cycleCount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          cycles: {result.cycleCount}
                        </span>
                      )}
                    </div>

                    {/* Claim link */}
                    <div style={{ marginBottom: 12 }}>
                      <Link
                        href={`/claims/${result.claimId}`}
                        style={{ fontSize: 12, color: 'var(--accent-bright)', fontFamily: 'monospace', textDecoration: 'none' }}
                      >
                        → View claim {result.claimId}
                      </Link>
                    </div>

                    {/* Steps */}
                    <div className="steps-list">
                      {result.stepsExecuted.map((step) => (
                        <div key={step.step} className={`step-item`}>
                          <div className="step-icon">
                            {step.success ? '✓' : '✗'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="step-desc">{step.description}</div>
                            <div className="step-flow">{step.from} → {step.to} [{step.role}]</div>
                            {step.error && <div className="step-error">{step.error}</div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Audit trail toggle */}
                    {result.auditTrail.length > 0 && (
                      <div>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ width: '100%', marginBottom: 10 }}
                          onClick={() => setExpandedLogs((prev) => ({ ...prev, [index]: !prev[index] }))}
                        >
                          {expandedLogs[index] ? '▲ Hide' : '▼ Show'} Audit Trail ({result.auditTrail.length} entries)
                        </button>
                        {expandedLogs[index] && (
                          <AuditTimeline logs={result.auditTrail} />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
