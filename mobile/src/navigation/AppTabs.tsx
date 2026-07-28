import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DashboardScreen from "../features/dashboard/screens/DashboardScreen";
import { BmnAssetCatalogScreen } from "../features/bmn/BmnAssetCatalogScreen";
import { SuratMasukHistoryScreen } from "../features/surat/SuratMasukHistoryScreen";
import { InventoryStockScreen } from "../features/inventory/InventoryStockScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen";
import { KepegawaianScreen } from "../features/kepegawaian/KepegawaianScreen";
import { TambahPegawaiScreen } from "../features/kepegawaian/TambahPegawaiScreen";
import { InboxSuratTugasScreen } from "../features/kepegawaian/InboxSuratTugasScreen";
import { BuatSuratTugasScreen } from "../features/kepegawaian/BuatSuratTugasScreen";

export type AppTabParamList = {
  Dashboard: undefined;
  Bmn: undefined;
  Surat: undefined;
  Inventory: undefined;
  Profile: undefined;
  Kepegawaian: undefined;
  TambahPegawai: undefined;
  InboxSuratTugas: undefined;
  BuatSuratTugas: undefined;
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
      <Tab.Screen name="Surat" component={SuratMasukHistoryScreen} />
      <Tab.Screen name="Inventory" component={InventoryStockScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Kepegawaian" component={KepegawaianScreen} />
      <Tab.Screen name="TambahPegawai" component={TambahPegawaiScreen} />
      <Tab.Screen name="InboxSuratTugas" component={InboxSuratTugasScreen} />
      <Tab.Screen name="BuatSuratTugas" component={BuatSuratTugasScreen} />
    </Tab.Navigator>
  );
}
