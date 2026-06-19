import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BmnListScreen from '../screens/BmnListScreen';
import BmnDetailScreen from '../screens/BmnDetailScreen';
import BmnFormScreen from '../screens/BmnFormScreen';
import BmnPhotoCaptureScreen from '../screens/BmnPhotoCaptureScreen';
import BmnLoanScreen from '../screens/BmnLoanScreen';

export type BmnStackParamList = {
  BmnList: undefined;
  BmnDetail: { id: string | number };
  BmnForm?: { id?: string | number };
  BmnPhotoCapture: { assetId: string | number; type: 'depan' | 'belakang' | 'kiri' | 'kanan' };
  BmnLoan: { assetId: string | number };
};

const Stack = createNativeStackNavigator<BmnStackParamList>();

export default function BmnNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="BmnList" component={BmnListScreen} />
      <Stack.Screen name="BmnDetail" component={BmnDetailScreen} />
      <Stack.Screen name="BmnForm" component={BmnFormScreen} />
      <Stack.Screen name="BmnPhotoCapture" component={BmnPhotoCaptureScreen} />
      <Stack.Screen name="BmnLoan" component={BmnLoanScreen} />
    </Stack.Navigator>
  );
}
