import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AssetPhotoSlotsSection } from '../AssetPhotoSlotsSection';
import { AppButton } from '@/components/AppButton';
import { AssetDetail } from '../../../types';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      secondary: '#f1f5f9',
      danger: '#dc2626',
      primaryForeground: '#ffffff',
      secondaryForeground: '#0f172a',
      dangerForeground: '#ffffff',
      background: '#ffffff',
      border: '#e2e8f0',
      foreground: '#0f172a',
      mutedForeground: '#64748b',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    radius: {
      sm: 4,
      md: 6,
      lg: 8,
    },
    typography: {
      fontFamilies: {
        sans: 'sans-serif',
      },
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
      },
      fontWeights: {
        semibold: '600',
        bold: '700',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
        elevation: 1,
      },
    },
  }),
}));

const mockAssetWithPhotos: AssetDetail = {
  id: 1,
  nama_barang: 'Laptop Asus',
  allowed_actions: {
    can_edit: true,
    can_upload_photo: true,
    can_verify: true,
    can_loan: false,
    can_return: false,
  },
  foto_depan_url: 'https://example.com/depan.jpg',
  foto_belakang_url: 'https://example.com/belakang.jpg',
  foto_kiri_url: null,
  foto_kanan_url: null,
};

describe('AssetPhotoSlotsSection', () => {
  const mockCapture = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 photo slots', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetPhotoSlotsSection
          asset={mockAssetWithPhotos}
          onCapturePhoto={mockCapture}
          onDeletePhoto={mockDelete}
        />
      );
    });

    const root = tree.root;

    // Check we have the 4 slot cards
    expect(root.findByProps({ testID: 'photo-slot-depan' })).toBeTruthy();
    expect(root.findByProps({ testID: 'photo-slot-belakang' })).toBeTruthy();
    expect(root.findByProps({ testID: 'photo-slot-kiri' })).toBeTruthy();
    expect(root.findByProps({ testID: 'photo-slot-kanan' })).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('renders image preview when URL exists, and placeholder when null', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetPhotoSlotsSection
          asset={mockAssetWithPhotos}
          onCapturePhoto={mockCapture}
          onDeletePhoto={mockDelete}
        />
      );
    });

    const root = tree.root;

    // depan has url
    expect(root.findByProps({ testID: 'photo-image-depan' })).toBeTruthy();
    expect(() => root.findByProps({ testID: 'photo-placeholder-depan' })).toThrow();

    // kiri has null url
    expect(() => root.findByProps({ testID: 'photo-image-kiri' })).toThrow();
    expect(root.findByProps({ testID: 'photo-placeholder-kiri' })).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('shows Hapus Foto buttons when photo exists, and Ambil Foto when null (if can_upload_photo is true)', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetPhotoSlotsSection
          asset={mockAssetWithPhotos}
          onCapturePhoto={mockCapture}
          onDeletePhoto={mockDelete}
        />
      );
    });

    const root = tree.root;

    // depan is present -> Hapus Foto
    const depanBtn = root.findByProps({ accessibilityLabel: 'Hapus Tampak Depan' });
    expect(depanBtn.props.title).toBe('Hapus Foto');

    // kiri is null -> Ambil Foto
    const kiriBtn = root.findByProps({ accessibilityLabel: 'Ambil Tampak Kiri' });
    expect(kiriBtn.props.title).toBe('Ambil Foto');

    act(() => {
      tree.unmount();
    });
  });

  it('does not render action buttons if can_upload_photo is false', () => {
    const assetWithoutPermissions: AssetDetail = {
      ...mockAssetWithPhotos,
      allowed_actions: {
        can_edit: true,
        can_upload_photo: false,
        can_verify: true,
        can_loan: false,
        can_return: false,
      },
    };

    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetPhotoSlotsSection
          asset={assetWithoutPermissions}
          onCapturePhoto={mockCapture}
          onDeletePhoto={mockDelete}
        />
      );
    });

    const root = tree.root;

    // No AppButtons should be rendered since can_upload_photo is false
    const buttons = root.findAllByType(AppButton);
    expect(buttons).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });

  it('triggers onCapturePhoto and onDeletePhoto callbacks', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetPhotoSlotsSection
          asset={mockAssetWithPhotos}
          onCapturePhoto={mockCapture}
          onDeletePhoto={mockDelete}
        />
      );
    });

    const root = tree.root;

    // Trigger delete for depan
    const depanDeleteBtn = root.findByProps({ accessibilityLabel: 'Hapus Tampak Depan' });
    act(() => {
      depanDeleteBtn.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledWith('depan');

    // Trigger capture for kiri
    const kiriCaptureBtn = root.findByProps({ accessibilityLabel: 'Ambil Tampak Kiri' });
    act(() => {
      kiriCaptureBtn.props.onPress();
    });
    expect(mockCapture).toHaveBeenCalledWith('kiri');

    act(() => {
      tree.unmount();
    });
  });

  it('handles loading state on delete button', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetPhotoSlotsSection
          asset={mockAssetWithPhotos}
          onCapturePhoto={mockCapture}
          onDeletePhoto={mockDelete}
          isDeleting="depan"
        />
      );
    });

    const root = tree.root;

    const depanDeleteBtn = root.findByProps({ accessibilityLabel: 'Hapus Tampak Depan' });
    expect(depanDeleteBtn.props.loading).toBe(true);
    expect(depanDeleteBtn.props.disabled).toBe(true);

    const belakangDeleteBtn = root.findByProps({ accessibilityLabel: 'Hapus Tampak Belakang' });
    expect(belakangDeleteBtn.props.loading).toBeFalsy();

    act(() => {
      tree.unmount();
    });
  });
});
