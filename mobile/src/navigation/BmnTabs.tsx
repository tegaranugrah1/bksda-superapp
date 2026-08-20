import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


import BmnListScreen from '../features/bmn/screens/BmnListScreen';
import { BmnDashboardScreen } from '../features/bmn/screens/BmnDashboardScreen';
import BmnDetailScreen from '../features/bmn/screens/BmnDetailScreen';
import BmnFormScreen from '../features/bmn/screens/BmnFormScreen';
import BmnPhotoCaptureScreen from '../features/bmn/screens/BmnPhotoCaptureScreen';
import BmnLoanScreen from '../features/bmn/screens/BmnLoanScreen';
import BmnLoanCreateScreen from '../features/bmn/screens/BmnLoanCreateScreen';
import BmnLoansScreen from '../features/bmn/screens/BmnLoansScreen';
import { usePermissions } from '../lib/permissions';
import { useTheme } from '../theme/ThemeContext';

export type BmnTabParamList = {
  Beranda: undefined;
  Aset: undefined;
  Peminjaman: undefined;
  Pemeliharaan: undefined;
  BmnDetail: { id: string | number };
  BmnForm: { id?: string | number };
  BmnPhotoCapture: { assetId: string | number; type: string; initialUri?: string };
  BmnLoans: undefined;
  BmnLoanCreate: undefined;
  BmnLoan: { assetId: string | number };
};

const Tab = createBottomTabNavigator<BmnTabParamList>();
const { width } = Dimensions.get('window');

const hiddenRouteOptions = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' as const },
};

const visibleTabs = [
  { name: 'Beranda', label: 'Beranda', icon: 'home-outline' },
  { name: 'Aset', label: 'Aset', icon: 'cube-outline' },
  { name: 'Peminjaman', label: 'Pinjaman', icon: 'swap-horizontal-outline' },
  { name: 'Pemeliharaan', label: 'Rawat', icon: 'construct-outline' },
] as const;

function BmnTabBar({ state, navigation, colors }: any) {
  const currentRoute = state.routes[state.index]?.name;
  const activeTab = visibleTabs.some((tab) => tab.name === currentRoute)
    ? currentRoute
    : currentRoute === 'BmnLoans' || currentRoute === 'BmnLoanCreate'
      ? 'Peminjaman'
      : 'Aset';

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
      {visibleTabs.map((tab) => {
        const isFocused = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
            activeOpacity={0.75}
          >
            <Ionicons name={tab.icon as any} size={24} color={isFocused ? '#2563eb' : '#94a3b8'} />
            <Text style={[styles.tabLabel, { color: isFocused ? '#2563eb' : '#94a3b8' }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BmnDashboardTab({ navigation }: any) {
  return (
    <BmnDashboardScreen
      showFab={false}
      onBack={() => navigation.getParent()?.navigate('Dashboard')}
      onNavigateToCatalog={() => navigation.navigate('Aset')}
    />
  );
}

function BmnAssetCatalogTab() {
  return <BmnListScreen />;
}

function BmnLoanTab({ navigation }: any) {
  return <BmnLoansScreen navigation={navigation} />;
}

function BmnMaintenanceTab() {
  const { colors } = useTheme();

  return (
    <View style={[styles.comingSoonScreen, { backgroundColor: colors.bgDark }]}>
      <View style={[styles.comingSoonCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
        <View style={styles.comingSoonIcon}>
          <Ionicons name="construct-outline" size={36} color="#059669" />
        </View>
        <Text style={[styles.comingSoonTitle, { color: colors.textDark }]}>Pemeliharaan BMN</Text>
        <Text style={[styles.comingSoonMessage, { color: colors.textMuted }]}>Fitur pemeliharaan aset sedang dipersiapkan dan akan segera tersedia.</Text>
        <View style={styles.comingSoonBadge}><Text style={styles.comingSoonBadgeText}>COMING SOON</Text></View>
      </View>
    </View>
  );
}

export default function BmnTabs({ navigation }: any) {
  const { hasModule } = usePermissions();
  const { colors } = useTheme();
  const canAccessBmn = hasModule('bmn');

  useEffect(() => {
    if (!canAccessBmn) {
      navigation.getParent()?.navigate('Dashboard');
    }
  }, [canAccessBmn, navigation]);

  if (!canAccessBmn) return null;

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBar={({ state, navigation: tabNavigation }) => (
        <BmnTabBar state={state} navigation={tabNavigation} colors={colors} />
      )}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          width: width - 32,
          marginLeft: 16,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.cardBg,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingHorizontal: 28,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => {
          const icon = route.name === 'Beranda'
            ? 'home-outline'
            : route.name === 'Aset'
              ? 'cube-outline'
              : route.name === 'Peminjaman'
                ? 'swap-horizontal-outline'
                : 'construct-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Beranda"
        component={BmnDashboardTab}
        options={{ tabBarLabel: 'Beranda' }}
      />
      <Tab.Screen
        name="Aset"
        component={BmnAssetCatalogTab}
        options={{ tabBarLabel: 'Aset' }}
      />
      <Tab.Screen
        name="Peminjaman"
        component={BmnLoanTab}
        options={{ tabBarLabel: 'Pinjaman' }}
      />
      <Tab.Screen
        name="Pemeliharaan"
        component={BmnMaintenanceTab}
        options={{ tabBarLabel: 'Rawat' }}
      />
      <Tab.Screen name="BmnDetail" component={BmnDetailScreen} options={hiddenRouteOptions} />
      <Tab.Screen name="BmnForm" component={BmnFormScreen} options={hiddenRouteOptions} />
      <Tab.Screen name="BmnPhotoCapture" component={BmnPhotoCaptureScreen} options={hiddenRouteOptions} />
      <Tab.Screen name="BmnLoans" component={BmnLoansScreen} options={hiddenRouteOptions} />
      <Tab.Screen name="BmnLoanCreate" component={BmnLoanCreateScreen} options={hiddenRouteOptions} />
      <Tab.Screen name="BmnLoan" component={BmnLoanScreen} options={hiddenRouteOptions} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    width: width - 32,
    marginLeft: 16,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  comingSoonScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  comingSoonCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
  },
  comingSoonIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  comingSoonMessage: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  comingSoonBadge: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  comingSoonBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
