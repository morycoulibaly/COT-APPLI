const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cotappli_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Une erreur est survenue' }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(message ?? 'Une erreur est survenue', res.status, body.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Distinct de `request` : pas de Content-Type manuel (le navigateur doit définir
// lui-même le boundary multipart), utilisé uniquement pour les uploads de fichiers.
async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cotappli_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Une erreur est survenue' }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(message ?? 'Une erreur est survenue', res.status, body.code);
  }

  return res.json();
}

export const api = {
  get: <T,>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
  postFormData: <T,>(path: string, formData: FormData) => requestFormData<T>(path, formData),
};

// --- Types partagés avec le backend ---

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; fullName: string };
}

export interface GroupMemberSummary {
  id: string;
  displayName: string;
  phone: string | null;
  joinedAt: string;
  totalPaid: number;
  expectedAmount: number | null;
  remainingAmount: number | null;
  status: 'a_jour' | 'en_retard';
}

export interface GroupSummary {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  currency: string;
  status: 'OPEN' | 'CLOSED';
  paymentInstructions: string | null;
  shareToken: string;
  createdAt: string;
  totalCollected: number;
  progressPercent: number;
  members: GroupMemberSummary[];
}

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  notes: string | null;
  senderName: string | null;
  transactionReference: string | null;
  member: { displayName: string };
}

export interface PublicGroupView {
  title: string;
  description: string | null;
  organizerName: string;
  targetAmount: number;
  currency: string;
  status: 'OPEN' | 'CLOSED';
  paymentInstructions: string | null;
  totalCollected: number;
  progressPercent: number;
  members: {
    displayName: string;
    totalPaid: number;
    expectedAmount: number | null;
    status: 'a_jour' | 'en_retard';
  }[];
}

export interface ReceiptScanResult {
  amount: number | null;
  senderName: string | null;
  date: string | null;
  transactionId: string | null;
}

export type ReminderTone = 'amical' | 'nouchi' | 'formel';