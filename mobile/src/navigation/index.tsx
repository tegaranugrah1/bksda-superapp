import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/features/auth/AuthProvider';
import LoginScreen from '@/features/auth/screens/LoginScreen';
import AppTabs from './AppTabs';
import { useAppTheme } from '@/hooks/useAppTheme';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Stack Navigator that gates access to authenticated screens.
 * Acceptance check: unauthenticated user sees Login; authenticated user sees tabs.
 * Matrix rule: Do not show app tabs before auth resolves (shows loading spinner).
 */
export default function RootNavigation() {
  const { user, isLoading } = useAuth();
  const { colors } = useAppTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }} testID="loading-container">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user === null ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={AppTabs} />
      )}
    </Stack.Navigator>
  );
}
