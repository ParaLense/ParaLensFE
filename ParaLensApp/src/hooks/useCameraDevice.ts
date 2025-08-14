import { useMemo } from 'react';
import { useCameraDevice, useCameraDevices } from 'react-native-vision-camera';
import { CAMERA_FPS_TARGET } from '@/constants';

interface UseCameraDeviceReturn {
  device: any;
  devices: any;
  sixtyFpsFormat: any;
  hasHighFpsSupport: boolean;
}

export const useCameraDevice = (): UseCameraDeviceReturn => {
  const devices = useCameraDevices();
  const device = useCameraDevice('back');

  const sixtyFpsFormat = useMemo(() => {
    return device?.formats?.find(f => f?.maxFps >= CAMERA_FPS_TARGET);
  }, [device]);

  const hasHighFpsSupport = useMemo(() => {
    return !!sixtyFpsFormat;
  }, [sixtyFpsFormat]);

  return {
    device,
    devices,
    sixtyFpsFormat,
    hasHighFpsSupport,
  };
};


