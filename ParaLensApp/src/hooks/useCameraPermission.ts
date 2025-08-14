import { useState, useEffect, useCallback } from 'react';
import { Camera } from 'react-native-vision-camera';
import { CameraPermissionStatus } from '@/types';
import { CAMERA_PERMISSION_TIMEOUT, ERROR_MESSAGES } from '@/constants';

interface UseCameraPermissionReturn {
  permission: CameraPermissionStatus;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  checkPermission: () => Promise<void>;
}

const isAuthorized = (status: string): status is 'authorized' | 'granted' => {
  return status === 'authorized' || status === 'granted';
};

export const useCameraPermission = (): UseCameraPermissionReturn => {
  const [permission, setPermission] = useState<CameraPermissionStatus>('not-determined');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await Camera.getCameraPermissionStatus();
      setPermission(status as CameraPermissionStatus);
    } catch (err) {
      console.error('Error checking camera permission:', err);
      setError(ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Permission request timeout')), CAMERA_PERMISSION_TIMEOUT);
      });

      const permissionPromise = Camera.requestCameraPermission();
      
      const status = await Promise.race([permissionPromise, timeoutPromise]);
      setPermission(status as CameraPermissionStatus);

      if (!isAuthorized(status)) {
        setError(ERROR_MESSAGES.CAMERA_PERMISSION_DENIED);
      }
    } catch (err) {
      console.error('Error requesting camera permission:', err);
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    permission,
    isLoading,
    error,
    requestPermission,
    checkPermission,
  };
}; 