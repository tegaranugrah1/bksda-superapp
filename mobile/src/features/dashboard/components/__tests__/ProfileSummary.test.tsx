import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProfileSummary from '../ProfileSummary';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#e2e8f0',
      primary: '#16a34a',
      foreground: '#09090b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
    },
    spacing: {
      lg: 16,
    },
    radius: {
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
    },
  }),
}));

describe('ProfileSummary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockProfileWithEmployee = {
    id: 1,
    name: 'Hardi Pemilik',
    username: 'hardi',
    role: 'pegawai',
    access_modules: ['bmn'],
    permissions: [],
    employee: {
      id: 10,
      nip: '198501012010011002',
      nama_lengkap: 'Hardi Saputra',
      jabatan: 'Pengelola BMN',
      satuan_kerja: 'Seksi Wilayah I',
      foto_profil: 'https://example.com/avatar.jpg',
    },
  };

  const mockProfileWithoutEmployee = {
    id: 2,
    name: 'Super Admin',
    username: 'superadmin',
    role: 'super_admin',
    access_modules: ['*'],
    permissions: ['*'],
    employee: null,
  };

  it('renders employee profile details and avatar image when employee is linked', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileSummary profile={mockProfileWithEmployee} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;

    // Check display texts
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((node: any) => node.props.children);

    expect(texts).toContain('Hardi Saputra');
    expect(texts).toContain('NIP. 198501012010011002');
    expect(texts).toContain('Pengelola BMN');
    expect(texts).toContain('Seksi Wilayah I');

    // Check avatar image
    const image = root.findByType('Image');
    expect(image.props.source.uri).toBe('https://example.com/avatar.jpg');

    act(() => {
      tree.unmount();
    });
  });

  it('renders fallback user details and letter placeholder avatar when employee is null', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileSummary profile={mockProfileWithoutEmployee} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;

    // Check display texts
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((node: any) => node.props.children);

    expect(texts).toContain('Super Admin');
    expect(texts).toContain('@superadmin');
    expect(texts).toContain('Role: SUPER_ADMIN');

    // Should render letter avatar placeholder 'S'
    expect(texts).toContain('S');

    // Should NOT have an image component
    expect(() => root.findByType('Image')).toThrow();

    act(() => {
      tree.unmount();
    });
  });
});
