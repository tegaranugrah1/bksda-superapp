import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../features/auth/AuthProvider';
import { useMobileDashboard } from '../useMobileDashboard';
import { PortalDashboardScreen } from '../PortalDashboardScreen';

export default function DashboardScreen({ navigation }: any) {
  const { user, employee } = useAuth();
  const { data: dashboardApiData } = useMobileDashboard();

  const handleNavigate = (moduleKey: string) => {
    if (moduleKey === 'buat-surat-tugas' || moduleKey === 'surat-tugas-baru') {
      navigation.navigate('AssignmentForm');
    } else if (moduleKey === 'laporan-pelaksanaan-st') {
      navigation.navigate('GeneralReportForm');
    } else if (moduleKey === 'inbox-surat-tugas') {
      navigation.navigate('InboxSuratTugas');
    } else if (moduleKey === 'inbox-surat-cuti') {
      navigation.navigate('InboxSuratCuti');
    } else if (moduleKey === 'surat-tugas' || moduleKey === 'surattugas' || moduleKey === 'surat-tugas-personal') {
      navigation.navigate('SuratTugasList', { initialMode: 'personal' });
    } else if (moduleKey === 'bmn') {
      navigation.navigate('BmnMain');
    } else if (moduleKey === 'surat') {
      navigation.navigate('Surat');
    } else if (moduleKey === 'inventory') {
      navigation.navigate('Inventory');
    } else if (moduleKey === 'kepegawaian' || moduleKey === 'dashboard-kepegawaian') {
      navigation.navigate('KepegawaianMain');
    } else if (moduleKey === 'profile') {
      navigation.navigate('Profile');
    } else if (moduleKey === 'drive') {
      Alert.alert('BKSDA Drive', 'Akses penyimpanan cloud & manajemen berkas digital terintegrasi RustFS / S3 BKSDA Kaltim.');
    }
  };

  const displayName = user?.name || employee?.name || user?.username || 'Super Admin System';
  const displayNip = employee?.nip || user?.username || 'superadmin';

  return (
    <PortalDashboardScreen
      onNavigateToModule={handleNavigate}
      userProfile={{
        name: displayName,
        nip: displayNip,
      }}
      dashboardData={dashboardApiData}
    />
  );
}
