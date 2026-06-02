'use client';

import type { ClaimState } from '@/lib/types';

// ─── Layout definitions ──────────────────────────────────────────────────────
const NODES: Array<{ id: ClaimState; label: string; x: number; y: number; color: string }> = [
  { id: 'SUBMITTED',          label: 'SUBMITTED',          x: 80,   y: 180, color: '#6366f1' },
  { id: 'DOCUMENTS_VERIFIED', label: 'DOCS\nVERIFIED',     x: 290,  y: 80,  color: '#06b6d4' },
  { id: 'UNDER_ASSESSMENT',   label: 'UNDER\nASSESSMENT', x: 510,  y: 180, color: '#8b5cf6' },
  { id: 'PENDING_INFO',       label: 'PENDING\nINFO',      x: 290,  y: 280, color: '#f59e0b' },
  { id: 'APPROVED',           label: 'APPROVED',           x: 730,  y: 80,  color: '#10b981' },
  { id: 'REJECTED',           label: 'REJECTED',           x: 730,  y: 280, color: '#ef4444' },
  { id: 'PAYMENT_INITIATED',  label: 'PAYMENT\nINITIATED', x: 940,  y: 80,  color: '#0d9488' },
  { id: 'CLOSED',             label: 'CLOSED',             x: 1130, y: 180, color: '#4b5563' },
];

interface Edge {
  from: ClaimState;
  to: ClaimState;
  role: string;
  bend?: number; // vertical offset for curved paths
  labelOffset?: { dx?: number; dy?: number };
}

