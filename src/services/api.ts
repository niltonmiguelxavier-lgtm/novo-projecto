import { config } from '../lib/config';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'nevon_pay_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers = new Headers(init.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  const response = await fetch(
    `${config.apiBaseUrl}${normalizedPath}`,
    {
      ...init,
      headers,
      credentials: 'omit',
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || 'Não foi possível concluir o pedido.',
      response.status
    );
  }

  return data as T;
}
