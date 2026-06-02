import type { ClaimState } from '@/lib/types';

const STATE_CONFIG: Record<
  ClaimState,
  { label: string; color: string; bg: string; border: string }
> = {
  SUBMITTED:          { label: 'Submitted',         color: '#818cf8', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.3)'  },
  DOCUMENTS_VERIFIED: { label: 'Docs Verified',     color: '#22d3ee', bg: 'rgba(6,182,212,0.12)',    border: 'rgba(6,182,212,0.3)'   },
  UNDER_ASSESSMENT:   { label: 'Under Assessment',  color: '#c084fc', bg: 'rgba(139,92,246,0.12)',   border: 'rgba(139,92,246,0.3)'  },
  PENDING_INFO:       { label: 'Pending Info',      color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)'  },
  APPROVED:           { label: 'Approved',          color: '#34d399', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.3)'  },
  REJECTED:           { label: 'Rejected',          color: '#f87171', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.3)'   },
  PAYMENT_INITIATED:  { label: 'Payment Initiated', color: '#2dd4bf', bg: 'rgba(13,148,136,0.12)',   border: 'rgba(13,148,136,0.3)'  },
  CLOSED:             { label: 'Closed',            color: '#6b7280', bg: 'rgba(55,65,81,0.3)',      border: 'rgba(107,114,128,0.3)' },
};

interface StateBadgeProps {
  state: ClaimState | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StateBadge({ state, size = 'md' }: StateBadgeProps) {
  const cfg = STATE_CONFIG[state as ClaimState] ?? {
    label: state,
    color: '#6b7280',
    bg: 'rgba(55,65,81,0.3)',
    border: 'rgba(107,114,128,0.3)',
  };

  const fontSize = size === 'sm' ? '10px' : size === 'lg' ? '13px' : '11px';
  const padding  = size === 'sm' ? '2px 7px' : size === 'lg' ? '5px 14px' : '3px 10px';
  const dotSize  = size === 'sm' ? '5px' : size === 'lg' ? '8px' : '6px';

  return (
    <span
      className="badge"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontSize,
        padding,
      }}
    >
      <span
        className="badge-dot"
        style={{ width: dotSize, height: dotSize, background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }}
      />
      {cfg.label}
    </span>
  );
}
