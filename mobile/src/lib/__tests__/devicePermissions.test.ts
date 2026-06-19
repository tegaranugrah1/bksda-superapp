import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import {
  hasCameraPermission,
  requestCameraPermission,
  hasLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
} from '../devicePermissions';

// Mock Camera from expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 2,
  },
}));

describe('devicePermissions helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasCameraPermission', () => {
    it('returns true if permission is granted', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      const result = await hasCameraPermission();
      expect(result).toBe(true);
      expect(Camera.getCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false if permission is not granted', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      const result = await hasCameraPermission();
      expect(result).toBe(false);
    });

    it('returns false on rejection/error', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Permission error'));
      const result = await hasCameraPermission();
      expect(result).toBe(false);
    });
  });

  describe('requestCameraPermission', () => {
    it('returns true if request is granted', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      const result = await requestCameraPermission();
      expect(result).toBe(true);
      expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false if request is denied', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      const result = await requestCameraPermission();
      expect(result).toBe(false);
    });

    it('returns false on rejection/error', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Request error'));
      const result = await requestCameraPermission();
      expect(result).toBe(false);
    });
  });

  describe('hasLocationPermission', () => {
    it('returns true if permission is granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      const result = await hasLocationPermission();
      expect(result).toBe(true);
      expect(Location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false if permission is not granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      const result = await hasLocationPermission();
      expect(result).toBe(false);
    });

    it('returns false on rejection/error', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Permission error'));
      const result = await hasLocationPermission();
      expect(result).toBe(false);
    });
  });

  describe('requestLocationPermission', () => {
    it('returns true if request is granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      const result = await requestLocationPermission();
      expect(result).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false if request is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      const result = await requestLocationPermission();
      expect(result).toBe(false);
    });

    it('returns false on rejection/error', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Request error'));
      const result = await requestLocationPermission();
      expect(result).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('returns coordinates if permission is already granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: -1.26,
          longitude: 116.89,
        },
      });

      const result = await getCurrentLocation();
      expect(result).toEqual({ latitude: -1.26, longitude: 116.89 });
      expect(Location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
      });
    });

    it('requests permission and returns coordinates if not initially granted but user grants it', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: -1.26,
          longitude: 116.89,
        },
      });

      const result = await getCurrentLocation();
      expect(result).toEqual({ latitude: -1.26, longitude: 116.89 });
      expect(Location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns null if permission check and request are both denied', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

      const result = await getCurrentLocation();
      expect(result).toBeNull();
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('returns null on getCurrentPositionAsync failure/rejection', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS failed'));

      const result = await getCurrentLocation();
      expect(result).toBeNull();
    });
  });
});
