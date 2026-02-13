import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginApi, registerApi } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import type { LoginRequest, RegisterRequest } from '../types';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => loginApi(data),
    onSuccess: async (res) => {
      await setAuth(res.token, res.user);
      queryClient.clear();
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => registerApi(data),
    onSuccess: async (res) => {
      await setAuth(res.token, res.user);
      queryClient.clear();
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logout();
      queryClient.clear();
    },
  });
}
