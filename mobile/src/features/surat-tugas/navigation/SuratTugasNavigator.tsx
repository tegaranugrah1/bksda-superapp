import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SuratTugasListScreen from '../screens/SuratTugasListScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';
import { AssignmentListMode } from '../types';

export type SuratTugasStackParamList = {
  SuratTugasList: undefined;
  AssignmentDetail: { id: string | number; mode?: AssignmentListMode };
};

const Stack = createNativeStackNavigator<SuratTugasStackParamList>();

export default function SuratTugasNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SuratTugasList" component={SuratTugasListScreen} />
      <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
    </Stack.Navigator>
  );
}
