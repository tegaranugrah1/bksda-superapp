import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AssetActionBar } from '../AssetActionBar';
import { AppButton } from '@/components/AppButton';

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
    },
    spacing: {
      md: 12,
      lg: 16,
    },
    radius: {
      lg: 8,
    },
    typography: {
      fontSizes: {
        md: 16,
      },
      fontWeights: {
        semibold: '600',
      },
    },
  }),
}));

describe('AssetActionBar', () => {
  const mockEdit = jest.fn();
  const mockUploadPhoto = jest.fn();
  const mockVerify = jest.fn();
  const mockLoan = jest.fn();
  const mockReturn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no actions are allowed', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetActionBar
          allowedActions={{
            can_edit: false,
            can_upload_photo: false,
            can_verify: false,
            can_loan: false,
            can_return: false,
          }}
          onEditPress={mockEdit}
          onUploadPhotoPress={mockUploadPhoto}
          onVerifyPress={mockVerify}
          onLoanPress={mockLoan}
          onReturnPress={mockReturn}
        />
      );
    });

    expect(tree.toJSON()).toBeNull();

    act(() => {
      tree.unmount();
    });
  });

  it('renders only the allowed action buttons', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetActionBar
          allowedActions={{
            can_edit: true,
            can_upload_photo: false,
            can_verify: true,
            can_loan: false,
            can_return: false,
          }}
          onEditPress={mockEdit}
          onUploadPhotoPress={mockUploadPhoto}
          onVerifyPress={mockVerify}
          onLoanPress={mockLoan}
          onReturnPress={mockReturn}
        />
      );
    });

    const root = tree.root;
    
    // Should render verify and edit buttons
    const buttons = root.findAllByType(AppButton);
    expect(buttons).toHaveLength(2);

    const btnTexts = buttons.map((b: any) => b.props.title);
    expect(btnTexts).toContain('Verifikasi Aset');
    expect(btnTexts).toContain('Ubah Data');
    expect(btnTexts).not.toContain('Pinjam Aset');
    expect(btnTexts).not.toContain('Kembalikan Aset');
    expect(btnTexts).not.toContain('Ambil Foto');

    act(() => {
      tree.unmount();
    });
  });

  it('triggers callbacks on button press', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetActionBar
          allowedActions={{
            can_edit: true,
            can_upload_photo: true,
            can_verify: true,
            can_loan: true,
            can_return: true,
          }}
          onEditPress={mockEdit}
          onUploadPhotoPress={mockUploadPhoto}
          onVerifyPress={mockVerify}
          onLoanPress={mockLoan}
          onReturnPress={mockReturn}
        />
      );
    });

    const root = tree.root;

    // Verify
    const verifyBtn = root.findByProps({ accessibilityLabel: 'Verifikasi Aset BMN' });
    act(() => {
      verifyBtn.props.onPress();
    });
    expect(mockVerify).toHaveBeenCalledTimes(1);

    // Loan
    const loanBtn = root.findByProps({ accessibilityLabel: 'Ajukan Peminjaman Aset BMN' });
    act(() => {
      loanBtn.props.onPress();
    });
    expect(mockLoan).toHaveBeenCalledTimes(1);

    // Return
    const returnBtn = root.findByProps({ accessibilityLabel: 'Kembalikan Aset BMN' });
    act(() => {
      returnBtn.props.onPress();
    });
    expect(mockReturn).toHaveBeenCalledTimes(1);

    // Photo
    const photoBtn = root.findByProps({ accessibilityLabel: 'Ambil Foto Aset BMN' });
    act(() => {
      photoBtn.props.onPress();
    });
    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);

    // Edit
    const editBtn = root.findByProps({ accessibilityLabel: 'Ubah Data Aset BMN' });
    act(() => {
      editBtn.props.onPress();
    });
    expect(mockEdit).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });

  it('handles loading state on buttons', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetActionBar
          allowedActions={{
            can_verify: true,
            can_return: true,
          }}
          onEditPress={mockEdit}
          onUploadPhotoPress={mockUploadPhoto}
          onVerifyPress={mockVerify}
          onLoanPress={mockLoan}
          onReturnPress={mockReturn}
          isVerifying={true}
          isReturning={true}
        />
      );
    });

    const root = tree.root;

    // Check loading indicator shows up for verify and return buttons
    const buttons = root.findAllByType(AppButton);
    buttons.forEach((btn: any) => {
      // AppButton receives loading prop
      expect(btn.props.loading).toBe(true);
    });

    act(() => {
      tree.unmount();
    });
  });
});
