import React from 'react';
import { ProfileScreen as RichProfileScreen } from '../ProfileScreen';

export default function ProfileScreen({ navigation }: any) {
  return (
    <RichProfileScreen
      onBack={() => {
        if (navigation) {
          navigation.navigate('Dashboard');
        }
      }}
      onNavigateToModule={(moduleKey) => {
        if (navigation) {
          if (moduleKey === 'home') navigation.navigate('Dashboard');
          else if (moduleKey === 'bmn') navigation.navigate('Bmn');
          else if (moduleKey === 'surat') navigation.navigate('Surat');
          else if (moduleKey === 'inventory') navigation.navigate('Inventory');
          else if (moduleKey === 'profile') navigation.navigate('Profile');
        }
      }}
    />
  );
}
