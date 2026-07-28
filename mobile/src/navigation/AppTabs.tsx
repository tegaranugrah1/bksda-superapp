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
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 41, 30, 0.95)',
          borderTopColor: COLORS.glassBorder,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home-sharp' : 'home-outline';
          } else if (route.name === 'Bmn') {
            iconName = focused ? 'car-sport-sharp' : 'car-sport-outline';
          } else if (route.name === 'Surat') {
            iconName = focused ? 'document-text-sharp' : 'document-text-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube-sharp' : 'cube-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-sharp' : 'person-outline';
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
