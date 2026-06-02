'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const DEMO_USERS = [
  { username: 'clerk_01',    password: 'password123', role: 'document_clerk', label: 'Document Clerk' },
  { username: 'lead_01',     password: 'password123', role: 'team_lead',      label: 'Team Lead'      },
  { username: 'assessor_02', password: 'password123', role: 'assessor',       label: 'Assessor'       },
  { username: 'finance_01',  password: 'password123', role: 'finance',        label: 'Finance'        },
  { username: 'system_user', password: 'password123', role: 'system',         label: 'System'         },
];

const ROLE_COLORS: Record<string, string> = {
  document_clerk: '#06b6d4',
  team_lead:      '#8b5cf6',
  assessor:       '#f59e0b',
  finance:        '#10b981',
  system:         '#6b7280',
};

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async (u?: string, p?: string) => {
    const uname = u ?? username;
    const pass  = p ?? password;
    if (!uname || !pass) { setError('Enter username and password'); return; }
    setLoading(true);
    setError(null);
    try {
      await login(uname, pass);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'var(--bg-deep)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', top: -200, left: -100, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', bottom: -150, right: -100, filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 14px',
            boxShadow: '0 0 40px rgba(99,102,241,0.4)',
          }}>
            ⬡
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            ClaimsFlow
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 1 }}>
            AI CHALLENGE 14 · WORKFLOW ORCHESTRATOR
          </p>
        </div>

        {/* Login card */}
        <div style={{
          background: 'rgba(13, 18, 36, 0.9)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 20,
          padding: '28px 28px 24px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.08)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Sign in</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use a demo role account below or enter credentials manually</div>
          </div>

          {/* Manual credentials */}
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. clerk_01"
                id="login-username-input"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                id="login-password-input"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 20 }}
            onClick={() => handleLogin()}
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? <><span className="btn-spinner" /> Signing in…</> : 'Sign In →'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Or sign in as</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Quick role buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_USERS.map((u) => {
              const color = ROLE_COLORS[u.role];
              return (
                <button
                  key={u.username}
                  className="btn"
                  style={{
                    background: `${color}12`,
                    border: `1px solid ${color}35`,
                    color,
                    justifyContent: 'flex-start',
                    gap: 10,
                    fontSize: 13,
                  }}
                  onClick={() => handleLogin(u.username, u.password)}
                  disabled={loading}
                  id={`login-as-${u.role}-btn`}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{u.label}</span>
                  <span style={{ fontSize: 11, opacity: 0.6, fontFamily: 'monospace' }}>{u.username}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          Backend must be running at <span style={{ fontFamily: 'monospace', color: 'var(--accent-bright)' }}>localhost:3001</span>
        </p>
      </div>
    </div>
  );
}
