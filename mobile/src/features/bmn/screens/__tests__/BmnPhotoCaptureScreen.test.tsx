import React from 'react';
import renderer, { act } from 'react-test-renderer';
import BmnPhotoCaptureScreen from '../BmnPhotoCaptureScreen';
import { useCameraPermissions } from 'expo-camera';
import { getCurrentLocation } from '@/lib/devicePermissions';
import { apiClient } from '@/lib/api/client';
import { Alert } from 'react-native';

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { assetId: '123', type: 'depan' },
  }),
}));

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      foreground: '#09090b',
      muted: '#f1f5f9',
      border: '#e2e8f0',
      card: '#ffffff',
      mutedForeground: '#64748b',
      secondary: '#f1f5f9',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
    },
    radius: {
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
      full: 9999,
    },
    typography: {
      fontFamilies: {
        sans: 'System',
      },
      fontWeights: {
        bold: '700',
        semibold: '600',
        medium: '500',
      },
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
      },
    },
  }),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
// Mock expo-camera
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockCameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file://test-photo.jpg' }),
    }));
    return <View testID="mock-camera-view">{props.children}</View>;
  });
  MockCameraView.displayName = 'MockCameraView';
  return {
    CameraView: MockCameraView,
    useCameraPermissions: jest.fn(),
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

// Mock devicePermissions
jest.mock('@/lib/devicePermissions', () => ({
  getCurrentLocation: jest.fn(),
}));

// Mock central API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('BmnPhotoCaptureScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading indicator when permission check is unresolved', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([null, jest.fn()]);

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnPhotoCaptureScreen />);
    });

    const root = tree.root;
    expect(root.findByProps({ color: '#16a34a' })).toBeTruthy(); // ActivityIndicator

    act(() => {
      tree.unmount();
    });
  });

  it('renders permission request view when permission is denied', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnPhotoCaptureScreen />);
    });

    const root = tree.root;
    const titleText = root.findAllByType('Text').map((t: any) => t.props.children).join(' ');
    expect(titleText).toContain('Akses Kamera Diperlukan');

    act(() => {
      tree.unmount();
    });
  });

  it('renders CameraView when permission is granted', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    (getCurrentLocation as jest.Mock).mockResolvedValue(null);

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnPhotoCaptureScreen />);
    });

    const root = tree.root;
    expect(root.findByProps({ testID: 'mock-camera-view' })).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('captures photo, retrieves GPS geotag coordinates, and opens preview mode', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    (getCurrentLocation as jest.Mock).mockResolvedValue({ latitude: -1.26, longitude: 116.89 });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnPhotoCaptureScreen />);
    });

    const root = tree.root;
    const shutterBtn = root.findByProps({ testID: 'shutter-button' });

    // Capture photo
    await act(async () => {
      shutterBtn.props.onPress();
    });

    // Should switch to preview mode
    const previewImage = root.findByProps({ testID: 'photo-preview-image' });
    expect(previewImage.props.source).toEqual({ uri: 'file://test-photo.jpg' });

    // Geotag coordinates should be displayed
    const allText = root.findAllByType('Text').map((t: any) => t.props.children).join(' ');
    expect(allText).toContain('-1.260000');
    expect(allText).toContain('116.890000');

    act(() => {
      tree.unmount();
    });
  });

  it('handles location note input and uploads successfully via apiClient', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    (getCurrentLocation as jest.Mock).mockResolvedValue({ latitude: -1.26, longitude: 116.89 });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { status: 'success' } });

    jest.spyOn(Alert, 'alert');

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnPhotoCaptureScreen />);
    });

    const root = tree.root;
    const shutterBtn = root.findByProps({ testID: 'shutter-button' });

    // Capture photo
    await act(async () => {
      shutterBtn.props.onPress();
    });

    // Input location note
    const input = root.findByProps({ testID: 'location-note-input' });
    act(() => {
      input.props.onChangeText('Depan gerbang utama');
    });

    // Upload
    const uploadBtn = root.findByProps({ accessibilityLabel: 'Simpan & Upload' });
    await act(async () => {
      uploadBtn.props.onPress();
    });

    // Verify multipart upload parameters
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, formData] = (apiClient.post as jest.Mock).mock.calls[0];
    expect(url).toBe('/bmn/assets/123/photo');
    expect(formData).toBeInstanceOf(FormData);

    // Verify Alert.alert was triggered
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sukses',
      'Foto fisik dan geotag berhasil diunggah.',
      expect.any(Array)
    );

    act(() => {
      tree.unmount();
    });
  });
});
