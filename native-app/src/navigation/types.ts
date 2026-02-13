import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

// ─── Auth Stack ─────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// ─── App Stack ──────────────────────────────────────────────────────────────
export type AppStackParamList = {
  Dashboard: undefined;
  Admin: undefined;
  InvoiceDetail: { invoiceId: string };
  SyncSettings: undefined;
};

export type DashboardScreenProps = NativeStackScreenProps<AppStackParamList, 'Dashboard'>;
export type AdminScreenProps = NativeStackScreenProps<AppStackParamList, 'Admin'>;
export type InvoiceDetailScreenProps = NativeStackScreenProps<AppStackParamList, 'InvoiceDetail'>;
export type SyncSettingsScreenProps = NativeStackScreenProps<AppStackParamList, 'SyncSettings'>;

// ─── Dashboard Tabs ─────────────────────────────────────────────────────────
export type DashboardTabParamList = {
  Invoices: undefined;
  Items: undefined;
};

export type InvoicesTabProps = MaterialTopTabScreenProps<DashboardTabParamList, 'Invoices'>;
export type ItemsTabProps = MaterialTopTabScreenProps<DashboardTabParamList, 'Items'>;
