import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { isSuperAdmin, hasModule, can, usePermissions } from '../permissions';
import { useAuth } from '@/features/auth/AuthProvider';
import { User } from '@/types/auth';

// Mock AuthProvider's dependencies to prevent config exceptions
jest.mock('@/lib/auth/tokenStorage', () => ({
  getToken: jest.fn().mockResolvedValue(null),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('@/features/auth/authApi', () => ({
  getMe: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
}));

// Mock useAuth directly for testing usePermissions hook
jest.mock('@/features/auth/AuthProvider', () => {
  const original = jest.requireActual('@/features/auth/AuthProvider');
  return {
    ...original,
    useAuth: jest.fn(),
  };
});

describe('Permission Helpers', () => {
  const normalUser: User = {
    id: 1,
    name: 'Normal User',
    username: 'normal',
    email: 'normal@test.com',
    role: 'pegawai',
    access_modules: ['kepegawaian'],
    permissions: ['view-assignments', 'create-assignments'],
    is_active: true,
    employee: null,
  };

  const superAdminUser: User = {
    id: 2,
    name: 'Super Admin',
    username: 'super',
    email: 'super@test.com',
    role: 'superadmin',
    access_modules: [],
    permissions: [],
    is_active: true,
    employee: null,
  };

  describe('isSuperAdmin', () => {
    it('returns true if role is superadmin', () => {
      expect(isSuperAdmin(superAdminUser)).toBe(true);
    });

    it('returns false if role is not superadmin', () => {
      expect(isSuperAdmin(normalUser)).toBe(false);
    });

    it('fails closed (returns false) if user is null or undefined', () => {
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined as any)).toBe(false);
    });
  });

  describe('hasModule', () => {
    it('returns true if module is explicitly granted in access_modules', () => {
      expect(hasModule(normalUser, 'kepegawaian')).toBe(true);
    });

    it('returns false if module is not in access_modules', () => {
      expect(hasModule(normalUser, 'bmn')).toBe(false);
    });

    it('returns true for superadmin even if access_modules is empty', () => {
      expect(hasModule(superAdminUser, 'bmn')).toBe(true);
    });

    it('fails closed (returns false) if user is null or data is missing', () => {
      expect(hasModule(null, 'bmn')).toBe(false);
      expect(hasModule({ ...normalUser, access_modules: undefined as any }, 'kepegawaian')).toBe(false);
    });
  });

  describe('can', () => {
    it('returns true if permission is explicitly granted', () => {
      expect(can(normalUser, 'view-assignments')).toBe(true);
      expect(can(normalUser, 'create-assignments')).toBe(true);
    });

    it('returns false if permission is not granted', () => {
      expect(can(normalUser, 'delete-assignments')).toBe(false);
    });

    it('returns true for superadmin even if permissions list is empty', () => {
      expect(can(superAdminUser, 'delete-assignments')).toBe(true);
    });

    it('fails closed (returns false) if user is null or data is missing', () => {
      expect(can(null, 'view-assignments')).toBe(false);
      expect(can({ ...normalUser, permissions: undefined as any }, 'view-assignments')).toBe(false);
    });
  });

  describe('usePermissions hook', () => {
    let capturedPermissions: any = null;

    const TestConsumer = () => {
      capturedPermissions = usePermissions();
      return null;
    };

    beforeEach(() => {
      capturedPermissions = null;
    });

    it('binds permission helper functions to active auth user', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: normalUser,
      });

      let tree: any;
      act(() => {
        tree = renderer.create(<TestConsumer />);
      });

      expect(capturedPermissions.isSuperAdmin()).toBe(false);
      expect(capturedPermissions.hasModule('kepegawaian')).toBe(true);
      expect(capturedPermissions.hasModule('bmn')).toBe(false);
      expect(capturedPermissions.can('view-assignments')).toBe(true);
      expect(capturedPermissions.can('delete-assignments')).toBe(false);

      act(() => {
        tree.unmount();
      });
    });

    it('handles null user safely in hook bindings', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
      });

      let tree: any;
      act(() => {
        tree = renderer.create(<TestConsumer />);
      });

      expect(capturedPermissions.isSuperAdmin()).toBe(false);
      expect(capturedPermissions.hasModule('kepegawaian')).toBe(false);
      expect(capturedPermissions.can('view-assignments')).toBe(false);

      act(() => {
        tree.unmount();
      });
    });
  });
});
