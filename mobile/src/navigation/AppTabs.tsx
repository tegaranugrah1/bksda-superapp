import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import BmnListScreen from '@/features/bmn/screens/BmnListScreen';
import SuratTugasListScreen from '@/features/surat-tugas/screens/SuratTugasListScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import { useAppTheme } from '@/hooks/useAppTheme';

import { usePermissions } from '@/lib/permissions';

export type AppTabParamList = {
  Dashboard: undefined;
  Bmn?: undefined;
  SuratTugas?: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  const { colors } = useAppTheme();
  const { hasModule } = usePermissions();

  const showBmn = hasModule('bmn');
  const showSuratTugas = hasModule('surat_tugas') || hasModule('kepegawaian');

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.card,
          shadowColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.foreground,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
        }}
      />
      {showBmn && (
        <Tab.Screen
          name="Bmn"
          component={BmnListScreen}
          options={{
            title: 'BMN',
          }}
        />
      )}
      {showSuratTugas && (
        <Tab.Screen
          name="SuratTugas"
          component={SuratTugasListScreen}
          options={{
            title: 'Surat Tugas',
          }}
        />
      )}
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
