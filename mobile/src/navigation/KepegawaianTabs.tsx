import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import { KepegawaianDashboardScreen } from '../features/kepegawaian/KepegawaianDashboardScreen';
import { KepegawaianScreen } from '../features/kepegawaian/KepegawaianScreen';
import { TambahPegawaiScreen } from '../features/kepegawaian/TambahPegawaiScreen';
import { InboxSuratTugasScreen } from '../features/kepegawaian/InboxSuratTugasScreen';
import { RiwayatSuratTugasScreen } from '../features/kepegawaian/RiwayatSuratTugasScreen';
import { BuatSuratTugasScreen } from '../features/kepegawaian/BuatSuratTugasScreen';
import { InboxSuratCutiScreen } from '../features/kepegawaian/screens/InboxSuratCutiScreen';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export type KepegawaianTabParamList = {
  Beranda: undefined;
  Pegawai: undefined;
  BuatST_Placeholder: undefined;
  SuratTugas: undefined;
  Cuti: undefined;
  KepegawaianDashboard: undefined;
  TambahPegawai: undefined;
  InboxSuratTugas: undefined;
  RiwayatSuratTugas: undefined;
  InboxSuratCuti: undefined;
  BuatSuratTugas: undefined;
};

const Tab = createBottomTabNavigator<KepegawaianTabParamList>();

const CenterAddButton = ({ onPress, bgColor }: { onPress?: () => void, bgColor: string }) => {
  return (
    <View style={styles.centerBtnContainer}>
      <TouchableOpacity 
        style={[styles.centerBtn, { backgroundColor: bgColor, shadowColor: bgColor }]} 
        activeOpacity={0.8} 
        onPress={onPress}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

export default function KepegawaianTabs({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          width: width - 32,
          marginLeft: 16,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.cardBg,
          borderColor: colors.glassBorder,
          borderWidth: 1,
          borderTopWidth: 1,
          paddingHorizontal: 28,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Beranda"
        component={KepegawaianDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Pegawai"
        component={KepegawaianScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BuatST_Placeholder"
        component={View} // Dummy component, handled by tabPress
        options={{
          tabBarButton: () => (
            <CenterAddButton onPress={() => navigation.navigate('BuatSuratTugas')} bgColor="#2563eb" />
          ),
        }}
      />
      <Tab.Screen
        name="SuratTugas"
        component={InboxSuratTugasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
          tabBarLabel: "ST",
        }}
      />
      <Tab.Screen
        name="Cuti"
        component={InboxSuratCutiScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen name="KepegawaianDashboard" component={KepegawaianDashboardScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="TambahPegawai" component={TambahPegawaiScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="InboxSuratTugas" component={InboxSuratTugasScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="RiwayatSuratTugas" component={RiwayatSuratTugasScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="InboxSuratCuti" component={InboxSuratCutiScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="BuatSuratTugas" component={BuatSuratTugasScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerBtnContainer: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
