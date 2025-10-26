import React from 'react';
import { CameraPermissionModal } from './CameraPermissionModal';
import { useCameraPermission, CameraPermissionStatus } from './useCameraPermission';

interface CameraPermissionProviderProps {
  children: (props: {
    hasPermission: CameraPermissionStatus;
    debugStatus: string;
    showPermissionDialog: boolean;
    setShowPermissionDialog: (show: boolean) => void;
    requestPermission: () => Promise<void>;
  }) => React.ReactNode;
  autoRequest?: boolean;
  showDialogOnDenied?: boolean;
}

export const CameraPermissionProvider: React.FC<CameraPermissionProviderProps> = ({
  children,
  autoRequest = true,
  showDialogOnDenied = true,
}) => {
  const {
    hasPermission,
    debugStatus,
    showPermissionDialog,
    setShowPermissionDialog,
    requestPermission,
  } = useCameraPermission({
    autoRequest,
    showDialogOnDenied,
  });

  return (
    <>
      {children({
        hasPermission,
        debugStatus,
        showPermissionDialog,
        setShowPermissionDialog,
        requestPermission,
      })}
      
      <CameraPermissionModal
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        onRequestPermission={requestPermission}
        hasPermission={hasPermission}
        debugStatus={debugStatus}
      />
    </>
  );
};
