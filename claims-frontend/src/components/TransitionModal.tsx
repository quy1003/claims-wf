'use client';

import { useState, useCallback } from 'react';
import type { Claim, TransitionRequest, UserRole, AvailableTransition } from '@/lib/types';
import { api } from '@/lib/api';
import StateBadge from './StateBadge';
import type { ClaimState } from '@/lib/types';

interface Props {
  claim: Claim;
  onSuccess: () => void;
  onClose: () => void;
}

const ROLES: UserRole[] = ['document_clerk', 'team_lead', 'assessor', 'finance', 'system'];

/** Build context fields based on available transition's preconditions */
function buildContextSchema(
  transition: AvailableTransition | null,
  toState: string
): Array<{ key: string; type: 'boolean' | 'number' | 'string' }> {
  if (!transition) return [];
  const fields: Array<{ key: string; type: 'boolean' | 'number' | 'string' }> = [];

  function recurse(precs: AvailableTransition['preconditions']) {
    for (const prec of precs) {
      if (prec.field) {
        if (prec.operator === 'equals' && typeof prec.value === 'boolean') {
          fields.push({ key: prec.field, type: 'boolean' });
        } else if (prec.operator === 'lessThanOrEqualField' && prec.compareField) {
          if (!fields.find((f) => f.key === prec.field)) fields.push({ key: prec.field!, type: 'number' });
          if (!fields.find((f) => f.key === prec.compareField)) fields.push({ key: prec.compareField!, type: 'number' });
        } else if (prec.operator === 'notEmpty') {
          fields.push({ key: prec.field, type: 'string' });
        }
      }
      if (prec.conditions) recurse(prec.conditions);
    }
  }

  recurse(transition.preconditions);

  // Add common fields for certain target states
  if (toState === 'APPROVED' && !fields.find((f) => f.key === 'claimAmount')) {
    fields.push({ key: 'claimAmount', type: 'number' });
    fields.push({ key: 'policyLimit', type: 'number' });
  }

  return fields;
}

export default function TransitionModal({ claim, onSuccess, onClose }: Props) {
  const [toState, setToState]   = useState('');
  const [role, setRole]         = useState<UserRole>('document_clerk');
  const [userId, setUserId]     = useState('user_01');
  const [reason, setReason]     = useState('');
  const [context, setContext]   = useState<Record<string, unknown>>({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const availableTransitions = claim.availableTransitions ?? [];

  // Derive selected transition object
  const selectedTransition = availableTransitions.find((t) => t.to === toState) ?? null;
  const contextSchema = buildContextSchema(selectedTransition, toState);

  const handleToStateChange = useCallback((val: string) => {
    setToState(val);
    setContext({});
    setError(null);
    // Auto-fill role from transition config
    const tr = availableTransitions.find((t) => t.to === val);
    if (tr?.authorizedRoles?.length) setRole(tr.authorizedRoles[0] as UserRole);
  }, [availableTransitions]);

  const updateContext = (key: string, value: unknown) => {
    setContext((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!toState) { setError('Please select a target state'); return; }
    if (!reason.trim()) { setError('Please provide a reason for this transition'); return; }

    const payload: TransitionRequest = {
      toState: toState as ClaimState,
      reason: reason.trim(),
      role,
      userId: userId.trim() || 'user_01',
      context,
    };

    setLoading(true);
    setError(null);
    try {
      await api.transition(claim.claimId, payload);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transition failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Trigger State Transition</div>
            <div className="modal-subtitle">{claim.claimId}</div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="form-grid">
            {/* Current state info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current state:</span>
              <StateBadge state={claim.currentState} />
              {claim.cycleCount > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--warning)', fontFamily: 'monospace' }}>
                  cycle {claim.cycleCount}/3
                </span>
              )}
            </div>

            {/* Target state */}
            <div className="form-group">
              <label className="form-label">Target State *</label>
              <select
                className="form-select"
                value={toState}
                onChange={(e) => handleToStateChange(e.target.value)}
              >
                <option value="">— Select transition —</option>
                {availableTransitions.map((t) => (
                  <option key={t.to} value={t.to}>
                    {t.to} (roles: {t.authorizedRoles.join(', ')})
                  </option>
                ))}
              </select>
              {availableTransitions.length === 0 && (
                <div className="form-hint" style={{ color: 'var(--warning)' }}>
                  No transitions available from current state
                </div>
              )}
            </div>

            {/* Role */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Acting Role *</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">User ID</label>
                <input
                  className="form-input"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="user_01"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label">Reason / Justification *</label>
              <textarea
                className="form-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for this state transition…"
                rows={3}
              />
            </div>

            {/* Dynamic context fields */}
            {contextSchema.length > 0 && (
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>
                  Precondition Context
                </div>
                <div className="toggle-group">
                  {contextSchema.map(({ key, type }) => {
                    const val = context[key];

                    if (type === 'boolean') {
                      return (
                        <div key={key} className="toggle-item">
                          <div className="toggle-info">
                            <div className="toggle-label">{key}</div>
                            <div className="toggle-desc">boolean precondition</div>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) => updateContext(key, e.target.checked)}
                            />
                            <span className="toggle-track" />
                          </label>
                        </div>
                      );
                    }

                    if (type === 'number') {
                      return (
                        <div key={key} className="form-group">
                          <label className="form-label">{key}</label>
                          <input
                            className="form-input"
                            type="number"
                            value={String(val ?? '')}
                            onChange={(e) => updateContext(key, Number(e.target.value))}
                            placeholder="Enter numeric value"
                          />
                        </div>
                      );
                    }

                    // string
                    return (
                      <div key={key} className="form-group">
                        <label className="form-label">{key}</label>
                        <input
                          className="form-input"
                          value={String(val ?? '')}
                          onChange={(e) => updateContext(key, e.target.value)}
                          placeholder={`Enter ${key}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error / Success */}
            {error && <div className="alert alert-error">⚠ {error}</div>}
            {success && <div className="alert alert-success">✓ Transition successful!</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || success || !toState}
            id="transition-submit-btn"
          >
            {loading ? <><span className="btn-spinner" /> Submitting…</> : '⚡ Execute Transition'}
          </button>
        </div>
      </div>
    </div>
  );
}
