import React from 'react';
import { useAuth } from '../../../features/auth/AuthProvider';
import { useMobileDashboard } from '../useMobileDashboard';
import { PortalDashboardScreen } from '../PortalDashboardScreen';

export default function DashboardScreen({ navigation }: any) {
  const { user, employee } = useAuth();
  const { data: dashboardApiData } = useMobileDashboard();

  const handleNavigate = (moduleKey: string) => {
    if (moduleKey === 'bmn') {
      navigation.navigate('Bmn');
    } else if (moduleKey === 'surat') {
      navigation.navigate('Surat');
    } else if (moduleKey === 'inventory') {
      navigation.navigate('Inventory');
    } else if (moduleKey === 'kepegawaian') {
      navigation.navigate('Kepegawaian');
    } else if (moduleKey === 'profile') {
      navigation.navigate('Profile');
    }
  };

  const displayName = user?.name || employee?.name || user?.username || 'Super Admin System';
  const displayNip = employee?.nip || user?.username || 'superadmin';

  return (
    <PortalDashboardScreen
      onNavigateToModule={handleNavigate}
      userProfile={{
        name: displayName,
        nip: displayNip,
      }}
      dashboardData={dashboardApiData}
    />
  );
}
