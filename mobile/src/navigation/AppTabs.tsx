import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DashboardScreen from "../features/dashboard/screens/DashboardScreen";
import { BmnAssetCatalogScreen } from "../features/bmn/BmnAssetCatalogScreen";
import BmnDetailScreen from "../features/bmn/screens/BmnDetailScreen";
import BmnFormScreen from "../features/bmn/screens/BmnFormScreen";
import BmnPhotoCaptureScreen from "../features/bmn/screens/BmnPhotoCaptureScreen";
import { SuratMasukHistoryScreen } from "../features/surat/SuratMasukHistoryScreen";
import { InventoryStockScreen } from "../features/inventory/InventoryStockScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen";
import { KepegawaianScreen } from "../features/kepegawaian/KepegawaianScreen";
import { TambahPegawaiScreen } from "../features/kepegawaian/TambahPegawaiScreen";
import { InboxSuratTugasScreen } from "../features/kepegawaian/InboxSuratTugasScreen";
import { InboxSuratCutiScreen } from "../features/kepegawaian/screens/InboxSuratCutiScreen";
import { BuatSuratTugasScreen } from "../features/kepegawaian/BuatSuratTugasScreen";
import SuratTugasListScreen from "../features/surat-tugas/screens/SuratTugasListScreen";
import AssignmentDetailScreen from "../features/surat-tugas/screens/AssignmentDetailScreen";

export type AppTabParamList = {
  Dashboard: undefined;
  Bmn: undefined;
  BmnDetail: { id: string | number };
  BmnForm: { id?: string | number };
  BmnPhotoCapture: { assetId: string | number; type: string };
  Surat: undefined;
  Inventory: undefined;
  Profile: undefined;
  Kepegawaian: undefined;
  TambahPegawai: undefined;
  InboxSuratTugas: undefined;
  InboxSuratCuti: undefined;
  BuatSuratTugas: undefined;
  SuratTugasList: { initialMode?: "personal" | "management"; initialStatus?: any } | undefined;
  AssignmentDetail: { id: string | number; mode?: "personal" | "management" };
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: "none", // Hide standard fixed bottom bar in favor of Floating Action Button (FabMenu)
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Bmn" component={BmnAssetCatalogScreen} />
      <Tab.Screen name="BmnDetail" component={BmnDetailScreen} />
      <Tab.Screen name="BmnForm" component={BmnFormScreen} />
      <Tab.Screen name="BmnPhotoCapture" component={BmnPhotoCaptureScreen} />
      <Tab.Screen name="Surat" component={SuratMasukHistoryScreen} />
      <Tab.Screen name="Inventory" component={InventoryStockScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Kepegawaian" component={KepegawaianScreen} />
      <Tab.Screen name="TambahPegawai" component={TambahPegawaiScreen} />
      <Tab.Screen name="InboxSuratTugas" component={InboxSuratTugasScreen} />
      <Tab.Screen name="InboxSuratCuti" component={InboxSuratCutiScreen} />
      <Tab.Screen name="BuatSuratTugas" component={BuatSuratTugasScreen} />
      <Tab.Screen name="SuratTugasList" component={SuratTugasListScreen} />
      <Tab.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
    </Tab.Navigator>
  );
}
