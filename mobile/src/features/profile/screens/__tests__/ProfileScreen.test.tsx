import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProfileScreen from '../ProfileScreen';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => { jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]); },
}));
it('opens the canonical portal profile rather than a second profile implementation', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<ProfileScreen navigation={{ navigate: mockNavigate }} />); });
  expect(mockNavigate).toHaveBeenCalledWith('Dashboard', { portalTab: 'profile' });
  expect(tree.toJSON()).toBeNull();
  act(() => tree.unmount());
});
