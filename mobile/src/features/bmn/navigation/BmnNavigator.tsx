import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BmnListScreen from '../screens/BmnListScreen';
import BmnDetailScreen from '../screens/BmnDetailScreen';
import BmnFormScreen from '../screens/BmnFormScreen';
import BmnPhotoCaptureScreen from '../screens/BmnPhotoCaptureScreen';

export type BmnStackParamList = {
  BmnList: undefined;
  BmnDetail: { id: string | number };
  BmnForm?: { id?: string | number };
  BmnPhotoCapture: { assetId: string | number; type: 'depan' | 'belakang' | 'kiri' | 'kanan' };
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
    </Stack.Navigator>
  );
}
