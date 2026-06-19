import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

/**
 * Checks if the app has camera permission.
 * Fails closed (returns false) if an error occurs.
 */
export async function hasCameraPermission(): Promise<boolean> {
  try {
    const status = await Camera.getCameraPermissionsAsync();
    return status.granted;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
}

/**
 * Requests camera permission from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const status = await Camera.requestCameraPermissionsAsync();
    return status.granted;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Checks if the app has foreground location permission.
 * Fails closed (returns false) if an error occurs.
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const status = await Location.getForegroundPermissionsAsync();
    return status.granted;
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

/**
 * Requests foreground location permission from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const status = await Location.requestForegroundPermissionsAsync();
    return status.granted;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Gets the current GPS coordinates of the device.
 * Returns { latitude, longitude } or null if unavailable or permission is denied.
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        return null;
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}
