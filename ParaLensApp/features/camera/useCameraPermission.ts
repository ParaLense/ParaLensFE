import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Camera } from 'react-native-vision-camera';

export type CameraPermissionStatus =
  | 'authorized'
  | 'denied'
  | 'not-determined'
  | 'restricted'
  | 'granted';

interface UseCameraPermissionOptions {
  autoRequest?: boolean;
  showDialogOnDenied?: boolean;
}

interface UseCameraPermissionReturn {
  hasPermission: CameraPermissionStatus;
  debugStatus: string;
  showPermissionDialog: boolean;
  setShowPermissionDialog: (show: boolean) => void;
  requestPermission: () => Promise<void>;
  checkPermission: () => Promise<void>;
}

export const useCameraPermission = (
  options: UseCameraPermissionOptions = {}
): UseCameraPermissionReturn => {
  const { autoRequest = true, showDialogOnDenied = true } = options;

  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);

  const checkPermission = useCallback(async () => {
    try {
      const current = await Camera.getCameraPermissionStatus();
      
      if (current === 'not-determined') {
        setHasPermission(current as CameraPermissionStatus);
        setDebugStatus(`Camera permission not determined`);
        if (showDialogOnDenied) {
          setShowPermissionDialog(true);
        }
      } else if (current === 'denied') {
        setHasPermission(current as CameraPermissionStatus);
        setDebugStatus(`Camera permission denied`);
        if (showDialogOnDenied) {
          setShowPermissionDialog(true);
        }
      } else {
        setHasPermission(current as CameraPermissionStatus);
        setDebugStatus(`Camera.getCameraPermissionStatus() returned: ${current}`);
      }
    } catch (error) {
      setDebugStatus(`Permission check error: ${String(error)}`);
    }
  }, [showDialogOnDenied]);

  const requestPermission = useCallback(async () => {
    try {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status);
      setDebugStatus(`Camera.requestCameraPermission() returned: ${status}`);
      
      if (status === 'denied') {
        // Keep dialog open if permission was denied
        setDebugStatus(`Camera permission denied by user`);
      } else {
        setShowPermissionDialog(false);
      }
    } catch (error) {
      setDebugStatus(`Permission request error: ${String(error)}`);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAndRequestPermission = async () => {
      if (!isMounted) return;
      
      if (autoRequest) {
        const current = await Camera.getCameraPermissionStatus();
        if (!isMounted) return;

        if (current === 'not-determined') {
          const status = await Camera.requestCameraPermission();
          if (!isMounted) return;
          setHasPermission(status);
          setDebugStatus(`Camera.requestCameraPermission() returned: ${status}`);
        } else {
          await checkPermission();
        }
      } else {
        await checkPermission();
      }
    };

    checkAndRequestPermission();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        checkAndRequestPermission();
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [autoRequest, checkPermission]);

  return {
    hasPermission,
    debugStatus,
    showPermissionDialog,
    setShowPermissionDialog,
    requestPermission,
    checkPermission,
  };
};