const EDGES: Edge[] = [
  { from: 'SUBMITTED',          to: 'DOCUMENTS_VERIFIED', role: 'document_clerk',  bend: -20 },
  { from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT',   role: 'team_lead',       bend: -20 },
  { from: 'UNDER_ASSESSMENT',   to: 'APPROVED',           role: 'assessor',        bend: -20 },
  { from: 'UNDER_ASSESSMENT',   to: 'REJECTED',           role: 'assessor',        bend: 20  },
  { from: 'UNDER_ASSESSMENT',   to: 'PENDING_INFO',       role: 'assessor'                   },
  { from: 'PENDING_INFO',       to: 'DOCUMENTS_VERIFIED', role: 'document_clerk'             },
  { from: 'APPROVED',           to: 'PAYMENT_INITIATED',  role: 'finance',         bend: -20 },
  { from: 'PAYMENT_INITIATED',  to: 'CLOSED',             role: 'finance',         bend: -20 },
  { from: 'REJECTED',           to: 'CLOSED',             role: 'system',          bend: 20  },
];

const ROLE_COLORS: Record<string, string> = {
  document_clerk: '#06b6d4',
  team_lead:      '#8b5cf6',
  assessor:       '#f59e0b',
  finance:        '#10b981',
  system:         '#6b7280',
};

const NODE_W = 100;
const NODE_H = 44;
const NODE_RX = 8;

interface Props {
  activeState?: ClaimState | string | null;
  visitedStates?: string[];
}

export default function WorkflowDiagram({ activeState, visitedStates = [] }: Props) {
  const getNode = (id: string) => NODES.find((n) => n.id === id)!;

  function buildPath(edge: Edge): string {
    const from = getNode(edge.from);
    const to   = getNode(edge.to);
    if (!from || !to) return '';

    const fx = from.x + NODE_W / 2;
    const fy = from.y + NODE_H / 2;
    const tx = to.x + NODE_W / 2;
    const ty = to.y + NODE_H / 2;

    const mx = (fx + tx) / 2;
    const my = (fy + ty) / 2 + (edge.bend ?? 0);

    return `M ${fx} ${fy} Q ${mx} ${my} ${tx} ${ty}`;
  }

  function edgeMidpoint(edge: Edge): { x: number; y: number } {
    const from = getNode(edge.from);
    const to   = getNode(edge.to);
    if (!from || !to) return { x: 0, y: 0 };

    const fx = from.x + NODE_W / 2;
    const fy = from.y + NODE_H / 2;
    const tx = to.x + NODE_W / 2;
    const ty = to.y + NODE_H / 2;

    // Quadratic midpoint at t=0.5
    const mx = (fx + tx) / 2;
    const my = (fy + ty) / 2 + (edge.bend ?? 0);

    return {
      x: 0.25 * fx + 0.5 * mx + 0.25 * tx,
      y: 0.25 * fy + 0.5 * my + 0.25 * ty,
    };
  }

  return (
    <div className="workflow-diagram-wrap">
      <svg
        className="workflow-svg"
        viewBox="0 0 1280 380"
        height={380}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Arrow markers per role colour */}
          {Object.entries(ROLE_COLORS).map(([role, color]) => (
            <marker
              key={role}
              id={`arrow-${role}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          ))}
          {/* Active glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="7" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ─── Edges ───────────────────────────────────────────── */}
        {EDGES.map((edge, i) => {
          const mid = edgeMidpoint(edge);
          const color = ROLE_COLORS[edge.role] ?? '#6b7280';
          const isActive =
            activeState === edge.to &&
            visitedStates.includes(edge.from);

          return (
            <g key={i}>
              <path
                d={buildPath(edge)}
                fill="none"
                stroke={isActive ? color : 'rgba(255,255,255,0.1)'}
                strokeWidth={isActive ? 2 : 1.5}
                strokeDasharray={isActive ? undefined : '5 4'}
                markerEnd={`url(#arrow-${edge.role})`}
                filter={isActive ? 'url(#glow)' : undefined}
                style={{ transition: 'all 400ms ease' }}
              />
              {/* Role label on edge */}
              <text
                x={mid.x + (edge.labelOffset?.dx ?? 0)}
                y={mid.y + (edge.labelOffset?.dy ?? -6)}
                textAnchor="middle"
                fontSize={9}
                fontFamily="'JetBrains Mono', monospace"
                fill={isActive ? color : 'rgba(255,255,255,0.2)'}
                style={{ transition: 'fill 400ms ease' }}
              >
                {edge.role.replace('_', ' ')}
              </text>
            </g>
          );
        })}

        {/* ─── Nodes ───────────────────────────────────────────── */}
        {NODES.map((node) => {
          const isActive  = activeState === node.id;
          const isVisited = visitedStates.includes(node.id);
          const opacity   = !activeState ? 1 : isActive || isVisited ? 1 : 0.35;

          const fillOpacity = isActive ? 0.25 : isVisited ? 0.12 : 0.07;

          const lines = node.label.split('\n');

          return (
            <g
              key={node.id}
              style={{ transition: 'opacity 400ms ease', opacity }}
            >
              {/* Outer glow ring when active */}
              {isActive && (
                <rect
                  x={node.x - 5}
                  y={node.y - 5}
                  width={NODE_W + 10}
                  height={NODE_H + 10}
                  rx={NODE_RX + 4}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={2}
                  opacity={0.35}
                  filter="url(#glow-strong)"
                />
              )}

              {/* Node box */}
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={NODE_RX}
                fill={node.color}
                fillOpacity={fillOpacity}
                stroke={node.color}
                strokeWidth={isActive ? 2 : 1}
                strokeOpacity={isActive ? 0.9 : isVisited ? 0.6 : 0.3}
                filter={isActive ? 'url(#glow)' : undefined}
                style={{ transition: 'all 400ms ease' }}
              />

              {/* Label */}
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={node.x + NODE_W / 2}
                  y={node.y + (NODE_H / 2) + (lines.length > 1 ? (li - 0.5) * 11 : 0) + 4}
                  textAnchor="middle"
                  fontSize={lines.length > 1 ? 8.5 : 10}
                  fontWeight={isActive ? 700 : 600}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={isActive ? node.color : isVisited ? `${node.color}cc` : 'rgba(255,255,255,0.55)'}
                  style={{ transition: 'fill 400ms ease' }}
                  filter={isActive ? 'url(#glow)' : undefined}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
