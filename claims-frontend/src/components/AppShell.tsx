'use client';

import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';
import LoginPage from './LoginPage';

const ROLE_LABELS: Record<string, string> = {
  document_clerk: 'Document Clerk',
  team_lead:      'Team Lead',
  assessor:       'Assessor',
  finance:        'Finance',
  system:         'System',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token, isLoading, role, username, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deep)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48,
            border: '3px solid rgba(99,102,241,0.2)',
            borderTop: '3px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        role={role ?? undefined}
        username={username ?? undefined}
        roleLabel={role ? (ROLE_LABELS[role] ?? role) : undefined}
        onLogout={logout}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
