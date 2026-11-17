import type {
  Book,
  DashboardData,
  LoanRecord,
  MostBorrowedBook,
  UserSummary,
} from '../types/library';

const TOKEN_STORAGE_KEY = 'acervo_escolar_token';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof payload?.error === 'string'
        ? payload.error
        : `Erro na requisição (${response.status}).`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export const api = {
  login(email: string, senha: string) {
    return apiFetch<{ token: string; user: UserSummary }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  },
  me() {
    return apiFetch<{ user: UserSummary }>('/api/auth/me');
  },
  getDashboard() {
    return apiFetch<DashboardData>('/api/dashboard');
  },
  getUsers() {
    return apiFetch<UserSummary[]>('/api/usuarios');
  },
  getBooks(query = '', categoria = 'TODAS') {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (categoria && categoria !== 'TODAS') params.set('categoria', categoria);
    const qs = params.toString();
    return apiFetch<Book[]>(`/api/livros${qs ? `?${qs}` : ''}`);
  },
  createBook(data: Omit<Book, 'id_livro'>) {
    return apiFetch<Book>('/api/livros', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateBook(id: number, data: Omit<Book, 'id_livro'>) {
    return apiFetch<Book>(`/api/livros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteBook(id: number) {
    return apiFetch<{ deleted: boolean; id_livro: number }>(`/api/livros/${id}`, {
      method: 'DELETE',
    });
  },
  getLoans(status?: 'ATIVO' | 'DEVOLVIDO') {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<LoanRecord[]>(`/api/emprestimos${qs}`);
  },
  createLoan(data: {
    id_usuario: number;
    id_livro: number;
    data_emprestimo: string;
    data_prevista_devolucao: string;
  }) {
    return apiFetch<LoanRecord>('/api/emprestimos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  returnLoan(id: number, data_devolucao?: string) {
    return apiFetch<LoanRecord>(`/api/emprestimos/${id}/devolver`, {
      method: 'PATCH',
      body: JSON.stringify({ data_devolucao }),
    });
  },
  getReports() {
    return apiFetch<{ ranking: MostBorrowedBook[]; historico: LoanRecord[] }>(
      '/api/relatorios/mais-emprestados'
    );
  },
};

export function formatDatePtBr(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIsoDate(baseIso: string, days: number): string {
  const date = new Date(`${baseIso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
