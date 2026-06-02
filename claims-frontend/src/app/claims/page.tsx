'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Claim } from '@/lib/types';
import StateBadge from '@/components/StateBadge';

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ClaimsPage() {
  const [claims, setClaims]         = useState<Claim[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create form fields
  const [customId, setCustomId]         = useState('');
  const [description, setDescription]   = useState('');
  const [patientName, setPatientName]   = useState('');
  const [claimAmount, setClaimAmount]   = useState('');
  const [policyLimit, setPolicyLimit]   = useState('');

  // Search / filter
  const [search, setSearch]   = useState('');
  const [stateFilter, setStateFilter] = useState('');

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

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const metadata: Record<string, unknown> = {};
      if (description)  metadata.description  = description;
      if (patientName)  metadata.patientName   = patientName;
      if (claimAmount)  metadata.claimAmount   = Number(claimAmount);
      if (policyLimit)  metadata.policyLimit   = Number(policyLimit);

      await api.createClaim({
        claimId: customId.trim() || undefined,
        metadata,
      });
      setShowCreate(false);
      setCustomId(''); setDescription(''); setPatientName(''); setClaimAmount(''); setPolicyLimit('');
      loadClaims();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create claim');
    } finally {
      setCreating(false);
    }
  };

  const filtered = claims.filter((c) => {
    const matchId    = c.claimId.toLowerCase().includes(search.toLowerCase());
    const matchState = !stateFilter || c.currentState === stateFilter;
    return matchId && matchState;
  });

  const uniqueStates = [...new Set(claims.map((c) => c.currentState))].sort();

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Claims</h1>
          <p>Manage and transition insurance claims</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
          id="create-claim-btn"
        >
          + New Claim
        </button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠ {error}</div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="Search by Claim ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="claim-search-input"
          />
          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All states</option>
            {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={loadClaims}>↻ Refresh</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            {filtered.length} of {claims.length} claims
          </span>
        </div>

        {/* Claims grid */}
        {loading ? (
          <div className="claims-grid">
            {[1,2,3,4].map((i) => (
              <div key={i} className="claim-card">
                <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">{search || stateFilter ? 'No matching claims' : 'No claims yet'}</div>
              <div className="empty-desc">
                {search || stateFilter
                  ? 'Try adjusting your search or filter.'
                  : 'Create a claim manually or run a scenario to generate test data.'}
              </div>
              {!search && !stateFilter && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Claim</button>
                  <Link href="/scenarios" className="btn btn-secondary">Run Scenario</Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="claims-grid">
            {filtered.map((claim) => (
              <Link key={claim.claimId} href={`/claims/${claim.claimId}`} style={{ textDecoration: 'none' }}>
                <div className="claim-card">
                  <div className="claim-card-header">
                    <div>
                      <div className="claim-id">{claim.claimId}</div>
                      {claim.metadata?.patientName != null && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {String(claim.metadata.patientName)}
                        </div>
                      )}

                    </div>
                    <StateBadge state={claim.currentState} />
                  </div>

                  {claim.metadata?.description != null && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginBottom: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {String(claim.metadata.description)}
                    </div>
                  )}

                  <div className="claim-card-meta">
                    <div className="claim-meta-row">
                      <span>Info request cycles</span>
                      <div className="cycle-indicator">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className={`cycle-dot ${
                              claim.cycleCount >= n
                                ? claim.cycleCount >= 3 ? 'max' : 'active'
                                : ''
                            }`}
                          />
                        ))}
                        <span style={{ fontSize: 11, marginLeft: 4, fontFamily: 'monospace' }}>
                          {claim.cycleCount}/3
                        </span>
                      </div>
                    </div>
                    <div className="claim-meta-row">
                      <span>Last updated</span>
                      <span>{relativeTime(claim.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Create New Claim</div>
                <div className="modal-subtitle">Will be initialized in SUBMITTED state</div>
              </div>
              <button className="btn-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Custom Claim ID (optional)</label>
                  <input
                    className="form-input"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="Auto-generated if empty"
                    id="new-claim-id-input"
                  />
                  <div className="form-hint">e.g. CLM-2024-001</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Patient Name</label>
                  <input
                    className="form-input"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="John Doe"
                    id="new-claim-patient-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Claim Description</label>
                  <textarea
                    className="form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the insurance claim…"
                    rows={3}
                    id="new-claim-desc-input"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Claim Amount</label>
                    <input
                      className="form-input"
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder="1200"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Policy Limit</label>
                    <input
                      className="form-input"
                      type="number"
                      value={policyLimit}
                      onChange={(e) => setPolicyLimit(e.target.value)}
                      placeholder="2000"
                    />
                  </div>
                </div>
                {createError && <div className="alert alert-error">⚠ {createError}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating}
                id="create-claim-submit-btn"
              >
                {creating ? <><span className="btn-spinner" /> Creating…</> : '+ Create Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
