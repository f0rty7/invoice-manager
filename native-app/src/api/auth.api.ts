import apiClient from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../types';

const AUTH_URL = '/api/auth';

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(`${AUTH_URL}/login`, data);
  return res.data.data!;
}

export async function registerApi(data: RegisterRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(`${AUTH_URL}/register`, data);
  return res.data.data!;
}
