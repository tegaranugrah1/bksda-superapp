import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Platform } from 'react-native';
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
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; jest.restoreAllMocks(); });

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


it('ignores success and failure after closing the scan, including after opening another document', async () => {
  mount();
  let oldSuccess!: (value: unknown) => void, oldFailure!: (error: unknown) => void;
  (apiClient.get as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { oldSuccess = resolve; }))
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { oldFailure = reject; }));
  let first!: Promise<void>, second!: Promise<void>;
  act(() => { first = model.handleOpenLeaveScan(request, 'surat_izin'); });
  act(() => model.closeLeaveScanModal());
  await act(async () => { oldSuccess({data:{data_url:'data:image/png;base64,AA=='}}); await first; });
  expect(model.leaveScanModal).toEqual({visible:false,title:'',loading:false});
  act(() => { second = model.handleOpenLeaveScan(request, 'surat_izin'); });
  act(() => model.closeLeaveScanModal());
  (apiClient.get as jest.Mock).mockResolvedValueOnce({data:{data_url:'data:image/png;base64,AA==',file_name:'new.png'}});
  await act(async () => { await model.handleOpenLeaveScan({...request,id:18}, 'formulir'); });
  await act(async () => { oldFailure(new Error('Old failure')); await second; });
  expect(model.leaveScanModal).toMatchObject({visible:true,fileName:'new.png',loading:false});
  expect(model.leaveScanModal.error).toBeUndefined();
});

it('keeps the latest scan when requests finish in reverse order and ignores completion after unmount', async () => {
  mount();
  let finishOld!: (value: unknown) => void, finishUnmounted!: (value: unknown) => void;
  (apiClient.get as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({data:{data_url:'data:image/png;base64,AA==',file_name:'latest.png'}});
  let old!: Promise<void>;
  act(() => { old = model.handleOpenLeaveScan(request, 'surat_izin'); });
  await act(async () => { await model.handleOpenLeaveScan({...request,id:18}, 'formulir'); });
  await act(async () => { finishOld({data:{data_url:'data:image/png;base64,AA==',file_name:'old.png'}}); await old; });
  expect(model.leaveScanModal.fileName).toBe('latest.png');
  (apiClient.get as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finishUnmounted = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = model.handleOpenLeaveScan(request, 'surat_izin'); });
  const lastState = model.leaveScanModal;
  act(() => { tree!.unmount(); }); tree = undefined;
  await act(async () => { finishUnmounted({data:{data_url:'data:image/png;base64,AA=='}}); await pending; });
  expect(model.leaveScanModal).toBe(lastState);
});

it('releases browser blob URLs on replacement, close and unmount without creating stale blobs', async () => {
  const create = jest.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second').mockReturnValueOnce('blob:third');
  const revoke = jest.fn();
  const replacements: [object, string, unknown][] = [
    [globalThis, 'Blob', jest.requireActual('node:buffer').Blob],
    [globalThis, 'atob', (value: string) => jest.requireActual('node:buffer').Buffer.from(value, 'base64').toString('binary')],
    [URL, 'createObjectURL', create], [URL, 'revokeObjectURL', revoke],
  ];
  const previous = replacements.map(([target,key]) => Object.getOwnPropertyDescriptor(target,key));
  try {
    replacements.forEach(([target,key,value]) => Object.defineProperty(target,key,{value,configurable:true,writable:true}));
    jest.replaceProperty(Platform, 'OS', 'web');
    mount();
    (apiClient.get as jest.Mock).mockResolvedValue({data:{data_url:'data:application/pdf;base64,AA=='}});
    await act(async () => { await model.handleOpenLeaveScan(request, 'surat_izin'); });
    await act(async () => { await model.handleOpenLeaveScan(request, 'formulir'); });
    expect(revoke).toHaveBeenCalledWith('blob:first');
    act(() => model.closeLeaveScanModal());
    expect(revoke).toHaveBeenCalledWith('blob:second');
    await act(async () => { await model.handleOpenLeaveScan(request, 'surat_izin'); });
    act(() => { tree!.unmount(); }); tree = undefined;
    expect(revoke).toHaveBeenCalledWith('blob:third');
    mount();
    let finish!: (value: unknown) => void;
    (apiClient.get as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<void>;
    act(() => { pending = model.handleOpenLeaveScan(request, 'formulir'); });
    act(() => { tree!.unmount(); }); tree = undefined;
    await act(async () => { finish({data:{data_url:'data:application/pdf;base64,AA=='}}); await pending; });
    expect(create).toHaveBeenCalledTimes(3);
  } finally {
    if (tree) act(() => tree!.unmount()); tree = undefined;
    replacements.forEach(([target,key],i) => { const descriptor=previous[i]; if(descriptor) Object.defineProperty(target,key,descriptor); else Reflect.deleteProperty(target,key); });
  }
});
