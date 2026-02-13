import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ─── Platform-aware storage adapter ─────────────────────────────────────────
// expo-secure-store doesn't support web, so we fall back to localStorage.

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
  try {
    return await getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  await deleteItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<{ id: string; username: string; role: 'user' | 'admin' } | null> {
  try {
    const json = await getItem(USER_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: { id: string; username: string; role: 'user' | 'admin' }): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function removeStoredUser(): Promise<void> {
  await deleteItem(USER_KEY);
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([removeStoredToken(), removeStoredUser()]);
}
