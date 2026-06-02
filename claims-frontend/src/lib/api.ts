import type {
  ApiResponse,
  Claim,
  AuditLog,
  CreateClaimRequest,
  TransitionRequest,
  TransitionResult,
  ScenarioReport,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cfw_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> | { message: string; statusCode: number } =
    await res.json();

  if (!res.ok) {
    const errMsg =
      (json as { message: string }).message ?? `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return (json as ApiResponse<T>).data;
}

// ─── Claims API ───────────────────────────────────────────────────────────

export const api = {
  /** Create a new claim */
  createClaim: (body: CreateClaimRequest) =>
    request<Claim>('/claims', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** List all claims */
  listClaims: () => request<Claim[]>('/claims'),

  /** Get a single claim with available transitions */
  getClaim: (id: string) => request<Claim>(`/claims/${id}`),

  /** Trigger a state transition */
  transition: (id: string, body: TransitionRequest) =>
    request<TransitionResult>(`/claims/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Get immutable audit trail for a claim */
  getAuditTrail: (id: string) =>
    request<AuditLog[]>(`/claims/${id}/audit-trail`),

  /** Run a pre-built scenario by index (1–6) */
  runScenario: (index: number) =>
    request<ScenarioReport>(`/scenarios/run/${index}`, { method: 'POST' }),
};
