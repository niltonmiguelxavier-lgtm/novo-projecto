import { config } from '../lib/config';
export class ApiError extends Error { constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; } }
/** Cliente preparado para uma API futura. Requer backend real. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers }, credentials: 'include' });
  if (!response.ok) throw new ApiError('O pedido à API falhou.', response.status);
  return response.json() as Promise<T>;
}
