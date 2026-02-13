import React, { Suspense, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Appbar,
  IconButton,
  ActivityIndicator,
  useTheme,
  Menu,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { DashboardScreenProps, DashboardTabParamList } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useLogout } from '../hooks/useAuthMutations';
import InvoicesTab from './InvoicesTab';
import ItemsTab from './ItemsTab';
import FilterSheet from '../components/FilterSheet';
import UploadSheet from '../components/UploadSheet';

const Tab = createMaterialTopTabNavigator<DashboardTabParamList>();

// Lazy-load chart section
const ChartSection = React.lazy(() => import('../components/charts/ChartSection'));

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const logoutMutation = useLogout();
  const { setActiveTab, openFilterSheet, openUploadSheet } = useUiStore();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleTabChange = useCallback(
    (e: { data: { state: { index: number } } }) => {
      // material-top-tabs emits state change
    },
    [],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* App Bar */}
      <Appbar.Header elevated>
        <Appbar.Content title="Invoices" subtitle={`Hi, ${user?.username ?? ''}`} />
        <IconButton icon="filter-variant" onPress={openFilterSheet} />
        <IconButton icon="upload" onPress={openUploadSheet} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item
            leadingIcon="sync"
            title="Sync Settings"
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('SyncSettings');
            }}
          />
          {isAdmin && (
            <Menu.Item
              leadingIcon="shield-account"
              title="Admin Panel"
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Admin');
              }}
            />
          )}
          <Menu.Item
            leadingIcon="chart-bar"
            title="Analytics"
            onPress={() => setMenuVisible(false)}
          />
          <Menu.Item
            leadingIcon="logout"
            title="Logout"
            onPress={() => {
              setMenuVisible(false);
              logoutMutation.mutate();
            }}
          />
        </Menu>
      </Appbar.Header>

      {/* Tabs */}
      <Tab.Navigator
        screenListeners={{
          state: (e) => {
            const index = (e.data as { state: { index: number } })?.state?.index;
            setActiveTab(index === 0 ? 'invoices' : 'items');
          },
        }}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
          tabBarLabelStyle: { fontWeight: '600', textTransform: 'none' },
          lazy: true,
          lazyPlaceholder: () => (
            <View style={styles.lazyLoader}>
              <ActivityIndicator />
            </View>
          ),
        }}
      >
        <Tab.Screen name="Invoices" component={InvoicesTab} />
        <Tab.Screen name="Items" component={ItemsTab} />
      </Tab.Navigator>

      {/* Bottom Sheets */}
      <FilterSheet />
      <UploadSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  lazyLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
