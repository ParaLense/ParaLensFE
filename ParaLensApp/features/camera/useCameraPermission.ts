import { useCallback, useEffect, useState } from 'react';
import { useCameraPermission as useVisionCameraPermission } from 'react-native-vision-camera';

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

/**
 * Camera permission hook.
 *
 * Wraps VisionCamera v5's `useCameraPermission()` (which exposes a boolean
 * `hasPermission` + `requestPermission()`), but keeps the original string-based
 * `CameraPermissionStatus` surface this app's consumers expect. The old static
 * `Camera.getCameraPermissionStatus()` / `Camera.requestCameraPermission()`
 * methods were removed in v5, which is why this had to be rewritten.
 *
 * Note: v5 no longer reports `'granted'` — it uses `'authorized'`. Both are
 * still accepted downstream, and `hasPermission` here resolves to `'authorized'`
 * when granted.
 */
export const useCameraPermission = (
  options: UseCameraPermissionOptions = {}
): UseCameraPermissionReturn => {
  const { autoRequest = true, showDialogOnDenied = true } = options;

  const { hasPermission: granted, requestPermission: requestVisionPermission } =
    useVisionCameraPermission();

  // Tracks whether the user has actively been through a request, so we can
  // distinguish "not yet asked" from "asked and denied".
  const [didRequest, setDidRequest] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);

  const status: CameraPermissionStatus = granted
    ? 'authorized'
    : didRequest
      ? 'denied'
      : 'not-determined';

  const requestPermission = useCallback(async () => {
    setDidRequest(true);
    const ok = await requestVisionPermission();
    if (ok) {
      setShowPermissionDialog(false);
    } else if (showDialogOnDenied) {
      setShowPermissionDialog(true);
    }
  }, [requestVisionPermission, showDialogOnDenied]);

  const checkPermission = useCallback(async () => {
    if (!granted && showDialogOnDenied) {
      setShowPermissionDialog(true);
    }
  }, [granted, showDialogOnDenied]);

  useEffect(() => {
    if (granted) {
      setShowPermissionDialog(false);
      return;
    }
    if (autoRequest && !didRequest) {
      void requestPermission();
    } else if (showDialogOnDenied) {
      setShowPermissionDialog(true);
    }
  }, [granted, autoRequest, didRequest, showDialogOnDenied, requestPermission]);

  return {
    hasPermission: status,
    debugStatus: `hasPermission=${granted} status=${status}`,
    showPermissionDialog,
    setShowPermissionDialog,
    requestPermission,
    checkPermission,
  };
};
