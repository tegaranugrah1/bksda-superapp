import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/features/auth/AuthProvider';
import RootNavigation from '@/navigation';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigation />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
