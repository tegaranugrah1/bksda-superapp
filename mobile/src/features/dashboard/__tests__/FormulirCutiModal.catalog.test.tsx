import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { apiClient } from '@/lib/api/client';
import { FormulirCutiModal } from '../FormulirCutiModal';
import { AppDatePickerModal } from '@/components/AppDatePickerModal';

jest.mock('@/lib/api/client', () => ({apiClient:{get:jest.fn(),post:jest.fn()}}));
jest.mock('@/components/AppDatePickerModal', () => ({AppDatePickerModal:'DatePicker'}));
jest.mock('react-native', () => ({
  View:'View',Text:'Text',TextInput:'TextInput',TouchableOpacity:'TouchableOpacity',Modal:'Modal',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',
  Alert:{alert:jest.fn()},Platform:{OS:'web',select:(options:Record<string,unknown>)=>options.web??options.default},StyleSheet:{create:(value:unknown)=>value},
}));
jest.mock('@/theme/ThemeContext', () => ({
  useTheme:()=>({isDark:false,colors:{}}),
  usePortalResponsive:()=>({height:844,type:{},space:{},radius:{},size:{},lineHeight:{}}),
  PORTAL_5_TOKENS:{shadow:{lg:()=>({})}},
}));

const custom = {id:1,nama:'Izin Khusus Balai',kode:'IKB',hitung_hari:'hari_kerja',potong_kuota_tahunan:false,maks_hari:5};
const onClose=jest.fn(), onSuccess=jest.fn();
let tree:renderer.ReactTestRenderer|undefined;
const view=(visible=true,balanceAvailable=false,sisaCuti=0)=><FormulirCutiModal visible={visible} balanceAvailable={balanceAvailable} sisaCuti={sisaCuti} onClose={onClose} onSuccess={onSuccess}/>;
const texts=()=>tree!.root.findAllByType(Text).map(node=>node.props.children);
const action=(label:string)=>tree!.root.findAllByType(TouchableOpacity).find(node=>node.findAllByType(Text).some(text=>text.props.children===label))!;
const field=(placeholder:string)=>tree!.root.findByProps({placeholder});
const populate=()=>act(()=>{
  field('Jelaskan alasan permohonan cuti...').props.onChangeText('Dummy reason');
  field('Alamat lengkap selama menjalankan cuti...').props.onChangeText('Dummy address');
});
const dates=()=>{
  act(()=>tree!.root.findByProps({accessibilityLabel:'Tanggal mulai cuti'}).props.onPress());
  act(()=>tree!.root.findByType(AppDatePickerModal).props.onConfirm('2026-11-20'));
  act(()=>tree!.root.findByProps({accessibilityLabel:'Tanggal selesai cuti'}).props.onPress());
  act(()=>tree!.root.findByType(AppDatePickerModal).props.onConfirm('2026-11-23'));
};
const mount=async(visible=true,balance=false,sisa=0)=>{await act(async()=>{tree=renderer.create(view(visible,balance,sisa));});};
beforeEach(()=>{
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockReset().mockResolvedValue({data:{data:[custom]}});
  (apiClient.post as jest.Mock).mockReset();
});
afterEach(()=>{if(tree)act(()=>tree!.unmount());tree=undefined;});

