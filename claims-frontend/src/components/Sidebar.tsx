'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',          icon: '⬡',  label: 'Dashboard'    },
  { href: '/claims',    icon: '📋', label: 'Claims'       },
  { href: '/scenarios', icon: '⚡', label: 'Scenarios'    },
  { href: '/workflow',  icon: '🗺️', label: 'Workflow Map' },
];

const ROLE_COLORS: Record<string, string> = {
  document_clerk: '#06b6d4',
  team_lead:      '#8b5cf6',
  assessor:       '#f59e0b',
  finance:        '#10b981',
  system:         '#6b7280',
};

interface SidebarProps {
  role?: string;
  username?: string;
  roleLabel?: string;
  onLogout?: () => void;
}

export default function Sidebar({ role, username, roleLabel, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const roleColor = role ? (ROLE_COLORS[role] ?? '#818cf8') : '#818cf8';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <div className="sidebar-logo-symbol">⬡</div>
          <div className="sidebar-logo-text">
            <h2>ClaimsFlow</h2>
            <span>AI Challenge 14</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-item-icon">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Current user info */}
      {username && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          marginTop: 'auto',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Signed in as
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${roleColor}20`,
              border: `1px solid ${roleColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: roleColor, fontWeight: 700,
              flexShrink: 0,
            }}>
              {username[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username}
              </div>
              <div style={{ fontSize: 10, color: roleColor, fontWeight: 600 }}>
                {roleLabel ?? role}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="status-dot" />
          <span>Backend :3001</span>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px',
              borderRadius: 4, transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            id="logout-btn"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
