import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Claims Workflow Orchestrator',
  description:
    'AI Challenge 14 — Config-driven insurance claim lifecycle orchestrator with role-based state machine, cycle limits, and immutable audit logs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
