import {
  apiRequest,
  saveAuthToken,
  clearAuthToken,
} from './API';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: AuthUser;
}

interface MeResponse {
  success: boolean;
  user: AuthUser;
}

export async function register(input: {
  email: string;
  full_name: string;
  password: string;
}) {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function login(input: {
  email: string;
  password: string;
}) {
  const result = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  saveAuthToken(result.token);

  return result;
}

export async function getCurrentUser() {
  const result = await apiRequest<MeResponse>('/auth/me');

  return result.user;
}

export async function logout() {
  try {
    await apiRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAuthToken();
  }
}
