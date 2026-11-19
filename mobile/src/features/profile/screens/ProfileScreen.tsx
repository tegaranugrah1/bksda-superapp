import React from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Keep the registered route compatible while using the portal's single profile UI.
export default function ProfileScreen({ navigation }: any) {
  useFocusEffect(React.useCallback(() => {
    navigation?.navigate('Dashboard', { portalTab: 'profile' });
  }, [navigation]));
  return null;
}
