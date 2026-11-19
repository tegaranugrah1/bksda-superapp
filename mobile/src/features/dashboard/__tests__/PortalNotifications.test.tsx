import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { apiClient } from '@/lib/api/client';
import { usePortalNotifications } from '../PortalNotifications';
jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
jest.mock('@/hooks/useReverbRefresh', () => ({ useReverbRefresh: jest.fn() }));
let model!: ReturnType<typeof usePortalNotifications>;
function Consumer() { model = usePortalNotifications(); return null; }
afterEach(() => jest.clearAllMocks());
it('loads the unread count and marks a notification once while a request is pending', async () => {
  const notification = { id: 8, title: 'Dummy notification', type: 'cuti', read_at: null };
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: [notification], meta: { unread_count: 4 } } });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<Consumer />); });
  expect(model.unread).toBe(4);
  let finish!: (value: unknown) => void;
  (apiClient.post as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await act(async () => {
    const pending = model.markRead(notification);
    expect(await model.markRead(notification)).toBe(false);
    finish({ data: { unread_count: 3 } });
    expect(await pending).toBe(true);
  });
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(model.unread).toBe(3); expect(model.items[0].read_at).toBeTruthy();
  act(() => tree.unmount());
});
