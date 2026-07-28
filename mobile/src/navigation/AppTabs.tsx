import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import { BmnAssetCatalogScreen } from '../features/bmn/BmnAssetCatalogScreen';
import { SuratMasukHistoryScreen } from '../features/surat/SuratMasukHistoryScreen';
import { InventoryStockScreen } from '../features/inventory/InventoryStockScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';

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
        tabBarStyle: {
          display: 'none', // Hide standard fixed bottom bar in favor of FloatingNav
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Bmn" component={BmnAssetCatalogScreen} />
      <Tab.Screen name="Surat" component={SuratMasukHistoryScreen} />
      <Tab.Screen name="Inventory" component={InventoryStockScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
