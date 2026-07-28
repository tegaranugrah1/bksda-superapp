import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import { BmnAssetCatalogScreen } from '../features/bmn/BmnAssetCatalogScreen';
import { SuratMasukHistoryScreen } from '../features/surat/SuratMasukHistoryScreen';
import { InventoryStockScreen } from '../features/inventory/InventoryStockScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import { COLORS } from '../theme';

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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.emeraldElectric,
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Bmn') {
            iconName = focused ? 'car-sport' : 'car-sport-outline';
          } else if (route.name === 'Surat') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
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
