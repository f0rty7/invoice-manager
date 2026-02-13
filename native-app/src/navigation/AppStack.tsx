import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import type { AppStackParamList } from './types';
import { useAuthStore } from '../stores/authStore';
import DashboardScreen from '../screens/DashboardScreen';
import AdminScreen from '../screens/AdminScreen';
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen';
import SyncSettingsScreen from '../screens/SyncSettingsScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      {isAdmin && <Stack.Screen name="Admin" component={AdminScreen} />}
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ headerShown: true, title: 'Invoice Details' }}
      />
      <Stack.Screen
        name="SyncSettings"
        component={SyncSettingsScreen}
        options={{ headerShown: true, title: 'Sync Settings' }}
      />
    </Stack.Navigator>
  );
}
