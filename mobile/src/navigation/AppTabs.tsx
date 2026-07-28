import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import { BmnAssetCatalogScreen } from '@/features/bmn/BmnAssetCatalogScreen';
import { SuratMasukHistoryScreen } from '@/features/surat/SuratMasukHistoryScreen';
import { InventoryStockScreen } from '@/features/inventory/InventoryStockScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import { COLORS } from '@/theme';

export type AppTabParamList = {
  Dashboard: undefined;
  Bmn: undefined;
  Surat: undefined;
  Inventory: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.emeraldElectric,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 41, 30, 0.95)',
          borderTopColor: COLORS.glassBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Beranda',
        }}
      />
      <Tab.Screen
        name="Bmn"
        component={BmnAssetCatalogScreen}
        options={{
          title: 'Aset BMN',
        }}
      />
      <Tab.Screen
        name="Surat"
        component={SuratMasukHistoryScreen}
        options={{
          title: 'Surat',
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStockScreen}
        options={{
          title: 'Inventaris',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}

