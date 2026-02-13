import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { View, StyleSheet, AppState } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { useInvoiceSync } from '../hooks/useInvoiceSync';

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const restoreAuth = useAuthStore((s) => s.restoreAuth);
  const theme = useTheme();
  const { autoSync } = useInvoiceSync();

  // Restore auth from secure store on mount
  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  // Auto-sync when app comes to foreground
  useEffect(() => {
    if (!isAuthenticated) return;

    // Sync once on initial auth
    autoSync();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        autoSync();
      }
    });

    return () => sub.remove();
  }, [isAuthenticated, autoSync]);

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
