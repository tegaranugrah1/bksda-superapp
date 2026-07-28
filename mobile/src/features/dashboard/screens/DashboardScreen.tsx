import React from 'react';
import { PortalDashboardScreen } from '../PortalDashboardScreen';

export default function DashboardScreen({ navigation }: any) {
  const handleNavigate = (moduleKey: string) => {
    if (moduleKey === 'bmn') {
      navigation.navigate('Bmn');
    } else if (moduleKey === 'surat') {
      navigation.navigate('Surat');
    } else if (moduleKey === 'inventory') {
      navigation.navigate('Inventory');
    } else if (moduleKey === 'profile' || moduleKey === 'kepegawaian') {
      navigation.navigate('Profile');
    }
  };

  return (
    <PortalDashboardScreen
      onNavigateToModule={handleNavigate}
      userProfile={{
        name: 'Drs. Ahmad Subagja, M.Si.',
        nip: '19850412 201012 1 002',
        avatarUrl: 'https://bksdakaltim.net/assets/img/logobksda.png',
      }}
    />
  );
}