it('loads the catalog only on open, follows workday metadata and shows normalized field errors with a retry',async()=>{
  await mount(false);
  expect(apiClient.get).not.toHaveBeenCalled();
  await act(async()=>{tree!.update(view());});
  expect(apiClient.get).toHaveBeenCalledWith('/me/leave-types');
  expect(texts()).toContain(custom.nama);
  dates();populate();
  expect(texts()).toContain('2 Hari Kerja');
  (apiClient.post as jest.Mock).mockRejectedValueOnce({kind:'validation',message:'Validasi gagal',fieldErrors:{alasan_cuti:['Alasan perlu diperjelas.']}});
  await act(async()=>{await action('Kirim Pengajuan').props.onPress();});
  expect(apiClient.post).toHaveBeenCalledWith('/me/leave-requests',expect.objectContaining({jenis_cuti:custom.nama,tanggal_mulai:'2026-11-20',tanggal_selesai:'2026-11-23'}));
  expect(texts()).toContain('Alasan perlu diperjelas.');
  expect(field('Jelaskan alasan permohonan cuti...').props.value).toBe('Dummy reason');
  expect(onClose).not.toHaveBeenCalled();
  let finish!:(value:unknown)=>void;
  (apiClient.post as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  let pending!:Promise<void>;
  act(()=>{const press=action('Kirim Pengajuan').props.onPress;pending=press();void press();});
  expect(apiClient.post).toHaveBeenCalledTimes(2);
  act(()=>tree!.root.findByProps({accessibilityLabel:'Tutup formulir cuti'}).props.onPress());
  expect(onClose).not.toHaveBeenCalled();
  await act(async()=>{finish({data:{}});await pending;});
  expect(onClose).toHaveBeenCalledTimes(1);expect(onSuccess).toHaveBeenCalledTimes(1);
});

it('uses calendar-day metadata and annual quota independently of the type name',async()=>{
  (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{data:[{...custom,nama:'Jenis Pengurang Saldo',hitung_hari:'hari_kalender',potong_kuota_tahunan:true}]}});
  await mount(true,true,3);dates();populate();
  expect(texts()).toContain('4 Hari');
  await act(async()=>{await action('Kirim Pengajuan').props.onPress();});
  expect(texts().some(text=>typeof text==='string'&&text.includes('melebihi sisa hak cuti tahunan'))).toBe(true);
  expect(apiClient.post).not.toHaveBeenCalled();
});

it('enforces catalog duration limits and preserves server messages without field errors',async()=>{
  (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{data:[{...custom,maks_hari:1}]}});
  await mount();dates();populate();
  await act(async()=>{await action('Kirim Pengajuan').props.onPress();});
  expect(texts().some(text=>typeof text==='string'&&text.includes('batas maksimal'))).toBe(true);
  expect(apiClient.post).not.toHaveBeenCalled();
  await act(async()=>{tree!.update(view(false));});
  await act(async()=>{tree!.update(view());});
  (apiClient.post as jest.Mock).mockRejectedValueOnce({kind:'validation',message:'Pegawai belum memenuhi masa kerja.'});
  await act(async()=>{await action('Kirim Pengajuan').props.onPress();});
  expect(texts()).toContain('Pegawai belum memenuhi masa kerja.');
});

it('blocks submission while loading/empty, retries catalog failures and ignores an obsolete catalog response',async()=>{
  let finishOld!:(value:unknown)=>void;
  (apiClient.get as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}))
    .mockRejectedValueOnce({message:'Katalog sementara tidak tersedia.'});
  await mount();
  expect(action('Kirim Pengajuan').props.disabled).toBe(true);
  await act(async()=>{tree!.update(view(false));});
  await act(async()=>{tree!.update(view());});
  expect(texts()).toContain('Katalog sementara tidak tersedia.');
  await act(async()=>{finishOld({data:{data:[{...custom,nama:'Katalog Usang'}]}});});
  expect(texts()).not.toContain('Katalog Usang');
  (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{data:[]}});
  await act(async()=>{tree!.root.findByProps({accessibilityLabel:'Jenis cuti'}).props.onPress();});
  expect(texts()).toContain('Tidak ada jenis cuti yang tersedia untuk akun ini.');
  expect(action('Kirim Pengajuan').props.disabled).toBe(true);
  await act(async()=>{tree!.root.findByProps({accessibilityLabel:'Jenis cuti'}).props.onPress();});
  expect(texts()).toContain(custom.nama);
  expect(action('Kirim Pengajuan').props.disabled).toBe(false);
  expect(apiClient.post).not.toHaveBeenCalled();
});
