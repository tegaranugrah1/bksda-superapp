import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { apiClient } from '@/lib/api/client';
import { usePortalLeaveActions } from '../usePortalLeaveActions';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn(), delete: jest.fn() } }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, Alert: { alert: jest.fn() } }));

const request = {
  id: 17, jenis_cuti: 'Cuti Tahunan', alasan_cuti: 'Dummy leave', jumlah_hari: 1,
  tanggal_mulai: '2026-11-23', tanggal_selesai: '2026-11-23', alamat_menjalankan_cuti: 'Dummy address',
};
const refresh = { fetchMyLeaveRequests: jest.fn(async () => {}), fetchMyLeaveBalance: jest.fn(async () => {}) };
let model!: ReturnType<typeof usePortalLeaveActions>;
let tree: renderer.ReactTestRenderer | undefined;
function Consumer() { model = usePortalLeaveActions(refresh); return null; }
const mount = () => { act(() => { tree = renderer.create(<Consumer />); }); };
beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockReset();
  (apiClient.delete as jest.Mock).mockReset();
});
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });

it('preserves print and confirmation state across portal rerenders without loading data', () => {
  mount();
  act(() => {
    model.setCutiPreviewItem(request);
    model.setCutiPreviewVisible(true);
    model.setCancelLeaveTarget(request);
  });
  act(() => { tree!.update(<Consumer />); });
  expect(model.cutiPreviewItem).toBe(request);
  expect(model.cutiPreviewVisible).toBe(true);
  expect(model.cancelLeaveTarget).toBe(request);
  expect(apiClient.get).not.toHaveBeenCalled();
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(refresh.fetchMyLeaveRequests).not.toHaveBeenCalled();
  expect(refresh.fetchMyLeaveBalance).not.toHaveBeenCalled();
});

it('opens the requested scan endpoint, rejects HTML and keeps failure recoverable', async () => {
  mount();
  (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{data:{
    data_url:'data:image/png;base64,AA==', mime_type:'image/png', file_name:'dummy.png',
  }}});
  await act(async () => { await model.handleOpenLeaveScan(request, 'formulir'); });
  expect(apiClient.get).toHaveBeenLastCalledWith('/me/leave-requests/17/scan-formulir', {params:{preview:1}});
  expect(model.leaveScanModal).toMatchObject({visible:true,loading:false,mimeType:'image/png',fileName:'dummy.png',blobUrl:null});
  act(() => model.closeLeaveScanModal());
  expect(model.leaveScanModal).toEqual({visible:false,title:'',loading:false});
  (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{data_url:'data:text/html;base64,AA=='}});
  await act(async () => { await model.handleOpenLeaveScan(request, 'surat_izin'); });
  expect(apiClient.get).toHaveBeenLastCalledWith('/me/leave-requests/17/scan-surat-izin', {params:{preview:1}});
  expect(model.leaveScanModal).toMatchObject({visible:true,loading:false,error:'Format berkas scan tidak didukung.'});
  expect(model.leaveScanModal.dataUrl).toBeUndefined();
  (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Dummy unavailable'));
  await act(async () => { await model.handleOpenLeaveScan(request, 'surat_izin'); });
  expect(model.leaveScanModal.error).toBe('Dummy unavailable');
  act(() => model.closeLeaveScanModal());
  expect(model.leaveScanModal.visible).toBe(false);
});

it('keeps cancellation busy until the request completes and refreshes only leave data', async () => {
  mount();
  let finish!: () => void;
  (apiClient.delete as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  act(() => model.setCancelLeaveTarget(request));
  let pending!: Promise<void>;
  act(() => { pending = model.handleConfirmCancelLeave(); });
  expect(model.isCancellingLeave).toBe(true);
  expect(model.cancelLeaveTarget).toBe(request);
  expect(refresh.fetchMyLeaveRequests).not.toHaveBeenCalled();
  expect(refresh.fetchMyLeaveBalance).not.toHaveBeenCalled();
  expect(apiClient.delete).toHaveBeenCalledWith('/me/leave-requests/17');
  await act(async () => { finish(); await pending; });
  expect(model.isCancellingLeave).toBe(false);
  expect(model.cancelLeaveTarget).toBeNull();
  expect(refresh.fetchMyLeaveRequests).toHaveBeenCalledTimes(1);
  expect(refresh.fetchMyLeaveBalance).toHaveBeenCalledTimes(1);
  expect(apiClient.get).not.toHaveBeenCalled();
});

it('keeps a failed cancellation available for retry without refreshing or losing the target', async () => {
  mount();
  await act(async () => { await model.handleConfirmCancelLeave(); });
  expect(apiClient.delete).not.toHaveBeenCalled();
  act(() => model.setCancelLeaveTarget(request));
  (apiClient.delete as jest.Mock).mockRejectedValueOnce(new Error('Dummy cancellation failed'));
  await act(async () => { await model.handleConfirmCancelLeave(); });
  expect(model.cancelLeaveTarget).toBe(request);
  expect(model.isCancellingLeave).toBe(false);
  expect(refresh.fetchMyLeaveRequests).not.toHaveBeenCalled();
  expect(refresh.fetchMyLeaveBalance).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Gagal', 'Dummy cancellation failed');
});
