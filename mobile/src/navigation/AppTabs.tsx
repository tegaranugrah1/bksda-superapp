import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import BmnNavigator from '@/features/bmn/navigation/BmnNavigator';
import { BmnStackParamList } from '@/features/bmn/navigation/BmnNavigator';
import SuratTugasNavigator from '@/features/surat-tugas/navigation/SuratTugasNavigator';
import { SuratTugasStackParamList } from '@/features/surat-tugas/navigation/SuratTugasNavigator';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import { useAppTheme } from '@/hooks/useAppTheme';

import { usePermissions } from '@/lib/permissions';

export type AppTabParamList = {
  Dashboard: undefined;
  Bmn?: NavigatorScreenParams<BmnStackParamList>;
  SuratTugas?: NavigatorScreenParams<SuratTugasStackParamList>;
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
          component={BmnNavigator}
          options={{
            title: 'BMN',
            headerShown: false,
          }}
        />
      )}
      {showSuratTugas && (
        <Tab.Screen
          name="SuratTugas"
          component={SuratTugasNavigator}
          options={{
            title: 'Surat Tugas',
            headerShown: false,
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
